// =============================================================================
//  Service "Social" (Firestore)
//  ---------------------------------------------------------------------------
//  Profils publics, amitiés, fil d'activité et commentaires d'épisodes.
//
//  Architecture, et pourquoi : Firestore ne sait pas faire de jointure. Pour
//  afficher « le fil de mes amis », il faudrait lire mes amitiés PUIS filtrer
//  les activités — impossible à exprimer dans une règle de sécurité, et coûteux
//  à la lecture.
//
//  On écrit donc dans chaque activité la liste de ceux qui peuvent la voir
//  (`visiblePar`), calculée à la publication. La lecture devient une seule
//  requête `array-contains`, et la règle de sécurité tient en une ligne. C'est
//  le compromis classique : un peu de duplication à l'écriture contre une
//  lecture simple et sûre.
//
//  Conséquence assumée : un nouvel ami ne voit pas les activités publiées AVANT
//  l'amitié. C'est cohérent — le fil raconte ce qui se passe depuis qu'on se
//  suit, pas un historique rétroactif.
//
//  Le calcul pur vit dans `socialCalcul.ts`.
// =============================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  Activite,
  Amitie,
  Commentaire,
  idPaire,
  pseudoNormalise,
  StatutAmitie,
  TypeActivite,
} from '@/services/socialCalcul';

/** Identifiant de l'utilisateur connecté (lève une erreur si déconnecté). */
function idUtilisateur(): string {
  const id = auth.currentUser?.uid;
  if (!id) throw new Error('Utilisateur non connecté.');
  return id;
}

const maintenant = () => new Date().toISOString();

const refProfils = () => collection(db, 'profils');
const refAmities = () => collection(db, 'amities');
const refActivites = () => collection(db, 'activites');
const refCommentaires = () => collection(db, 'commentaires');

// --- Profils ----------------------------------------------------------------

/** Le profil public de quelqu'un : son pseudo, rien d'autre. */
export interface Profil {
  uid: string;
  pseudo: string;
}

/** Profil public de l'utilisateur connecté, ou null s'il n'en a pas encore. */
export async function monProfil(): Promise<Profil | null> {
  const uid = idUtilisateur();
  const snap = await getDoc(doc(refProfils(), uid));
  return snap.exists() ? { uid, pseudo: snap.data().pseudo } : null;
}

/**
 * Crée ou met à jour son pseudo.
 *
 * `pseudoMin` accompagne `pseudo` : c'est lui qu'interroge la recherche, pour
 * qu'elle soit insensible à la casse. Les règles vérifient leur cohérence — on
 * ne peut pas s'afficher sous un nom et être trouvable sous un autre.
 */
export async function definirPseudo(pseudo: string): Promise<void> {
  const uid = idUtilisateur();
  const propre = pseudo.trim();
  await setDoc(
    doc(refProfils(), uid),
    { pseudo: propre, pseudoMin: pseudoNormalise(propre), maj: maintenant() },
    { merge: true }
  );
}

/** Profils de plusieurs personnes, en une passe. */
export async function profilsDe(uids: string[]): Promise<Map<string, Profil>> {
  const resultat = new Map<string, Profil>();
  if (uids.length === 0) return resultat;

  // `in` accepte 30 valeurs au plus : on découpe.
  const lots: string[][] = [];
  for (let i = 0; i < uids.length; i += 30) lots.push(uids.slice(i, i + 30));

  for (const lot of lots) {
    const snap = await getDocs(query(refProfils(), where('__name__', 'in', lot)));
    for (const d of snap.docs) resultat.set(d.id, { uid: d.id, pseudo: d.data().pseudo });
  }
  return resultat;
}

/**
 * Borne haute d'une recherche par préfixe.
 *
 * U+F8FF est le dernier caractère de la zone Unicode à usage privé : il vient
 * après quasiment tout, si bien que l'intervalle [terme, terme + BORNE] encadre
 * exactement les chaînes qui COMMENCENT par `terme`. C'est l'idiome Firestore
 * standard. Construit par `fromCharCode` plutôt qu'écrit tel quel : le
 * caractère est invisible à l'écran, et un caractère invisible dans du code
 * finit toujours par se faire effacer par accident.
 */
const BORNE_PREFIXE = String.fromCharCode(0xf8ff);

/**
 * Cherche des personnes par pseudo (préfixe, insensible à la casse).
 *
 * Firestore n'a pas de recherche plein texte : l'encadrement ci-dessus est le
 * seul « commence par » possible. Il ne trouve pas un terme au MILIEU d'un
 * pseudo — cela demanderait un service d'indexation dédié, démesuré ici.
 */
export async function chercherProfils(terme: string): Promise<Profil[]> {
  const moi = idUtilisateur();
  const t = pseudoNormalise(terme);
  if (t.length < 2) return [];

  const snap = await getDocs(
    query(
      refProfils(),
      orderBy('pseudoMin'),
      where('pseudoMin', '>=', t),
      where('pseudoMin', '<=', t + BORNE_PREFIXE),
      limit(20)
    )
  );
  return (
    snap.docs
      // Se proposer soi-même en résultat n'aiderait personne.
      .filter((d) => d.id !== moi)
      .map((d) => ({ uid: d.id, pseudo: d.data().pseudo }))
  );
}

// --- Amitiés ----------------------------------------------------------------

function versAmitie(id: string, d: any): Amitie {
  return {
    id,
    membres: d.membres ?? [],
    demandeur: d.demandeur,
    statut: d.statut,
    cree: d.cree,
  };
}

/** Toutes mes amitiés, demandes en attente comprises. */
export async function mesAmities(): Promise<Amitie[]> {
  const uid = idUtilisateur();
  const snap = await getDocs(query(refAmities(), where('membres', 'array-contains', uid)));
  return snap.docs.map((d) => versAmitie(d.id, d.data()));
}

/** Envoie une demande d'amitié. */
export async function demanderAmi(uidCible: string): Promise<void> {
  const moi = idUtilisateur();
  if (uidCible === moi) throw new Error('On ne peut pas s’ajouter soi-même.');

  const id = idPaire(moi, uidCible);
  const existe = await getDoc(doc(refAmities(), id));
  // L'identifiant trié fait qu'une demande croisée retomberait sur le même
  // document : on l'accepte alors plutôt que d'échouer.
  if (existe.exists()) {
    const a = versAmitie(existe.id, existe.data());
    if (a.statut === 'attente' && a.demandeur !== moi) return accepterAmi(id);
    return;
  }

  await setDoc(doc(refAmities(), id), {
    membres: [moi, uidCible].sort(),
    demandeur: moi,
    statut: 'attente' as StatutAmitie,
    cree: maintenant(),
  });
}

/** Accepte une demande reçue. */
export async function accepterAmi(idAmitie: string): Promise<void> {
  idUtilisateur();
  await updateDoc(doc(refAmities(), idAmitie), { statut: 'acceptee' as StatutAmitie });
}

/** Refuse une demande, annule la sienne, ou retire un ami. */
export async function retirerAmi(idAmitie: string): Promise<void> {
  idUtilisateur();
  await deleteDoc(doc(refAmities(), idAmitie));
}

/** Les uid de mes amis confirmés. */
export async function uidDesAmis(): Promise<string[]> {
  const moi = idUtilisateur();
  const amities = await mesAmities();
  return amities
    .filter((a) => a.statut === 'acceptee')
    .map((a) => a.membres.find((m) => m !== moi))
    .filter((u): u is string => Boolean(u));
}

// --- Fil d'activité ---------------------------------------------------------

/** Ce qu'il faut pour publier une activité. */
export interface NouvelleActivite {
  type: TypeActivite;
  tmdbId: number;
  serieTitre: string;
  cheminAffiche: string | null;
  saison?: number;
  numero?: number;
  note?: number;
}

/**
 * Publie une activité dans le fil de ses amis.
 *
 * Ne lève JAMAIS et ne bloque rien : le partage social est un bonus. Si publier
 * échoue, l'épisode reste marqué comme vu — l'inverse serait absurde.
 *
 * Sans ami, on n'écrit rien du tout : un document que personne ne peut lire est
 * une écriture pure perte.
 */
export async function publierActivite(a: NouvelleActivite, amis?: string[]): Promise<void> {
  try {
    const moi = idUtilisateur();
    const destinataires = amis ?? (await uidDesAmis());
    if (destinataires.length === 0) return;

    const profil = await monProfil();
    const doc_ = doc(refActivites());
    await setDoc(doc_, {
      auteur: moi,
      pseudo: profil?.pseudo ?? 'Quelqu’un',
      type: a.type,
      tmdbId: a.tmdbId,
      serieTitre: a.serieTitre,
      cheminAffiche: a.cheminAffiche,
      saison: a.saison ?? null,
      numero: a.numero ?? null,
      note: a.note ?? null,
      quand: maintenant(),
      // L'auteur se met dans la liste : il voit ses propres publications dans le
      // fil, comme sur n'importe quel réseau.
      visiblePar: [moi, ...destinataires],
    });
  } catch {
    // Silencieux volontairement : voir la documentation ci-dessus.
  }
}

/** Le fil : mes activités et celles de mes amis, du plus récent au plus ancien. */
export async function filDActualite(limite = 60): Promise<Activite[]> {
  const moi = idUtilisateur();
  const snap = await getDocs(
    query(
      refActivites(),
      where('visiblePar', 'array-contains', moi),
      orderBy('quand', 'desc'),
      limit(limite)
    )
  );
  return snap.docs.map((d) => {
    const v = d.data();
    return {
      id: d.id,
      auteur: v.auteur,
      pseudo: v.pseudo,
      type: v.type,
      tmdbId: v.tmdbId,
      serieTitre: v.serieTitre,
      cheminAffiche: v.cheminAffiche ?? null,
      saison: v.saison ?? undefined,
      numero: v.numero ?? undefined,
      note: v.note ?? undefined,
      quand: v.quand,
    };
  });
}

// --- Commentaires -----------------------------------------------------------

/** Les commentaires d'un épisode, du plus récent au plus ancien. */
export async function commentairesEpisode(episodeId: number): Promise<Commentaire[]> {
  const snap = await getDocs(
    query(
      refCommentaires(),
      where('episodeId', '==', episodeId),
      orderBy('quand', 'desc'),
      limit(50)
    )
  );
  return snap.docs.map((d) => {
    const v = d.data();
    return {
      id: d.id,
      serieId: v.serieId,
      episodeId: v.episodeId,
      auteur: v.auteur,
      pseudo: v.pseudo,
      texte: v.texte,
      quand: v.quand,
    };
  });
}

/** Publie un commentaire sur un épisode. */
export async function commenter(
  serieId: number,
  episodeId: number,
  texte: string
): Promise<Commentaire> {
  const moi = idUtilisateur();
  const propre = texte.trim();
  if (!propre) throw new Error('Le commentaire est vide.');
  // Même borne que les règles : laisser passer plus donnerait une erreur
  // incompréhensible au moment d'écrire.
  if (propre.length > 500) throw new Error('500 caractères au maximum.');

  const profil = await monProfil();
  const ref = doc(refCommentaires());
  const donnees = {
    serieId,
    episodeId,
    auteur: moi,
    pseudo: profil?.pseudo ?? 'Quelqu’un',
    texte: propre,
    quand: maintenant(),
  };
  await setDoc(ref, donnees);
  return { id: ref.id, ...donnees };
}

/** Supprime son propre commentaire. */
export async function supprimerCommentaire(id: string): Promise<void> {
  idUtilisateur();
  await deleteDoc(doc(refCommentaires(), id));
}
