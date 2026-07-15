// =============================================================================
//  Composant : CarteMosaique (apparence « Grille »)
//  ---------------------------------------------------------------------------
//  L'affiche porte TOUT : l'épisode à regarder, l'avancement, la coche « vu ».
//  Aucun texte sous l'image.
//
//  C'est la différence de fond avec l'apparence « Classique » : là où celle-ci
//  raconte (un grand hero, des sections, des libellés), celle-ci donne un mur
//  d'affiches à balayer. Le texte y est un overlay, pas une légende — on accepte
//  de masquer un peu l'artwork en échange d'une densité bien plus forte.
// =============================================================================

import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvanceeSerie } from '@/services/progressionCalcul';
import { urlAffiche } from '@/theme/constantes';
import { EntreeBibliotheque, EtatPressable } from '@/types';
import { couleurs, espacements, fondus, rayons } from '@/theme/theme';

interface Props {
  entree: EntreeBibliotheque;
  avancee?: AvanceeSerie;
  largeur: number;
  accent: string;
  /** Marque l'affiche d'une coche (titre terminé). */
  vu?: boolean;
  onPress: () => void;
}

export function CarteMosaique({ entree, avancee, largeur, accent, vu = false, onPress }: Props) {
  const hauteur = Math.round(largeur * 1.5);
  const uri = urlAffiche(entree.cheminAffiche, largeur <= 190 ? 'w342' : 'w500');
  const prochain = avancee?.prochain;
  const ratio = avancee && avancee.total > 0 ? avancee.vus / avancee.total : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        prochain
          ? `${entree.titre}, à regarder saison ${prochain.saison} épisode ${prochain.numero}`
          : entree.titre
      }
      style={({ hovered, pressed }: EtatPressable) => [
        styles.cadre,
        { width: largeur, height: hauteur },
        hovered && { borderColor: `${accent}80`, transform: [{ translateY: -4 }] },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.absente]}>
          <Text style={styles.absenteTexte} numberOfLines={3}>
            {entree.titre}
          </Text>
        </View>
      )}

      {/* Scrim sur le tiers bas seulement : le haut de l'affiche reste intact. */}
      <LinearGradient
        colors={[...fondus.affiche]}
        locations={[...fondus.positionsAffiche]}
        style={styles.scrim}
        pointerEvents="none"
      />

      {vu ? (
        <View style={[styles.coche, { borderColor: accent, backgroundColor: `${accent}29` }]}>
          <Ionicons name="checkmark" size={12} color={accent} />
        </View>
      ) : null}

      <View style={styles.bas}>
        <Text style={styles.titre} numberOfLines={1}>
          {entree.titre}
        </Text>
        {prochain ? (
          <Text style={[styles.episode, { color: accent }]}>
            S{prochain.saison} E{prochain.numero}
          </Text>
        ) : avancee ? (
          <Text style={styles.episode}>À jour</Text>
        ) : null}
      </View>

      {/* Barre collée au bord, sans rayon : un arrondi sur 3px de haut se lit mal. */}
      {avancee && avancee.total > 0 ? (
        <View style={styles.piste}>
          <View
            style={[styles.remplissage, { backgroundColor: accent, width: `${ratio * 100}%` }]}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cadre: {
    borderRadius: rayons.m,
    overflow: 'hidden',
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.lisere,
    justifyContent: 'flex-end',
    cursor: 'pointer',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  absente: { alignItems: 'center', justifyContent: 'center', padding: espacements.s },
  absenteTexte: {
    color: couleurs.texteDoux,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  coche: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bas: { padding: espacements.s, paddingBottom: espacements.sm },
  titre: {
    color: couleurs.texte,
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  episode: {
    color: couleurs.texteDoux,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  piste: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: couleurs.piste,
  },
  remplissage: { height: '100%' },
});
