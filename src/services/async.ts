// =============================================================================
//  Utilitaires asynchrones partagés
//  ---------------------------------------------------------------------------
//  Petites briques réutilisées par les imports (CSV, Trakt) : pause, ré-essais
//  avec délai croissant, et exécution par lots à concurrence bornée.
// =============================================================================

/** Attend `ms` millisecondes. */
export function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exécute une opération asynchrone en la relançant jusqu'à `tentatives` fois,
 * avec un délai croissant. Absorbe les hoquets réseau et les limitations de
 * débit ponctuelles, au lieu d'échouer au premier essai.
 */
export async function avecReessais<T>(operation: () => Promise<T>, tentatives = 3): Promise<T> {
  let derniereErreur: unknown;
  for (let essai = 0; essai < tentatives; essai++) {
    try {
      return await operation();
    } catch (e) {
      derniereErreur = e;
      if (essai < tentatives - 1) await attendre(400 * (essai + 1)); // 400 ms puis 800 ms
    }
  }
  throw derniereErreur;
}

/**
 * Traite les éléments par lots de `concurrence` en parallèle (fenêtre glissante).
 * Ne rejette pas globalement : c'est à `traiter` de gérer ses propres erreurs.
 * Utile pour accélérer un traitement sans saturer une API tierce.
 */
export async function enParallele<T>(
  elements: T[],
  concurrence: number,
  traiter: (element: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < elements.length; i += concurrence) {
    await Promise.all(elements.slice(i, i + concurrence).map(traiter));
  }
}
