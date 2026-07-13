// =============================================================================
//  Layout des onglets (barre de navigation du bas)
//  ---------------------------------------------------------------------------
//  Définit les cinq onglets principaux de l'app et leurs icônes.
//  Chaque onglet correspond à un fichier du dossier app/(tabs)/.
// =============================================================================

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { couleurs } from '@/theme/theme';

export default function LayoutOnglets() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Couleurs de la barre d'onglets.
        tabBarActiveTintColor: couleurs.accent,
        tabBarInactiveTintColor: couleurs.texteDoux,
        tabBarStyle: {
          backgroundColor: couleurs.surface,
          borderTopColor: couleurs.bordure,
        },
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
        name="recherche"
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
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
        name="maliste"
        options={{
          title: 'Ma liste',
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" color={color} size={size} />,
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
