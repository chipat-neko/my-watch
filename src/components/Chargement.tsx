// =============================================================================
//  Composant : Chargement
//  ---------------------------------------------------------------------------
//  Indicateur de chargement centré, pour les attentes dont on ne connaît NI la
//  durée NI la forme du résultat (session, authentification).
//
//  Partout où la forme du contenu est connue d'avance, préférer `Squelette` :
//  un spinner dit « attends », un squelette dit « voilà ce qui arrive ».
// =============================================================================

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, polices } from '@/theme/theme';

export function Chargement({ message }: { message?: string }) {
  // L'accent était figé en turquoise : le spinner restait donc turquoise même
  // en variante bleue ou rose.
  const { accent } = useVariante();

  return (
    <View style={styles.conteneur}>
      <ActivityIndicator color={accent} size="large" />
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
    backgroundColor: couleurs.fond,
  },
  message: {
    color: couleurs.texteDoux,
    marginTop: espacements.m,
    fontSize: polices.normale,
    fontFamily: familles.medium,
  },
});
