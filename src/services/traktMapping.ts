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
