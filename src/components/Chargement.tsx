// =============================================================================
//  Composant : Chargement
//  ---------------------------------------------------------------------------
//  Petit indicateur de chargement centré, réutilisé pendant les appels réseau
//  (TMDb, Supabase). Optionnellement accompagné d'un message.
// =============================================================================

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { couleurs, espacements, polices } from '@/theme/theme';

export function Chargement({ message }: { message?: string }) {
  return (
    <View style={styles.conteneur}>
      <ActivityIndicator color={couleurs.accent} size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacements.l,
  },
  message: {
    color: couleurs.texteDoux,
    marginTop: espacements.m,
    fontSize: polices.normale,
  },
});
