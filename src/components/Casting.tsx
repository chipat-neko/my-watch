// =============================================================================
//  Composant : Casting
//  ---------------------------------------------------------------------------
//  Les têtes d'affiche, en rail horizontal.
//
//  Une fiche sans visage est une fiche technique ; c'est le casting qui donne
//  envie de cliquer sur une série qu'on ne connaît pas. TV Time le met en avant,
//  My Watch ne l'affichait nulle part.
// =============================================================================

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Acteur } from '@/lib/tmdb';
import { IMG_BASE } from '@/theme/constantes';
import { couleurs, Densite, espacements, rayons, typo } from '@/theme/theme';

interface Props {
  acteurs: Acteur[];
  densite: Densite;
  padding: number;
}

export function Casting({ acteurs, densite, padding }: Props) {
  const t = typo(densite);
  if (acteurs.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.rail, { paddingRight: padding }]}
    >
      {acteurs.map((a) => (
        <View key={a.id} style={styles.personne}>
          {a.cheminPhoto ? (
            <Image
              // w185 : une photo de 72px en DPR 2 consomme 144px de bitmap.
              source={{ uri: `${IMG_BASE}w185${a.cheminPhoto}` }}
              style={styles.photo}
              contentFit="cover"
              transition={220}
              cachePolicy="memory-disk"
              accessible={false}
            />
          ) : (
            <View style={[styles.photo, styles.sansPhoto]}>
              <Ionicons name="person" size={24} color={couleurs.texteFaible} />
            </View>
          )}
          <Text style={[t.label, styles.nom]} numberOfLines={1}>
            {a.nom}
          </Text>
          {a.personnage ? (
            <Text style={[t.caption, styles.role]} numberOfLines={1}>
              {a.personnage}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { flexDirection: 'row', gap: espacements.m, paddingVertical: espacements.xs },
  // 96 et non 84 : en dessous, un nom sur deux est tronqué (« Bryan Cra… »).
  personne: { width: 96 },
  photo: {
    width: 96,
    height: 96,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.lisere,
  },
  sansPhoto: { alignItems: 'center', justifyContent: 'center' },
  // Hauteur figée : sans elle, un nom sur deux lignes décale toute la rangée.
  nom: { color: couleurs.texte, marginTop: espacements.s, textAlign: 'center' },
  role: { color: couleurs.texteFaible, textAlign: 'center', marginTop: 1 },
});
