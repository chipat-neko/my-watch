// =============================================================================
//  Stockage sécurisé (mobile)
//  ---------------------------------------------------------------------------
//  Enveloppe expo-secure-store (trousseau / keystore du téléphone) derrière une
//  petite API commune. Sur le web, c'est le fichier `.web.ts` qui est utilisé
//  automatiquement par Metro (localStorage).
// =============================================================================

import * as SecureStore from 'expo-secure-store';

export const getItem = (cle: string): Promise<string | null> => SecureStore.getItemAsync(cle);
export const setItem = (cle: string, valeur: string): Promise<void> =>
  SecureStore.setItemAsync(cle, valeur);
export const supprimerItem = (cle: string): Promise<void> => SecureStore.deleteItemAsync(cle);
