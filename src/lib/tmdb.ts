// =============================================================================
//  Service TMDb (The Movie Database)
//  ---------------------------------------------------------------------------
//  TMDb est notre source de données pour les films et les séries : recherche,
//  tendances, détails, saisons/épisodes et plateformes de streaming.
//
//  Toutes les requêtes passent par la fonction interne `appelTmdb`, qui ajoute
//  l'authentification (jeton Bearer v4) et la langue française. Les réponses
//  brutes de TMDb sont ensuite normalisées vers nos propres types (Titre,
//  Episode…) pour découpler le reste de l'app du format de l'API.
// =============================================================================

import { Titre, Episode, TypeMedia } from '@/types';

const BASE = 'https://api.themoviedb.org/3';
const JETON = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN ?? '';

/**
 * Effectue un appel authentifié à l'API TMDb.
 * @param chemin  Chemin de l'endpoint (ex : "/search/multi").
 * @param params  Paramètres de requête additionnels.
 */
async function appelTmdb<T>(chemin: string, params: Record<string, string> = {}): Promise<T> {
  // On force le français et la région France pour les libellés et dates.
  const query = new URLSearchParams({ language: 'fr-FR', region: 'FR', ...params });
  const reponse = await fetch(`${BASE}${chemin}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${JETON}`,
      Accept: 'application/json',
    },
  });

  if (!reponse.ok) {
    throw new Error(`Erreur TMDb ${reponse.status} sur ${chemin}`);
  }
  return (await reponse.json()) as T;
}

// --- Normalisation : convertit un objet brut TMDb vers notre type Titre ------
// TMDb utilise "title"/"release_date" pour les films et "name"/"first_air_date"
// pour les séries. On unifie les deux formes ici.
function versTitre(brut: any, typeForce?: TypeMedia): Titre {
  const type: TypeMedia = typeForce ?? (brut.media_type === 'movie' ? 'film' : 'serie');
  const estFilm = type === 'film';
  return {
    id: brut.id,
    type,
    titre: estFilm ? brut.title : brut.name,
    titreOriginal: estFilm ? brut.original_title : brut.original_name,
    synopsis: brut.overview ?? '',
    cheminAffiche: brut.poster_path ?? null,
    cheminFond: brut.backdrop_path ?? null,
    note: brut.vote_average ?? 0,
    dateSortie: (estFilm ? brut.release_date : brut.first_air_date) || null,
    genres: brut.genre_ids ?? (brut.genres ? brut.genres.map((g: any) => g.id) : []),
    // Présent uniquement sur le détail d'une série (/tv/{id}) ; permet à
    // l'écran détail de connaître le nombre de saisons sans second appel réseau.
    nombreSaisons: brut.number_of_seasons ?? undefined,
    nombreEpisodes: brut.number_of_episodes ?? undefined,
    // La saison 0 regroupe les épisodes spéciaux : elle ne fait pas partie de la
    // progression normale d'une série, on l'écarte.
    saisons: Array.isArray(brut.seasons)
      ? brut.seasons
          .filter((s: any) => s.season_number > 0 && s.episode_count > 0)
          .map((s: any) => ({ numero: s.season_number, nbEpisodes: s.episode_count }))
      : undefined,
  };
}

/**
 * Recherche multi (films + séries) à partir d'un texte libre.
 * On filtre les personnes pour ne garder que les films et séries.
 * @param texte  Le texte recherché.
 * @param page   Numéro de page TMDb (1 par défaut) pour le défilement infini.
 */
export async function rechercher(texte: string, page = 1): Promise<Titre[]> {
  if (!texte.trim()) return [];
  const data = await appelTmdb<{ results: any[] }>('/search/multi', {
    query: texte,
    page: String(page),
  });
  return data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => versTitre(r));
}

/** Récupère les titres tendance de la semaine (films + séries mélangés). */
export async function tendances(): Promise<Titre[]> {
  const data = await appelTmdb<{ results: any[] }>('/trending/all/week');
  return data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => versTitre(r));
}

/** Séries populaires du moment. */
export async function seriesPopulaires(): Promise<Titre[]> {
  const data = await appelTmdb<{ results: any[] }>('/tv/popular');
  return data.results.map((r) => versTitre(r, 'serie'));
}

/** Films populaires du moment. */
export async function filmsPopulaires(): Promise<Titre[]> {
  const data = await appelTmdb<{ results: any[] }>('/movie/popular');
  return data.results.map((r) => versTitre(r, 'film'));
}

/** Détails complets d'un titre (film ou série). */
export async function detailsTitre(id: number, type: TypeMedia): Promise<Titre> {
  const chemin = type === 'film' ? `/movie/${id}` : `/tv/${id}`;
  const brut = await appelTmdb<any>(chemin);
  return versTitre(brut, type);
}

/**
 * Liste des épisodes d'une saison de série.
 * @param serieId  Identifiant TMDb de la série.
 * @param saison   Numéro de la saison.
 */
export async function episodesSaison(serieId: number, saison: number): Promise<Episode[]> {
  const data = await appelTmdb<{ episodes: any[] }>(`/tv/${serieId}/season/${saison}`);
  return (data.episodes ?? []).map((e) => ({
    id: e.id,
    saison: e.season_number,
    numero: e.episode_number,
    nom: e.name ?? '',
    synopsis: e.overview ?? '',
    dateDiffusion: e.air_date || null,
    duree: e.runtime ?? null,
  }));
}

/** Informations minimales sur le prochain épisode à venir d'une série. */
export interface ProchainEpisode {
  serieId: number;
  serieTitre: string;
  cheminAffiche: string | null;
  /**
   * Image de fond (backdrop) 16:9 de la série. Indispensable au hero : une
   * affiche 2:3 recadrée en cover dans un cadre 16:9 n'en montre qu'une bande
   * centrale, ce qui donne un hero illisible.
   */
  cheminFond: string | null;
  nom: string;
  saison: number;
  numero: number;
  dateDiffusion: string; // format ISO
}

/**
 * Renvoie le prochain épisode à diffuser d'une série (champ TMDb
 * `next_episode_to_air`), ou null s'il n'y en a pas de programmé.
 * Sert à alimenter l'onglet "À venir" / calendrier.
 */
export async function prochainEpisode(serieId: number): Promise<ProchainEpisode | null> {
  const brut = await appelTmdb<any>(`/tv/${serieId}`);
  const prochain = brut.next_episode_to_air;
  if (!prochain || !prochain.air_date) return null;
  return {
    serieId,
    serieTitre: brut.name,
    cheminAffiche: brut.poster_path ?? null,
    cheminFond: brut.backdrop_path ?? null,
    nom: prochain.name ?? '',
    saison: prochain.season_number,
    numero: prochain.episode_number,
    dateDiffusion: prochain.air_date,
  };
}

/**
 * Plateformes de streaming où le titre est disponible en France
 * (fonctionnalité "Où regarder"). TMDb agrège ces données via JustWatch.
 * Renvoie la liste des noms de fournisseurs (ex : "Netflix", "Disney Plus").
 */
export async function ouRegarder(id: number, type: TypeMedia): Promise<string[]> {
  const chemin = type === 'film' ? `/movie/${id}/watch/providers` : `/tv/${id}/watch/providers`;
  const data = await appelTmdb<{ results: Record<string, any> }>(chemin);
  const fr = data.results?.['FR'];
  if (!fr) return [];
  // "flatrate" = disponible dans un abonnement (le cas le plus courant).
  const abo = (fr.flatrate ?? []) as any[];
  return abo.map((p) => p.provider_name as string);
}
