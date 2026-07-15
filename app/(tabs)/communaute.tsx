// =============================================================================
//  Écran : Communauté (placeholder)
//  ---------------------------------------------------------------------------
//  Le handoff prévoit un fil d'actu social (amis, likes, recommandations). Ce
//  volet nécessite un back-end social (relations d'amitié, posts) que Firestore
//  n'expose pas encore côté My Watch : on affiche donc un écran « à venir »
//  honnête plutôt que des données factices.
// =============================================================================

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, maxLargeur, polices } from '@/theme/theme';

export default function EcranCommunaute() {
  const { accent } = useVariante();

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <Text style={styles.enTete}>Communauté</Text>
      <View style={styles.centre}>
        <View style={[styles.rond, { borderColor: accent }]}>
          <Ionicons name="people-outline" size={48} color={accent} />
        </View>
        <Text style={styles.titre}>Bientôt disponible</Text>
        <Text style={styles.sous}>
          Le fil d'actu de tes amis, les « j'aime » et les recommandations sociales arrivent dans
          une prochaine version.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
    width: '100%',
    maxWidth: maxLargeur,
    alignSelf: 'center',
  },
  enTete: {
    color: couleurs.texte,
    fontSize: polices.grandTitre,
    fontFamily: familles.extrabold,
    paddingHorizontal: espacements.l,
    paddingTop: espacements.m,
  },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacements.xl },
  rond: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.l,
  },
  titre: {
    color: couleurs.texte,
    fontSize: polices.titre,
    fontFamily: familles.bold,
    marginBottom: espacements.s,
  },
  sous: {
    color: couleurs.texteDoux,
    fontSize: polices.normale,
    fontFamily: familles.medium,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
});
