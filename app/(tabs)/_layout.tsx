// =============================================================================
//  Layout des onglets (navigation adaptative)
//  ---------------------------------------------------------------------------
//  Cinq destinations : Accueil, Découvrir, Ma liste, Communauté, Profil.
//
//  Pourquoi « À venir » n'est plus un onglet : la barre plafonne à cinq (au-delà,
//  les libellés deviennent illisibles sur un téléphone), et le calendrier faisait
//  doublon avec le hero de l'Accueil, qui annonce déjà le prochain épisode. Il
//  reste à un appui, depuis l'Accueil. La Communauté, elle, a désormais un vrai
//  back-end : elle méritait sa place.
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
import { EtatPressable } from '@/types';
import {
  couleurs,
  espacements,
  familles,
  largeurRail,
  rayons,
  seuilLarge,
  typo,
} from '@/theme/theme';

/** Barre latérale (grand écran) : logo + destinations verticales. */
function BarreLaterale({ state, descriptors, navigation }: BottomTabBarProps) {
  const { accent, encre } = useVariante();
  const t = typo('desktop');

  return (
    <View style={styles.rail}>
      <View style={styles.railEnTete}>
        {/* Carré d'accent + wordmark : une icône générique ne fait pas une marque. */}
        <View style={[styles.logo, { backgroundColor: accent }]}>
          <Ionicons name="tv" size={17} color={encre} />
        </View>
        <Text style={styles.railLogo}>My Watch</Text>
      </View>

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const libelle = options.title ?? route.name;
        const actif = state.index === index;
        // L'état actif était un fond `surface2` sur `surface` : quatre points de
        // luminance, donc INVISIBLE. Le handoff dit : fond d'accent plein, texte
        // en encre d'accent.
        const couleur = actif ? encre : couleurs.ongletInactif;

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
            style={({ pressed, hovered }: EtatPressable) => [
              styles.railItem,
              actif && { backgroundColor: accent },
              hovered && !actif && { backgroundColor: couleurs.surface3 },
              pressed && { opacity: 0.85 },
            ]}
          >
            {options.tabBarIcon?.({ color: couleur, size: 21, focused: actif })}
            <Text style={[t.label, { color: couleur }]}>{libelle}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function LayoutOnglets() {
  const { accent } = useVariante();
  const { width } = useWindowDimensions();
  const grandEcran = width >= seuilLarge;

  return (
    <Tabs
      // Sur grand écran, on réserve la place de la barre latérale.
      sceneContainerStyle={
        grandEcran ? { paddingLeft: largeurRail, backgroundColor: couleurs.page } : undefined
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
        name="bibliotheque"
        options={{
          title: 'Ma liste',
          tabBarIcon: ({ color, size }) => <Ionicons name="library" color={color} size={size} />,
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
    width: largeurRail,
    // Plus sombre que la zone de contenu : la séparation se fait par la
    // luminance, pas par un trait.
    backgroundColor: couleurs.page,
    borderRightWidth: 1,
    borderRightColor: couleurs.bordure,
    paddingHorizontal: espacements.sm,
    paddingTop: espacements.l,
    gap: espacements.xs,
  },
  railEnTete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    paddingHorizontal: espacements.s,
    marginBottom: espacements.l,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: rayons.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLogo: {
    color: couleurs.texte,
    fontSize: 17,
    fontFamily: familles.extrabold,
    letterSpacing: -0.4,
  },
  railItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    height: 44,
    paddingHorizontal: espacements.sm,
    borderRadius: rayons.m,
    cursor: 'pointer',
  },
});
