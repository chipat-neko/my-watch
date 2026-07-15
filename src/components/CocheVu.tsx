// =============================================================================
//  Composant : CocheVu
//  ---------------------------------------------------------------------------
//  La case « épisode vu » — le geste le plus répété de toute l'application.
//
//  Il changeait d'icône instantanément : zéro récompense pour l'action centrale
//  du produit. Un changement de couleur se lit comme un ÉTAT ; un ressort avec
//  dépassement se lit comme un ÉVÉNEMENT. C'est toute la différence entre une
//  case à cocher et le plaisir de cocher.
// =============================================================================

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, rayons } from '@/theme/theme';

interface Props {
  vu: boolean;
  accent: string;
  taille?: number;
}

export function CocheVu({ vu, accent, taille = 24 }: Props) {
  const echelle = useSharedValue(1);
  const halo = useSharedValue(0);

  useEffect(() => {
    if (vu) {
      // Le dépassement à 1,3 lit comme une confirmation physique.
      echelle.value = withSequence(
        withTiming(1.3, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 8, stiffness: 220, mass: 0.6, reduceMotion: ReduceMotion.System })
      );
      halo.value = 0;
      halo.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else {
      // Décocher n'est pas une célébration : pas de halo, et une sortie à ~55 %
      // de la durée d'entrée.
      echelle.value = withTiming(1, { duration: 140 });
      halo.value = 0;
    }
  }, [vu, echelle, halo]);

  const styleIcone = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  const styleHalo = useAnimatedStyle(() => ({
    opacity: (1 - halo.value) * 0.5,
    transform: [{ scale: 0.6 + halo.value * 1.2 }],
  }));

  return (
    <View style={[styles.zone, { width: taille, height: taille }]}>
      <Animated.View
        style={[styles.halo, { backgroundColor: accent }, styleHalo]}
        pointerEvents="none"
      />
      <Animated.View style={styleIcone}>
        <Ionicons
          name={vu ? 'checkmark-circle' : 'ellipse-outline'}
          size={taille}
          color={vu ? accent : couleurs.texteFaible}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { alignItems: 'center', justifyContent: 'center' },
  halo: { ...StyleSheet.absoluteFillObject, borderRadius: rayons.rond },
});
