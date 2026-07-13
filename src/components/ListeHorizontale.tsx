// =============================================================================
//  Composant : ListeHorizontale
//  ---------------------------------------------------------------------------
//  Une rangée horizontale défilante de titres, précédée d'un intitulé de
//  section (ex : "Tendances de la semaine"). Utilisée sur l'écran Accueil.
// =============================================================================

import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Titre } from '@/types';
import { CartePoster } from './CartePoster';
import { couleurs, espacements, polices } from '@/theme/theme';

interface Props {
  titreSection: string;
  donnees: Titre[];
  /** Appelé quand on tape sur une carte, avec le titre concerné. */
  onPressTitre: (titre: Titre) => void;
}

export function ListeHorizontale({ titreSection, donnees, onPressTitre }: Props) {
  if (donnees.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.titreSection}>{titreSection}</Text>
      <FlatList
        data={donnees}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.liste}
        renderItem={({ item }) => <CartePoster titre={item} onPress={() => onPressTitre(item)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: espacements.l,
  },
  titreSection: {
    color: couleurs.texte,
    fontSize: polices.titre,
    fontWeight: '700',
    marginBottom: espacements.m,
    paddingHorizontal: espacements.m,
  },
  liste: {
    paddingHorizontal: espacements.m,
  },
});
