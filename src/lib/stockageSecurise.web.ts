// =============================================================================
//  Stockage sécurisé (web)
//  ---------------------------------------------------------------------------
//  Sur le navigateur, il n'y a pas de trousseau natif : on se rabat sur
//  localStorage. Même API que la version mobile (stockageSecurise.ts).
// =============================================================================

export const getItem = async (cle: string): Promise<string | null> => localStorage.getItem(cle);

export const setItem = async (cle: string, valeur: string): Promise<void> => {
  localStorage.setItem(cle, valeur);
};

export const supprimerItem = async (cle: string): Promise<void> => {
  localStorage.removeItem(cle);
};
