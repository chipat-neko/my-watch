// =============================================================================
//  Social (logique pure)
//  ---------------------------------------------------------------------------
//  Tout ce qui se calcule sans réseau : identifiant de paire, validation des
//  pseudos, mise en forme des activités.
// =============================================================================

/** Statut d'un lien entre deux personnes. */
export type StatutAmitie = 'attente' | 'acceptee';

/** Un lien d'amitié, tel que stocké. */
export interface Amitie {
  id: string;
  membres: string[];
  /** Qui a envoyé la demande. */
  demandeur: string;
  statut: StatutAmitie;
  cree: string;
}

/** Ce qu'un ami a fait. */
export type TypeActivite = 'episode' | 'note' | 'ajout' | 'termine';

/** Une entrée du fil. */
export interface Activite {
  id: string;
  auteur: string;
  pseudo: string;
  type: TypeActivite;
  tmdbId: number;
  serieTitre: string;
  cheminAffiche: string | null;
  saison?: number;
  numero?: number;
  /** Note sur 10, pour le type « note ». */
  note?: number;
  quand: string;
}

/** Un commentaire d'épisode. */
export interface Commentaire {
  id: string;
  serieId: number;
  episodeId: number;
  auteur: string;
  pseudo: string;
  texte: string;
  quand: string;
}

/**
 * Identifiant du document d'amitié pour deux personnes.
 *
 * Les deux uid sont TRIÉS : (a,b) et (b,a) donnent le même identifiant. C'est
 * ce qui garantit qu'il ne peut pas exister deux demandes croisées entre les
 * mêmes personnes — Firestore refusera la seconde création, sans qu'aucune
 * règle n'ait à le vérifier.
 */
export function idPaire(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

/**
 * L'autre membre d'une amitié, vu depuis `moi`.
 *
 * Renvoie une chaîne vide si `moi` n'est pas membre : sans cette vérification,
 * un appel avec un tiers renverrait le PREMIER membre, ce qui laisserait croire
 * à un lien qui n'existe pas.
 */
export function autreMembre(amitie: Amitie, moi: string): string {
  if (!amitie.membres.includes(moi)) return '';
  return amitie.membres.find((m) => m !== moi) ?? '';
}

/**
 * Valide un pseudo. Les mêmes bornes que les règles Firestore : une validation
 * côté client qui laisserait passer plus que le serveur donnerait une erreur
 * incompréhensible au moment d'enregistrer.
 */
export function pseudoValide(pseudo: string): { ok: boolean; erreur?: string } {
  const p = pseudo.trim();
  if (p.length < 3) return { ok: false, erreur: 'Au moins 3 caractères.' };
  if (p.length > 20) return { ok: false, erreur: '20 caractères au maximum.' };
  if (!/^[\p{L}\p{N}_. -]+$/u.test(p)) {
    return { ok: false, erreur: 'Lettres, chiffres, espace, point, tiret et souligné seulement.' };
  }
  return { ok: true };
}

/** Forme normalisée d'un pseudo, pour une recherche insensible à la casse. */
export function pseudoNormalise(pseudo: string): string {
  return pseudo.trim().toLowerCase();
}

/** Phrase décrivant une activité, à la deuxième personne du fil. */
export function libelleActivite(a: Activite): string {
  switch (a.type) {
    case 'episode':
      return `a regardé S${a.saison} E${a.numero}`;
    case 'note':
      // Les notes sont stockées sur 10 (comme TMDb) et affichées sur 5.
      return `a noté ${((a.note ?? 0) / 2).toFixed(1)}/5`;
    case 'termine':
      return 'a terminé';
    case 'ajout':
      return 'a ajouté à sa liste';
  }
}

/**
 * Regroupe les activités consécutives d'une même personne sur une même série.
 *
 * Sans cela, rattraper une saison inonde le fil de vingt lignes identiques :
 « a regardé S1E1 », « a regardé S1E2 »… On n'agrège que les entrées ADJACENTES,
 * pour ne pas réordonner le fil ni mélanger deux sessions distinctes.
 */
export function grouperActivites(activites: Activite[]): { tete: Activite; combien: number }[] {
  const groupes: { tete: Activite; combien: number }[] = [];

  for (const a of activites) {
    const dernier = groupes[groupes.length - 1];
    const memeSerie =
      dernier &&
      dernier.tete.auteur === a.auteur &&
      dernier.tete.tmdbId === a.tmdbId &&
      dernier.tete.type === 'episode' &&
      a.type === 'episode';

    if (memeSerie) dernier.combien += 1;
    else groupes.push({ tete: a, combien: 1 });
  }

  return groupes;
}
