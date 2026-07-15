// =============================================================================
//  Service "Progression"
//  ---------------------------------------------------------------------------
//  Calcule l'avancement des séries en cours : épisodes vus / total diffusé.
//
//  Sans ce chiffre, l'application est un annuaire d'affiches ; avec lui, elle
//  devient un outil de suivi. C'est la seule donnée qui dit à l'utilisateur
//  « où tu en es ».
//
//  Le calcul lui-même vit dans `progressionCalcul.ts` (pur, testé) ; ici, on ne
//  fait que rassembler les données.
// =============================================================================

import { comptesEpisodesVus } from '@/services/bibliotheque';
import { detailsTitre } from '@/lib/tmdb';
import { enParallele } from '@/services/async';
import { AvanceeSerie, fusionnerAvancees } from '@/services/progressionCalcul';
import { EntreeBibliotheque } from '@/types';

export type { AvanceeSerie };

/**
 * Progression des séries fournies. Une seule lecture Firestore pour tous les
 * épisodes vus, puis un appel TMDb par série (4 en parallèle au plus, pour ne
 * pas saturer l'API).
 *
 * Ne lève jamais : une progression manquante doit dégrader l'affichage, pas
 * casser l'écran d'accueil.
 */
export async function avanceesDesSeries(
  entrees: EntreeBibliotheque[]
): Promise<Map<number, AvanceeSerie>> {
  const series = entrees.filter((e) => e.type === 'serie');
  if (series.length === 0) return new Map();

  const comptes = await comptesEpisodesVus().catch(() => new Map<number, number>());
  const totaux = new Map<number, number>();

  await enParallele(series, 4, async (e) => {
    try {
      const details = await detailsTitre(e.tmdbId, 'serie');
      if (details.nombreEpisodes) totaux.set(e.tmdbId, details.nombreEpisodes);
    } catch {
      // Série introuvable ou réseau indisponible : pas de barre pour celle-ci.
    }
  });

  return fusionnerAvancees(comptes, totaux);
}
