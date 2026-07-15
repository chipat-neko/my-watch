// =============================================================================
//  Calcul de l'avancement des séries (logique pure)
//  ---------------------------------------------------------------------------
//  Séparé de `progression.ts` — qui parle à Firestore et à TMDb — pour rester
//  testable sans réseau ni initialisation Firebase. Même découpage que
//  `traktMapping.ts` (pur) / `trakt.ts` (réseau).
// =============================================================================

import { SommaireSaison } from '@/types';
import { cle, PositionEpisode, prochainAVoir } from '@/services/prochainAVoir';

/** Où en est une série : avancement chiffré et prochain épisode à regarder. */
export interface AvanceeSerie {
  vus: number;
  total: number;
  /** Prochain épisode non vu, ou null si la série est à jour. */
  prochain: PositionEpisode | null;
  /** Structure de la série : permet de recalculer sans rappeler TMDb. */
  saisons: SommaireSaison[];
  /** Positions vues, en clés « saison:numero ». */
  vusCles: Set<string>;
}

/** Ce que l'on sait d'une série côté TMDb, pour le calcul d'avancement. */
export interface InfosSerie {
  nombreEpisodes: number;
  saisons: SommaireSaison[];
}

/**
 * Croise les épisodes vus (Firestore) et la structure de la série (TMDb).
 *
 * @param vusParSerie  Positions des épisodes vus, par identifiant de série.
 * @param infos        Structure des séries, par identifiant.
 */
export function fusionnerAvancees(
  vusParSerie: Map<number, PositionEpisode[]>,
  infos: Map<number, InfosSerie>
): Map<number, AvanceeSerie> {
  const avancees = new Map<number, AvanceeSerie>();

  for (const [serieId, info] of infos) {
    // Une série sans épisode diffusé n'a pas d'avancement affichable, et un
    // total à 0 produirait une division par zéro.
    if (info.nombreEpisodes <= 0) continue;

    const positions = vusParSerie.get(serieId) ?? [];
    const vusCles = new Set(positions.map((p) => cle(p.saison, p.numero)));

    avancees.set(serieId, {
      // Un import peut avoir enregistré plus d'épisodes que TMDb n'en déclare
      // (épisodes spéciaux) : on borne, sinon la barre déborde de son conteneur.
      vus: Math.min(vusCles.size, info.nombreEpisodes),
      total: info.nombreEpisodes,
      prochain: prochainAVoir(info.saisons, vusCles),
      saisons: info.saisons,
      vusCles,
    });
  }

  return avancees;
}

/**
 * Avancement recalculé après avoir marqué un épisode vu, SANS appel réseau.
 *
 * Sert à la mise à jour optimiste : la barre avance et la ligne annonce
 * l'épisode suivant tout de suite, au lieu d'attendre deux allers-retours
 * (TMDb puis Firestore).
 */
export function avanceeApresMarquage(
  avancee: AvanceeSerie,
  position: PositionEpisode
): AvanceeSerie {
  const vusCles = new Set(avancee.vusCles);
  vusCles.add(cle(position.saison, position.numero));
  return {
    ...avancee,
    vusCles,
    vus: Math.min(vusCles.size, avancee.total),
    prochain: prochainAVoir(avancee.saisons, vusCles),
  };
}
