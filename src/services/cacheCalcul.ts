// =============================================================================
//  Cache : politique de péremption (logique pure)
//  ---------------------------------------------------------------------------
//  Séparé de `cache.ts` — qui touche au stockage — pour rester testable.
// =============================================================================

/** Une valeur mise en cache, avec sa date de dépôt. */
export interface EntreeCache<T> {
  valeur: T;
  /** Millisecondes depuis l'époque. */
  depose: number;
}

/** Durées de vie, en millisecondes. */
export const DUREES = {
  /**
   * Détails TMDb (saisons, nombre d'épisodes, backdrop…) : 24 h.
   *
   * Une série ne gagne pas une saison dans la journée. C'est LA donnée la plus
   * coûteuse de l'application — un appel réseau par série suivie, à chaque
   * ouverture d'écran — et la plus stable. Le rapport gain/risque est sans
   * commune mesure avec le reste.
   */
  detailsTmdb: 24 * 60 * 60 * 1000,
  /**
   * Bibliothèque : 30 secondes.
   *
   * Assez pour couvrir une navigation entre écrans (l'Accueil, Ma liste et le
   * Profil la relisent chacun), trop court pour qu'une modification faite sur un
   * autre appareil passe inaperçue. Toute écriture l'invalide de toute façon.
   */
  bibliotheque: 30 * 1000,
} as const;

/**
 * Une entrée est-elle encore valable ?
 *
 * Tolère une horloge qui recule (changement de fuseau, synchronisation NTP) :
 * une entrée « déposée dans le futur » est considérée périmée plutôt que
 * valable pour l'éternité.
 */
export function estValide<T>(entree: EntreeCache<T> | null, duree: number, maintenant: number) {
  if (!entree) return false;
  const age = maintenant - entree.depose;
  return age >= 0 && age < duree;
}
