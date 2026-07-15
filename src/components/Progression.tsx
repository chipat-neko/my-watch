// =============================================================================
//  Composant : Progression
//  ---------------------------------------------------------------------------
//  Barre d'avancement d'une série (épisodes vus / total).
//
//  C'est LE signal « vivant » d'une application de suivi : sans elle, un mur
//  d'affiches n'est qu'un annuaire. Le token `couleurs.piste` existait dans le
//  thème depuis le début sans être utilisé nulle part.
// =============================================================================

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { couleurs, espacements, familles, rayons } from '@/theme/theme';

interface Props {
  /** Nombre d'épisodes vus. */
  vus: number;
  /** Nombre total d'épisodes. */
  total: number;
  /** Couleur de remplissage (accent de la variante). */
  accent: string;
  /** Affiche le libellé « 12/24 ép. » sous la barre. */
  libelle?: boolean;
  /** Épaisseur de la barre (3 collée à une affiche, 4 dans une ligne). */
  epaisseur?: number;
}

export function Progression({ vus, total, accent, libelle = false, epaisseur = 4 }: Props) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, vus / total)) : 0;
  const mouvementReduit = useReducedMotion();
  const avancee = useSharedValue(0);

  // La barre se remplit à l'arrivée : une barre qui apparaît déjà pleine ne
  // raconte rien, une barre qui se remplit dit « tu as avancé ».
  useEffect(() => {
    avancee.value = withTiming(ratio, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [ratio, avancee]);

  const styleRemplissage = useAnimatedStyle(() => ({
    width: `${(mouvementReduit ? ratio : avancee.value) * 100}%`,
  }));

  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: vus }}>
      <View style={[styles.piste, { height: epaisseur }]}>
        <Animated.View
          style={[styles.remplissage, { backgroundColor: accent }, styleRemplissage]}
        />
      </View>
      {libelle ? (
        <Text style={styles.libelle}>
          {vus}/{total} ép.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  piste: {
    backgroundColor: couleurs.piste,
    borderRadius: rayons.rond,
    overflow: 'hidden',
    width: '100%',
  },
  remplissage: { height: '100%', borderRadius: rayons.rond },
  libelle: {
    color: couleurs.texteFaible,
    fontFamily: familles.semibold,
    fontSize: 11,
    letterSpacing: 0.3,
    marginTop: espacements.xs,
    // Chiffres à chasse fixe : sans ça, le compteur saute à chaque mise à jour.
    fontVariant: ['tabular-nums'],
  },
});
