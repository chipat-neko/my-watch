// =============================================================================
//  Layout des onglets (navigation adaptative)
//  ---------------------------------------------------------------------------
//  Cinq destinations (handoff « TV Time ») : Accueil, Découvrir, À venir,
//  Communauté, Profil.
//
//  Navigation ADAPTATIVE (règle Material Adaptive / handoff web) :
//    - petit écran (< 1024px) -> barre d'onglets en bas (mobile)
//    - grand écran (>= 1024px) -> barre LATÉRALE à gauche (desktop/web)
//  Sans ça, une barre d'onglets mobile collée en bas d'un écran large donne
//  l'impression d'une app mobile étirée.
//
//  La couleur active suit la variante choisie (turquoise / bleu / rose).
// =============================================================================

import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, polices, rayons } from '@/theme/theme';

/** Largeur de la barre latérale sur grand écran. */
const LARGEUR_RAIL = 232;
/** Seuil au-delà duquel on passe en barre latérale (Material Adaptive). */
const SEUIL_LARGE = 1024;

/** Barre latérale (grand écran) : logo + destinations verticales. */
function BarreLaterale({ state, descriptors, navigation }: BottomTabBarProps) {
  const { accent } = useVariante();

  return (
    <View style={styles.rail}>
      <View style={styles.railEnTete}>
        <Ionicons name="tv" size={22} color={accent} />
        <Text style={styles.railLogo}>My Watch</Text>
      </View>

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const libelle = options.title ?? route.name;
        const actif = state.index === index;
        const couleur = actif ? accent : couleurs.ongletInactif;

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const evenement = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!actif && !evenement.defaultPrevented) navigation.navigate(route.name);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: actif }}
            accessibilityLabel={libelle}
            // Feedback au survol/press : une UI sans état pressé fait "figée".
            style={({ pressed, hovered }: any) => [
              styles.railItem,
              actif && { backgroundColor: couleurs.surface2 },
              (pressed || hovered) && !actif && { backgroundColor: couleurs.surface },
              pressed && { opacity: 0.85 },
            ]}
          >
            {options.tabBarIcon?.({ color: couleur, size: 22, focused: actif })}
            <Text style={[styles.railTexte, { color: couleur }]}>{libelle}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function LayoutOnglets() {
  const { accent } = useVariante();
  const { width } = useWindowDimensions();
  const grandEcran = width >= SEUIL_LARGE;

  return (
    <Tabs
      // Sur grand écran, on réserve la place de la barre latérale.
      sceneContainerStyle={
        grandEcran ? { paddingLeft: LARGEUR_RAIL, backgroundColor: couleurs.fond } : undefined
      }
      tabBar={(props) => (grandEcran ? <BarreLaterale {...props} /> : <BottomTabBar {...props} />)}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: couleurs.ongletInactif,
        tabBarStyle: {
          backgroundColor: couleurs.surface,
          borderTopColor: couleurs.bordure,
        },
        tabBarLabelStyle: { fontFamily: familles.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="decouvrir"
        options={{
          title: 'Découvrir',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendrier"
        options={{
          title: 'À venir',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="communaute"
        options={{
          title: 'Communauté',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: LARGEUR_RAIL,
    backgroundColor: couleurs.surface,
    borderRightWidth: 1,
    borderRightColor: couleurs.bordure,
    paddingHorizontal: espacements.m,
    paddingTop: espacements.l,
    gap: 4,
  },
  railEnTete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    paddingHorizontal: espacements.s,
    marginBottom: espacements.l,
  },
  railLogo: { color: couleurs.texte, fontSize: polices.moyenne, fontFamily: familles.extrabold },
  railItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    paddingVertical: espacements.m,
    paddingHorizontal: espacements.m,
    borderRadius: rayons.m,
  },
  railTexte: { fontSize: polices.normale, fontFamily: familles.semibold },
});
