// =============================================================================
//  Service "Agenda"
//  ---------------------------------------------------------------------------
//  Calcule les prochains épisodes à diffuser pour les séries suivies encore
//  "actives" (à voir / en cours). Cette logique est partagée par l'écran
//  Calendrier et le service de notifications.
// =============================================================================

import { chargerBibliotheque } from '@/services/bibliotheque';
import { prochainEpisode, ProchainEpisode } from '@/lib/tmdb';

/**
 * Récupère les séries suivies encore "actives" (à voir / en cours) et renvoie
 * leurs prochains épisodes programmés, triés par date de diffusion croissante.
 */
export async function prochainsEpisodes(): Promise<ProchainEpisode[]> {
  const biblio = await chargerBibliotheque();
  // On ne garde que les séries encore "actives".
  const series = biblio.filter(
    (e) => e.type === 'serie' && (e.statut === 'en_cours' || e.statut === 'a_voir')
  );
  // Prochain épisode de chaque série, en parallèle.
  const resultats = await Promise.all(
    series.map((s) => prochainEpisode(s.tmdbId).catch(() => null))
  );
  const valides = resultats.filter((r): r is ProchainEpisode => r !== null);
  valides.sort((a, b) => a.dateDiffusion.localeCompare(b.dateDiffusion));
  return valides;
}
