// =============================================================================
//  Composant : Squelette (skeleton shimmer)
//  ---------------------------------------------------------------------------
//  Remplace les spinners plein écran. Un spinner dit « attends » ; un squelette
//  dit « voilà ce qui arrive ». La règle : il doit PRÉFIGURER la géométrie
//  réelle du contenu — un squelette qui ne correspond pas au layout final
//  provoque un saut au remplissage, ce qui est pire que le spinner.
// =============================================================================

import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { couleurs, espacements, rayons } from '@/theme/theme';

interface Props {
  largeur: number | `${number}%`;
  hauteur: number;
  rayon?: number;
  style?: ViewStyle;
}

/** Un bloc gris animé d'un balayage lumineux. */
export function Squelette({ largeur, hauteur, rayon = rayons.m, style }: Props) {
  // Une animation en boucle infinie est le pire cas pour une personne sensible
  // au mouvement : ici, on la coupe entièrement.
  const mouvementReduit = useReducedMotion();
  const x = useSharedValue(-1);

  useEffect(() => {
    if (mouvementReduit) return;
    // 1100 ms : en dessous de 800 ça vibre, au-dessus de 1500 ça a l'air planté.
    // Pas de `reverse` : la bande repart de gauche, elle ne fait pas l'essuie-glace.
    x.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [mouvementReduit, x]);

  const styleBande = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * (typeof largeur === 'number' ? largeur : 300) * 1.5 }],
  }));

  return (
    <View
      style={[styles.base, { width: largeur, height: hauteur, borderRadius: rayon }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {mouvementReduit ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, styleBande]}>
          <LinearGradient
            // Pas plus de 0.06 : sur un fond aussi sombre, au-delà ça devient un strobe.
            colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/** Grille de squelettes d'affiches, aux dimensions réelles des cartes. */
export function GrilleSquelettes({
  colonnes,
  largeur,
  lignes = 2,
  gap,
}: {
  colonnes: number;
  largeur: number;
  lignes?: number;
  gap: number;
}) {
  const hauteur = Math.round(largeur * 1.5);
  return (
    <View style={[styles.grille, { gap }]}>
      {Array.from({ length: colonnes * lignes }, (_, i) => (
        <View key={i}>
          <Squelette largeur={largeur} hauteur={hauteur} rayon={rayons.m} />
          <Squelette
            largeur={Math.round(largeur * 0.7)}
            hauteur={12}
            rayon={rayons.s}
            style={{ marginTop: espacements.s }}
          />
        </View>
      ))}
    </View>
  );
}

/** Squelettes de lignes (calendrier, liste « Reprendre »). */
export function LignesSquelettes({ nombre = 4 }: { nombre?: number }) {
  return (
    <View style={{ gap: espacements.sm }}>
      {Array.from({ length: nombre }, (_, i) => (
        <View key={i} style={styles.ligne}>
          <Squelette largeur={54} hauteur={80} rayon={rayons.s} />
          <View style={styles.ligneTexte}>
            <Squelette largeur="60%" hauteur={16} rayon={rayons.s} />
            <Squelette largeur="40%" hauteur={12} rayon={rayons.s} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: couleurs.surface2, overflow: 'hidden' },
  grille: { flexDirection: 'row', flexWrap: 'wrap' },
  ligne: {
    flexDirection: 'row',
    gap: espacements.m,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
    padding: espacements.s,
  },
  ligneTexte: { flex: 1, justifyContent: 'center', gap: espacements.s },
});
