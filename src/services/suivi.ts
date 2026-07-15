// =============================================================================
//  Service "Suivi"
//  ---------------------------------------------------------------------------
//  Les actions de suivi qui ont besoin à la fois de TMDb et de la bibliothèque.
//
//  Elles vivent ici plutôt que dans `bibliotheque.ts` pour que ce dernier reste
//  un service purement Firestore, sans dépendance à l'API TMDb.
// =============================================================================

import { episodesSaison } from '@/lib/tmdb';
import { marquerEpisodeVu } from '@/services/bibliotheque';
import { PositionEpisode } from '@/services/prochainAVoir';
import { publierActivite } from '@/services/social';

/**
 * Marque vu un épisode désigné par sa POSITION (saison + numéro).
 *
 * L'accueil connaît la position du prochain épisode mais pas son identifiant
 * TMDb : on résout l'identifiant ici, à la demande, plutôt que de précharger
 * toutes les saisons de toutes les séries suivies.
 *
 * @returns true si l'épisode a été trouvé et marqué.
 */
export async function marquerPositionVue(
  serieId: number,
  position: PositionEpisode,
  /** Pour publier l'activité dans le fil des amis. Omis = pas de publication. */
  serie?: { titre: string; cheminAffiche: string | null }
): Promise<boolean> {
  const episodes = await episodesSaison(serieId, position.saison);
  const episode = episodes.find((e) => e.numero === position.numero);
  if (!episode) return false;
  await marquerEpisodeVu(serieId, episode.id, position.saison, position.numero);

  // Après l'écriture, et sans l'attendre : le fil est un bonus. S'il échoue,
  // l'épisode reste vu — bloquer le suivi pour un défaut de publication serait
  // absurde.
  if (serie) {
    publierActivite({
      type: 'episode',
      tmdbId: serieId,
      serieTitre: serie.titre,
      cheminAffiche: serie.cheminAffiche,
      saison: position.saison,
      numero: position.numero,
    });
  }
  return true;
}
