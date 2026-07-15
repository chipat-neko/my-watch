// =============================================================================
//  Mapping Trakt -> modèle My Watch (fonctions pures)
//  ---------------------------------------------------------------------------
//  Transforme les réponses de l'API Trakt (historique "vu" + notes) en une
//  liste de titres à importer, identifiés par leur id TMDb. Aucune dépendance
//  réseau ni React Native : entièrement testable (voir traktMapping.test.ts).
// =============================================================================

import { StatutSuivi, TypeMedia } from '@/types';

// --- Sous-ensembles utiles des réponses Trakt -------------------------------
interface TraktIds {
  tmdb: number | null;
}
interface TraktMedia {
  title: string;
  ids: TraktIds;
}
export interface TraktWatchedShow {
  show: TraktMedia;
}
export interface TraktWatchedMovie {
  movie: TraktMedia;
}
export interface TraktRating {
  rating: number; // note Trakt sur 10
  type: 'show' | 'movie' | 'season' | 'episode';
  show?: TraktMedia;
  movie?: TraktMedia;
}

/** Un titre issu de Trakt, prêt à être résolu via TMDb puis ajouté. */
export interface TitreTrakt {
  tmdbId: number;
  type: TypeMedia;
  titre: string;
  statut: StatutSuivi;
  /** Note personnelle sur 10, ou null. */
  note: number | null;
}

/**
 * Construit la liste des titres à importer depuis l'historique "vu" Trakt.
 * - séries vues -> statut "en cours" ; films vus -> "terminé".
 * Les entrées sans identifiant TMDb (non résolubles) sont ignorées.
 */
export function mapperWatched(
  shows: TraktWatchedShow[],
  movies: TraktWatchedMovie[]
): TitreTrakt[] {
  const resultat: TitreTrakt[] = [];

  for (const s of shows) {
    const tmdbId = s.show?.ids?.tmdb;
    if (tmdbId) {
      resultat.push({ tmdbId, type: 'serie', titre: s.show.title, statut: 'en_cours', note: null });
    }
  }
  for (const m of movies) {
    const tmdbId = m.movie?.ids?.tmdb;
    if (tmdbId) {
      resultat.push({ tmdbId, type: 'film', titre: m.movie.title, statut: 'termine', note: null });
    }
  }
  return resultat;
}

/**
 * Indexe les notes de titres (séries + films) par clé "type-tmdbId".
 * Les notes de saison/épisode (hors périmètre) et sans id TMDb sont ignorées.
 */
export function mapperNotes(ratings: TraktRating[]): Map<string, number> {
  const notes = new Map<string, number>();
  for (const r of ratings) {
    if (r.type === 'movie' && r.movie?.ids?.tmdb) {
      notes.set(`film-${r.movie.ids.tmdb}`, r.rating);
    } else if (r.type === 'show' && r.show?.ids?.tmdb) {
      notes.set(`serie-${r.show.ids.tmdb}`, r.rating);
    }
  }
  return notes;
}

/** Associe à chaque titre sa note personnelle (par type + tmdbId), si connue. */
export function appliquerNotes(titres: TitreTrakt[], notes: Map<string, number>): TitreTrakt[] {
  return titres.map((t) => ({ ...t, note: notes.get(`${t.type}-${t.tmdbId}`) ?? null }));
}

/**
 * Vrai si une clé PEUT être un identifiant d'application Trakt.
 *
 * Pourquoi cette vérification existe : le modèle `.env.example` contient
 * `colle_ici_ton_client_id_trakt`, qui n'est pas vide. Un simple `length > 0`
 * déclarait l'application configurée, masquait le message d'aide, et lançait une
 * connexion vouée à l'échec — sans rien expliquer.
 *
 * Pourquoi elle ne valide PAS un format précis : Trakt a déjà changé le sien.
 * Les clés étaient des empreintes hexadécimales de 64 caractères ; celles
 * délivrées aujourd'hui font 43 caractères en base64url. Une vérification
 * stricte a donc rejeté de VRAIES clés — le contraire du service rendu. On se
 * borne à écarter ce qui ne peut pas être un jeton, et on laisse l'API trancher :
 * elle seule sait.
 */
export function cleTraktValide(cle: string): boolean {
  const c = cle.trim();
  // Trop court pour un jeton d'application, quel que soit le format.
  if (c.length < 32) return false;
  // Les valeurs d'exemple livrées avec le projet.
  if (/colle_ici|ton_client|remplir|placeholder|xxxx/i.test(c)) return false;
  // Un jeton ne contient ni espace, ni accent, ni ponctuation.
  return /^[A-Za-z0-9_-]+$/.test(c);
}

/**
 * Issues possibles d'un sondage.
 *
 * `deja_utilise` était auparavant confondu avec `expire`. Ce sont pourtant deux
 * situations distinctes : un code expiré n'a jamais servi, un code déjà utilisé
 * a bel et bien été validé — mais son jeton est parti ailleurs (un autre onglet,
 * une tentative précédente). Les annoncer pareil laisse croire à une panne alors
 * qu'il suffit de repartir d'un code neuf.
 */
export type EtatSondage = 'en_attente' | 'ok' | 'refuse' | 'expire' | 'deja_utilise' | 'invalide';

/**
 * Traduit un statut HTTP de Trakt en issue de sondage.
 *
 * Exporté pour être testé : c'est une table de correspondance, et une erreur
 * dedans se paie par un message incompréhensible au pire moment.
 */
export function etatDepuisStatut(statut: number): EtatSondage {
  // 400 = pas encore autorisé ; 429 = sonder moins vite. Dans les deux cas, on
  // patiente : ce ne sont pas des échecs.
  if (statut === 400 || statut === 429) return 'en_attente';
  if (statut === 418) return 'refuse';
  if (statut === 409) return 'deja_utilise';
  if (statut === 410) return 'expire';
  if (statut === 404) return 'invalide';
  // Tout autre statut (500, coupure…) : on préfère annoncer un code à refaire
  // plutôt que de sonder indéfiniment dans le vide.
  return 'invalide';
}
