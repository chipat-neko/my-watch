// =============================================================================
//  Calcul de l'avancement des séries (logique pure)
//  ---------------------------------------------------------------------------
//  Séparé de `progression.ts` — qui parle à Firestore et à TMDb — pour rester
//  testable sans réseau ni initialisation Firebase. Même découpage que
//  `traktMapping.ts` (pur) / `trakt.ts` (réseau).
// =============================================================================

/** Avancement d'une série : épisodes vus sur total diffusé. */
export interface AvanceeSerie {
  vus: number;
  total: number;
}

/**
 * Fusionne les épisodes vus (Firestore) et le nombre total d'épisodes (TMDb).
 *
 * @param comptes  Épisodes marqués comme vus, par identifiant de série.
 * @param totaux   Nombre d'épisodes diffusés selon TMDb, par identifiant de série.
 */
export function fusionnerAvancees(
  comptes: Map<number, number>,
  totaux: Map<number, number>
): Map<number, AvanceeSerie> {
  const avancees = new Map<number, AvanceeSerie>();
  for (const [serieId, total] of totaux) {
    // Une série sans épisode diffusé n'a pas de progression affichable, et un
    // total à 0 produirait une division par zéro.
    if (total <= 0) continue;
    const vus = comptes.get(serieId) ?? 0;
    // Un import peut avoir enregistré plus d'épisodes que TMDb n'en déclare
    // (épisodes spéciaux) : on borne, sinon la barre déborde de son conteneur.
    avancees.set(serieId, { vus: Math.min(vus, total), total });
  }
  return avancees;
}
