// =============================================================================
//  Layout racine de l'application (Expo Router)
//  ---------------------------------------------------------------------------
//  C'est le point d'entrée : il englobe TOUTE l'app dans le fournisseur
//  d'authentification, puis oriente l'utilisateur :
//    - non connecté  -> écran de connexion (groupe "(auth)")
//    - connecté      -> onglets principaux  (groupe "(tabs)")
//
//  La redirection est gérée dans <Garde>, qui observe la session et les
//  "segments" de la route courante pour rediriger si besoin.
// =============================================================================

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FournisseurAuth, useAuth } from '@/hooks/useAuth';
import { couleurs } from '@/theme/theme';

/**
 * Composant interne qui applique la logique de redirection.
 * Il doit être rendu SOUS <FournisseurAuth> pour accéder à `useAuth`.
 */
function Garde() {
  const { utilisateur, chargement } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (chargement) return; // On attend de connaître l'état de connexion.

    const dansGroupeAuth = segments[0] === '(auth)';

    if (!utilisateur && !dansGroupeAuth) {
      // Pas connecté et hors de l'écran de connexion -> on y renvoie.
      router.replace('/(auth)/connexion');
    } else if (utilisateur && dansGroupeAuth) {
      // Connecté mais encore sur la connexion -> on va aux onglets.
      router.replace('/(tabs)');
    }
  }, [utilisateur, chargement, segments, router]);

  // Pendant la vérification initiale de la session, on affiche un loader.
  if (chargement) {
    return (
      <View style={{ flex: 1, backgroundColor: couleurs.fond, justifyContent: 'center' }}>
        <ActivityIndicator color={couleurs.accent} size="large" />
      </View>
    );
  }

  // Le <Stack> rend l'écran correspondant à la route courante.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fond } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="titre/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="import" options={{ presentation: 'modal' }} />
      <Stack.Screen name="trakt" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

/** Layout exporté : fournit le contexte d'auth et les zones sûres (encoches). */
export default function LayoutRacine() {
  return (
    <SafeAreaProvider>
      <FournisseurAuth>
        <StatusBar style="light" />
        <Garde />
      </FournisseurAuth>
    </SafeAreaProvider>
  );
}
