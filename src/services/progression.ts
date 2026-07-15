// =============================================================================
//  Service "Progression"
//  ---------------------------------------------------------------------------
//  Où en est chaque série : épisodes vus / total, et surtout le PROCHAIN
//  ÉPISODE À REGARDER.
//
//  Sans ces deux informations, l'application est un annuaire d'affiches ; avec
//  elles, elle répond à la seule question qui compte quand on ouvre une app de
//  suivi : « je regarde quoi, maintenant ? ».
//
//  Le calcul vit dans `progressionCalcul.ts` et `prochainAVoir.ts` (purs,
//  testés) ; ici, on ne fait que rassembler les données.
// =============================================================================

import { episodesVusParSerie } from '@/services/bibliotheque';
import { detailsTitre } from '@/lib/tmdb';
import { enParallele } from '@/services/async';
import { AvanceeSerie, fusionnerAvancees, InfosSerie } from '@/services/progressionCalcul';
import { PositionEpisode } from '@/services/prochainAVoir';
import { EntreeBibliotheque, EpisodeVu } from '@/types';

export type { AvanceeSerie };

/**
 * Avancement des séries fournies. Une seule lecture Firestore pour tous les
 * épisodes vus, puis un appel TMDb par série (4 en parallèle au plus, pour ne
 * pas saturer l'API). Le prochain épisode est déduit de ce même appel : il ne
 * coûte donc rien de plus.
 *
 * Ne lève jamais : un avancement manquant doit dégrader l'affichage, pas casser
 * l'écran d'accueil.
 */
export async function avanceesDesSeries(
  entrees: EntreeBibliotheque[]
): Promise<Map<number, AvanceeSerie>> {
  const series = entrees.filter((e) => e.type === 'serie');
  if (series.length === 0) return new Map();

  const vusBruts = await episodesVusParSerie().catch(() => new Map<number, EpisodeVu[]>());
  const vusParSerie = new Map<number, PositionEpisode[]>();
  for (const [serieId, liste] of vusBruts) {
    vusParSerie.set(
      serieId,
      liste.map((v: EpisodeVu) => ({ saison: v.saison, numero: v.numero }))
    );
  }

  const infos = new Map<number, InfosSerie>();
  await enParallele(series, 4, async (e) => {
    try {
      const details = await detailsTitre(e.tmdbId, 'serie');
      if (details.nombreEpisodes && details.saisons) {
        infos.set(e.tmdbId, {
          nombreEpisodes: details.nombreEpisodes,
          saisons: details.saisons,
        });
      }
    } catch {
      // Série introuvable ou réseau indisponible : pas d'avancement pour celle-ci.
    }
  });

  return fusionnerAvancees(vusParSerie, infos);
}
