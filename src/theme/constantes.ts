// =============================================================================
//  Constantes globales de My Watch
//  ---------------------------------------------------------------------------
//  Valeurs de configuration réutilisées dans toute l'app : URLs des images
//  TMDb et correspondance des identifiants de genres vers un libellé français.
// =============================================================================

/**
 * Base des images TMDb. On y ajoute une "taille" puis le chemin renvoyé
 * par l'API (ex : `${IMG_BASE}w500/abc.jpg`).
 * Tailles utiles : w185, w342, w500 (affiches) et w780, w1280 (fonds).
 */
export const IMG_BASE = 'https://image.tmdb.org/t/p/';

/** Construit l'URL complète d'une affiche à partir du chemin TMDb. */
export function urlAffiche(
  chemin: string | null,
  taille: 'w185' | 'w342' | 'w500' = 'w342'
): string | null {
  return chemin ? `${IMG_BASE}${taille}${chemin}` : null;
}

/** Construit l'URL complète d'une image de fond (backdrop). */
export function urlFond(chemin: string | null, taille: 'w780' | 'w1280' = 'w1280'): string | null {
  return chemin ? `${IMG_BASE}${taille}${chemin}` : null;
}

/**
 * Correspondance des identifiants de genres TMDb vers un libellé français.
 * (Films et séries confondus — les identifiants ne se chevauchent pas.)
 */
export const GENRES_FR: Record<number, string> = {
  28: 'Action',
  12: 'Aventure',
  16: 'Animation',
  35: 'Comédie',
  80: 'Crime',
  99: 'Documentaire',
  18: 'Drame',
  10751: 'Famille',
  14: 'Fantastique',
  36: 'Histoire',
  27: 'Horreur',
  10402: 'Musique',
  9648: 'Mystère',
  10749: 'Romance',
  878: 'Science-fiction',
  10770: 'Téléfilm',
  53: 'Thriller',
  10752: 'Guerre',
  37: 'Western',
  10759: 'Action & Aventure',
  10762: 'Enfants',
  10763: 'Actualités',
  10764: 'Télé-réalité',
  10765: 'Sci-Fi & Fantastique',
  10766: 'Feuilleton',
  10767: 'Talk-show',
  10768: 'Guerre & Politique',
};

/** Renvoie les libellés français d'une liste d'identifiants de genres. */
export function nomsGenres(ids: number[]): string[] {
  return ids.map((id) => GENRES_FR[id]).filter(Boolean);
}
