// =============================================================================
//  Composant : CartePoster
//  ---------------------------------------------------------------------------
//  Affiche l'affiche d'un titre (film/série) sous forme de carte cliquable.
//  Réutilisé dans les listes horizontales, la recherche et la bibliothèque.
// =============================================================================

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Titre } from '@/types';
import { urlAffiche } from '@/theme/constantes';
import { couleurs, espacements, polices, rayons } from '@/theme/theme';

interface Props {
  titre: Titre;
  /** Largeur de la carte (par défaut 120). */
  largeur?: number;
  /** Action au clic (généralement : ouvrir l'écran de détail). */
  onPress?: () => void;
}

export function CartePoster({ titre, largeur = 120, onPress }: Props) {
  const uri = urlAffiche(titre.cheminAffiche, 'w342');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titre.titre}, ${titre.type === 'film' ? 'film' : 'série'}`}
      style={[styles.conteneur, { width: largeur }]}
    >
      {/* Affiche, ou un cadre gris si l'image est absente. */}
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.affiche, { width: largeur, height: largeur * 1.5 }]}
        />
      ) : (
        <View
          style={[
            styles.affiche,
            styles.affichePlaceholder,
            { width: largeur, height: largeur * 1.5 },
          ]}
        >
          <Text style={styles.placeholderTexte}>Pas d'affiche</Text>
        </View>
      )}

      {/* Pastille indiquant film ou série. */}
      <View style={styles.badge}>
        <Text style={styles.badgeTexte}>{titre.type === 'film' ? 'Film' : 'Série'}</Text>
      </View>

      <Text numberOfLines={2} style={styles.titre}>
        {titre.titre}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    marginRight: espacements.m,
  },
  affiche: {
    borderRadius: rayons.m,
    backgroundColor: couleurs.surface2,
  },
  affichePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTexte: {
    color: couleurs.texteDoux,
    fontSize: polices.petite,
  },
  badge: {
    position: 'absolute',
    top: espacements.s,
    left: espacements.s,
    backgroundColor: 'rgba(14,14,26,0.8)',
    paddingHorizontal: espacements.s,
    paddingVertical: 2,
    borderRadius: rayons.s,
  },
  badgeTexte: {
    color: couleurs.texte,
    fontSize: polices.petite,
    fontWeight: '600',
  },
  titre: {
    color: couleurs.texte,
    fontSize: polices.normale,
    marginTop: espacements.s,
    fontWeight: '500',
  },
});
