// =============================================================================
//  Écran : Communauté (placeholder)
//  ---------------------------------------------------------------------------
//  Le handoff prévoit un fil d'actu social (amis, likes, recommandations). Ce
//  volet nécessite un back-end social (relations d'amitié, posts) que Firestore
//  n'expose pas encore côté My Watch : on affiche donc un écran « à venir »
//  honnête plutôt que des données factices.
// =============================================================================

import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVariante } from '@/hooks/useVariante';
import {
  conteneurs,
  couleurs,
  densiteDe,
  espacements,
  largeurRail,
  paddingEcran,
  rayons,
  seuilLarge,
  typo,
} from '@/theme/theme';

/** Ce qui arrivera ici, annoncé honnêtement plutôt que simulé. */
const A_VENIR = [
  { icone: 'people-outline', titre: 'Le fil de tes amis', sous: 'Ce qu’ils regardent, en direct.' },
  {
    icone: 'heart-outline',
    titre: 'Les « j’aime »',
    sous: 'Réagis aux épisodes qu’ils terminent.',
  },
  {
    icone: 'sparkles-outline',
    titre: 'Recommandations',
    sous: 'Des séries suggérées par tes proches, pas par un algorithme.',
  },
] as const;

export default function EcranCommunaute() {
  const { accent } = useVariante();
  const { width: fenetre } = useWindowDimensions();

  const grandEcran = fenetre >= seuilLarge;
  const largeurUtile = fenetre - (grandEcran ? largeurRail : 0);
  const d = densiteDe(largeurUtile);
  const t = typo(d);
  const padding = paddingEcran(largeurUtile);

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={[styles.conteneur, { paddingHorizontal: padding }]}>
        <Text style={[t.h1, styles.enTete]}>Communauté</Text>

        <View style={styles.centre}>
          <View style={[styles.rond, { borderColor: accent, backgroundColor: `${accent}14` }]}>
            <Ionicons name="people-outline" size={44} color={accent} />
          </View>
          <Text style={[t.overline, { color: accent, marginTop: espacements.l }]}>
            PROCHAINEMENT
          </Text>
          <Text style={[t.h2, { color: couleurs.texte, marginTop: espacements.xs }]}>
            Le volet social arrive
          </Text>
          <Text style={[t.body, styles.sous]}>
            My Watch n’a pas encore de back-end social. Plutôt que d’afficher de faux amis, cet
            onglet reste vide jusqu’à ce que ce soit vrai.
          </Text>

          <View style={styles.liste}>
            {A_VENIR.map((item) => (
              <View key={item.titre} style={styles.item}>
                <View style={styles.itemIcone}>
                  <Ionicons name={item.icone} size={19} color={accent} />
                </View>
                <View style={styles.itemTexte}>
                  <Text style={[t.h3, { color: couleurs.texte }]}>{item.titre}</Text>
                  <Text style={[t.caption, { color: couleurs.texteFaible, marginTop: 2 }]}>
                    {item.sous}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  conteneur: { flex: 1, width: '100%', maxWidth: conteneurs.standard, alignSelf: 'center' },
  enTete: { color: couleurs.texte, paddingTop: espacements.sm },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: espacements.xxl,
  },
  rond: {
    width: 96,
    height: 96,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sous: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.s,
    // ~65 caractères par ligne : au-delà, l'œil perd la ligne au retour chariot.
    maxWidth: 420,
  },
  liste: { marginTop: espacements.section, gap: espacements.sm, width: '100%', maxWidth: 420 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
    padding: espacements.m,
  },
  itemIcone: {
    width: 40,
    height: 40,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTexte: { flex: 1 },
});
