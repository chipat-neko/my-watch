// =============================================================================
//  Layout des onglets (barre de navigation du bas)
//  ---------------------------------------------------------------------------
//  Cinq onglets (handoff « TV Time ») : Accueil, Découvrir, À venir,
//  Communauté, Profil. La couleur de l'onglet actif suit la variante choisie
//  par l'utilisateur (turquoise / bleu / rose).
// =============================================================================

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, familles } from '@/theme/theme';

export default function LayoutOnglets() {
  const { accent } = useVariante();

  return (
    <Tabs
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
