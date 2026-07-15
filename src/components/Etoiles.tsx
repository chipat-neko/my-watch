// =============================================================================
//  Composant : Etoiles
//  ---------------------------------------------------------------------------
//  Notation à 5 étoiles cliquables, réutilisée pour noter un titre ou un
//  épisode. En interne la note est sur /10 (comme la note TMDb et la colonne en
//  base) : chaque étoile vaut 2 points. Re-toucher l'étoile courante efface la
//  note.
//
//  Les étoiles sélectionnées « poppent » en cascade (40 ms d'écart) : noter est
//  une petite célébration. L'effacement, lui, se fait d'un bloc — effacer n'est
//  pas une célébration.
// =============================================================================

import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { couleurs } from '@/theme/theme';

interface Props {
  /** Note actuelle sur 10, ou null si non notée. */
  note: number | null;
  /** Appelé avec la nouvelle note sur 10 (ou null pour effacer). */
  onChange: (note: number | null) => void;
  /** Taille des icônes (par défaut 24). */
  taille?: number;
}

export function Etoiles({ note, onChange, taille = 24 }: Props) {
  // Nombre d'étoiles pleines (0..5) correspondant à la note /10.
  const pleines = note ? Math.round(note / 2) : 0;

  return (
    <View style={styles.rangee}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          // Re-toucher l'étoile courante efface la note ; sinon on note i*2 /10.
          onPress={() => onChange(i === pleines ? null : i * 2)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Noter ${i} étoile${i > 1 ? 's' : ''} sur 5`}
          accessibilityState={{ selected: i <= pleines }}
          style={styles.zone}
        >
          <Etoile pleine={i <= pleines} rang={i} taille={taille} />
        </Pressable>
      ))}
    </View>
  );
}

/** Une étoile, qui pousse en cascade quand elle devient pleine. */
function Etoile({ pleine, rang, taille }: { pleine: boolean; rang: number; taille: number }) {
  const echelle = useSharedValue(1);

  useEffect(() => {
    if (pleine) {
      // 40 ms par rang : c'est le milieu de la fenêtre 30-50 ms. Cinq étoiles →
      // 160 ms de cascade, au-delà cela traîne.
      echelle.value = withDelay(
        rang * 40,
        withSequence(
          withTiming(1.35, { duration: 90, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 9, stiffness: 300, reduceMotion: ReduceMotion.System })
        )
      );
    } else {
      echelle.value = withTiming(1, { duration: 120 });
    }
  }, [pleine, rang, echelle]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));

  return (
    <Animated.View style={style}>
      <Ionicons
        name={pleine ? 'star' : 'star-outline'}
        size={taille}
        color={pleine ? couleurs.note : couleurs.etoileVide}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rangee: { flexDirection: 'row', gap: 2 },
  zone: { cursor: 'pointer' },
});
