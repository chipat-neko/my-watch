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
import { DUREE_EPISODE_DEFAUT, DureeTitre, minutesTotales } from '@/services/tempsCalcul';
import { EntreeBibliotheque, EpisodeVu } from '@/types';

export type { AvanceeSerie };

/**
 * Temps de visionnage estimé, en minutes.
 *
 * ESTIMATION assumée : TMDb ne donne pas la durée réelle de chaque épisode vu,
 * seulement une durée type par série. L'interface doit donc afficher
 * « environ » — un chiffre à la minute près serait un mensonge.
 *
 * Coûteux (un appel TMDb par titre suivi) : à charger en arrière-plan, jamais
 * en bloquant un écran.
 */
export async function tempsDeVisionnage(entrees: EntreeBibliotheque[]): Promise<number> {
  if (entrees.length === 0) return 0;

  const vusBruts = await episodesVusParSerie().catch(() => new Map<number, EpisodeVu[]>());
  const durees: DureeTitre[] = [];

  await enParallele(entrees, 4, async (e) => {
    try {
      const details = await detailsTitre(e.tmdbId, e.type);
      if (e.type === 'film') {
        // Un film ne compte que s'il a été vu : l'avoir en watchlist ne fait
        // pas passer le temps.
        durees.push({
          duree: details.duree ?? 0,
          unitesVues: e.statut === 'termine' ? 1 : 0,
        });
      } else {
        const vus = vusBruts.get(e.tmdbId)?.length ?? 0;
        durees.push({ duree: details.duree ?? DUREE_EPISODE_DEFAUT, unitesVues: vus });
      }
    } catch {
      // Titre introuvable ou réseau indisponible : on l'omet du total plutôt
      // que d'inventer une durée.
    }
  });

  return minutesTotales(durees);
}

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
          cheminFond: details.cheminFond,
        });
      }
    } catch {
      // Série introuvable ou réseau indisponible : pas d'avancement pour celle-ci.
    }
  });

  return fusionnerAvancees(vusParSerie, infos);
}
