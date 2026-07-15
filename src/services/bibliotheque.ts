// =============================================================================
//  Service "Bibliothèque" (Firestore)
//  ---------------------------------------------------------------------------
//  Regroupe toutes les opérations sur la liste personnelle de l'utilisateur
//  (ajouter/retirer un titre, changer son statut, noter) et sur les épisodes
//  marqués comme vus. Les données sont stockées dans Firestore, sous l'arbre
//  de l'utilisateur connecté :
//
//    users/{uid}/bibliotheque/{type_tmdbId}
//    users/{uid}/episodes_vus/{episodeId}
//
//  L'identifiant de document est déterministe (ex : "serie_1396", "550"),
//  ce qui garantit l'unicité (une seule entrée par titre / épisode) sans
//  contrainte SQL. Les règles de sécurité (firestore.rules) limitent chaque
//  utilisateur à son propre sous-arbre.
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getCountFromServer,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { EntreeBibliotheque, EpisodeVu, StatutSuivi, Titre, SourceEntree } from '@/types';

/** Identifiant de l'utilisateur connecté (lève une erreur si déconnecté). */
function idUtilisateur(): string {
  const id = auth.currentUser?.uid;
  if (!id) throw new Error('Utilisateur non connecté.');
  return id;
}

const refBiblio = (uid: string) => collection(db, 'users', uid, 'bibliotheque');
const refEpisodes = (uid: string) => collection(db, 'users', uid, 'episodes_vus');
/** Id de document déterministe pour un titre (assure l'unicité par utilisateur). */
const idEntree = (type: string, tmdbId: number) => `${type}_${tmdbId}`;

const maintenant = () => new Date().toISOString();

// --- Conversion : document Firestore -> objet app ----------------------------
function versEntree(id: string, d: any): EntreeBibliotheque {
  return {
    id,
    utilisateurId: d.utilisateurId,
    tmdbId: d.tmdbId,
    type: d.type,
    titre: d.titre,
    cheminAffiche: d.cheminAffiche ?? null,
    statut: d.statut,
    notePerso: d.notePerso ?? null,
    source: d.source,
    ajouteLe: d.ajouteLe,
    vuLe: d.vuLe ?? null,
  };
}

/** Récupère toute la bibliothèque de l'utilisateur connecté (plus récent d'abord). */
export async function chargerBibliotheque(): Promise<EntreeBibliotheque[]> {
  const uid = idUtilisateur();
  const snap = await getDocs(query(refBiblio(uid), orderBy('ajouteLe', 'desc')));
  return snap.docs.map((d) => versEntree(d.id, d.data()));
}

/**
 * Récupère l'entrée de bibliothèque correspondant à un titre précis,
 * ou null si l'utilisateur ne le suit pas encore.
 */
export async function entreePour(tmdbId: number, type: string): Promise<EntreeBibliotheque | null> {
  const uid = idUtilisateur();
  const snap = await getDoc(doc(refBiblio(uid), idEntree(type, tmdbId)));
  return snap.exists() ? versEntree(snap.id, snap.data()) : null;
}

/**
 * Ajoute un titre à la bibliothèque (ou ne fait rien s'il y est déjà).
 * @param titre   Le titre TMDb à suivre.
 * @param statut  Statut initial (par défaut "à voir").
 * @param source  Provenance de l'ajout (manuel par défaut).
 * @param vuLe    Date de visionnage à forcer (ISO), ex : date d'historique lors
 *                d'un import. Sinon, elle est posée automatiquement si le titre
 *                est ajouté directement comme "terminé".
 */
export async function ajouterTitre(
  titre: Titre,
  statut: StatutSuivi = 'a_voir',
  source: SourceEntree = 'manuel',
  vuLe?: string | null
): Promise<void> {
  const uid = idUtilisateur();
  const ref = doc(refBiblio(uid), idEntree(titre.type, titre.id));

  // Ne pas écraser une entrée déjà présente (ex-comportement "ignoreDuplicates").
  if ((await getDoc(ref)).exists()) return;

  await setDoc(ref, {
    utilisateurId: uid,
    tmdbId: titre.id,
    type: titre.type,
    titre: titre.titre,
    cheminAffiche: titre.cheminAffiche,
    statut,
    notePerso: null,
    source,
    ajouteLe: maintenant(),
    // Date de visionnage : fournie, ou posée si on ajoute déjà en "terminé".
    vuLe: vuLe ?? (statut === 'termine' ? maintenant() : null),
  });
}

/** Change le statut de suivi d'une entrée existante. */
export async function changerStatut(entreeId: string, statut: StatutSuivi): Promise<void> {
  const uid = idUtilisateur();
  const ref = doc(refBiblio(uid), entreeId);
  const patch: { statut: StatutSuivi; vuLe?: string } = { statut };
  // À la première complétion, on horodate la date de visionnage si absente.
  if (statut === 'termine') {
    const snap = await getDoc(ref);
    if (snap.exists() && !snap.data().vuLe) patch.vuLe = maintenant();
  }
  await updateDoc(ref, patch);
}

/** Attribue une note personnelle (sur 10) à une entrée. */
export async function noter(entreeId: string, note: number | null): Promise<void> {
  const uid = idUtilisateur();
  await updateDoc(doc(refBiblio(uid), entreeId), { notePerso: note });
}

/** Retire un titre de la bibliothèque. */
export async function retirerTitre(entreeId: string): Promise<void> {
  const uid = idUtilisateur();
  await deleteDoc(doc(refBiblio(uid), entreeId));
}

// -----------------------------------------------------------------------------
//  Épisodes vus
// -----------------------------------------------------------------------------

function versEpisodeVu(id: string, d: any): EpisodeVu {
  return {
    id,
    utilisateurId: d.utilisateurId,
    serieId: d.serieId,
    episodeId: d.episodeId,
    saison: d.saison,
    numero: d.numero,
    note: d.note ?? null,
    vuLe: d.vuLe,
  };
}

/**
 * Compte les épisodes vus, par série, en UNE seule lecture Firestore.
 *
 * L'Accueil affiche la progression de plusieurs séries à la fois : une requête
 * `where('serieId','==',…)` par série y coûterait N allers-retours pour une
 * collection qui tient largement en mémoire.
 */
export async function comptesEpisodesVus(): Promise<Map<number, number>> {
  const uid = idUtilisateur();
  const snap = await getDocs(refEpisodes(uid));
  const comptes = new Map<number, number>();
  for (const d of snap.docs) {
    const serieId = d.data().serieId as number;
    comptes.set(serieId, (comptes.get(serieId) ?? 0) + 1);
  }
  return comptes;
}

/** Récupère les épisodes vus d'une série. */
export async function episodesVusDeLaSerie(serieId: number): Promise<EpisodeVu[]> {
  const uid = idUtilisateur();
  const snap = await getDocs(query(refEpisodes(uid), where('serieId', '==', serieId)));
  return snap.docs.map((d) => versEpisodeVu(d.id, d.data()));
}

/** Marque un épisode comme vu (sans écraser s'il l'est déjà). */
export async function marquerEpisodeVu(
  serieId: number,
  episodeId: number,
  saison: number,
  numero: number
): Promise<void> {
  const uid = idUtilisateur();
  const ref = doc(refEpisodes(uid), String(episodeId));
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    utilisateurId: uid,
    serieId,
    episodeId,
    saison,
    numero,
    note: null,
    vuLe: maintenant(),
  });
}

/**
 * Attribue (ou efface avec `null`) la note personnelle d'un épisode. Noter un
 * épisode le marque implicitement comme vu (le document est créé si besoin).
 */
export async function noterEpisode(
  serieId: number,
  episodeId: number,
  saison: number,
  numero: number,
  note: number | null
): Promise<void> {
  const uid = idUtilisateur();
  const ref = doc(refEpisodes(uid), String(episodeId));
  if ((await getDoc(ref)).exists()) {
    // Met à jour la note sans toucher à la date de visionnage.
    await updateDoc(ref, { note });
  } else {
    await setDoc(ref, {
      utilisateurId: uid,
      serieId,
      episodeId,
      saison,
      numero,
      note,
      vuLe: maintenant(),
    });
  }
}

/** Annule le marquage "vu" d'un épisode. */
export async function demarquerEpisode(episodeId: number): Promise<void> {
  const uid = idUtilisateur();
  await deleteDoc(doc(refEpisodes(uid), String(episodeId)));
}

/** Statistiques simples affichées sur l'écran Profil. */
export interface Statistiques {
  nbSeries: number;
  nbFilms: number;
  nbEpisodesVus: number;
  /** Titres au statut « terminé » (déjà dans la bibliothèque chargée : gratuit). */
  nbTermines: number;
}

/**
 * Calcule quelques statistiques sur la bibliothèque de l'utilisateur.
 * (Compte les séries, les films, et le total d'épisodes vus.)
 */
export async function statistiques(): Promise<Statistiques> {
  const uid = idUtilisateur();
  const biblio = await chargerBibliotheque();
  // getCountFromServer : compte les épisodes vus sans rapatrier les documents.
  const compte = await getCountFromServer(refEpisodes(uid));
  return {
    nbSeries: biblio.filter((e) => e.type === 'serie').length,
    nbFilms: biblio.filter((e) => e.type === 'film').length,
    nbEpisodesVus: compte.data().count,
    nbTermines: biblio.filter((e) => e.statut === 'termine').length,
  };
}
