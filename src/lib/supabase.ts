// =============================================================================
//  Client Supabase
//  ---------------------------------------------------------------------------
//  Supabase est notre "back-end" : il fournit la base de données PostgreSQL,
//  l'authentification (email/mot de passe) et la synchronisation entre les
//  appareils de l'utilisateur.
//
//  Ce module crée UNE seule instance du client, partagée dans toute l'app.
//  La session est persistée de façon sécurisée avec expo-secure-store afin
//  que l'utilisateur reste connecté d'un lancement à l'autre.
// =============================================================================

import 'react-native-url-polyfill/auto'; // Polyfill requis par supabase-js sur React Native
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// --- Lecture des variables d'environnement (voir le fichier .env) ------------
const urlSupabase = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cleAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!urlSupabase || !cleAnon) {
  // On avertit clairement le développeur si la configuration manque.
  console.warn(
    '[My Watch] Variables Supabase manquantes. Copie .env.example en .env et remplis les valeurs.'
  );
}

/**
 * Adaptateur de stockage sécurisé.
 * Supabase a besoin d'un endroit où enregistrer le jeton de session ;
 * on utilise le trousseau/keystore du téléphone via expo-secure-store.
 */
const stockageSecurise = {
  getItem: (cle: string) => SecureStore.getItemAsync(cle),
  setItem: (cle: string, valeur: string) => SecureStore.setItemAsync(cle, valeur),
  removeItem: (cle: string) => SecureStore.deleteItemAsync(cle),
};

/** Instance unique du client Supabase, à importer partout dans l'app. */
export const supabase = createClient(urlSupabase ?? '', cleAnon ?? '', {
  auth: {
    storage: stockageSecurise,
    autoRefreshToken: true, // Rafraîchit automatiquement le jeton avant expiration
    persistSession: true, // Garde l'utilisateur connecté
    detectSessionInUrl: false, // Inutile en mobile (utile seulement sur le web)
  },
});
