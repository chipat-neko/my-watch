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
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { FournisseurAuth, useAuth } from '@/hooks/useAuth';
import { FournisseurVariante } from '@/hooks/useVariante';
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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.page } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      {/* La direction porte du sens : on entre dans un détail par la droite, on
          ouvre une modale par le bas. (Sans effet sur le web : react-native-web
          n'anime pas les transitions de native-stack.) */}
      <Stack.Screen
        name="titre/[id]"
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="import"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="trakt"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

/** Layout exporté : charge les polices, fournit variante + auth + zones sûres. */
export default function LayoutRacine() {
  const [policesChargees] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <FournisseurVariante>
        <FournisseurAuth>
          <StatusBar style="light" />
          {policesChargees ? (
            <Garde />
          ) : (
            <View style={{ flex: 1, backgroundColor: couleurs.fond }} />
          )}
        </FournisseurAuth>
      </FournisseurVariante>
    </SafeAreaProvider>
  );
}
