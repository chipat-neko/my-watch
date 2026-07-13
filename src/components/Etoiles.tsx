// =============================================================================
//  Composant : Etoiles
//  ---------------------------------------------------------------------------
//  Notation à 5 étoiles cliquables, réutilisée pour noter un titre ou un
//  épisode. En interne la note est sur /10 (comme la note TMDb et la colonne en
//  base) : chaque étoile vaut 2 points. Re-toucher l'étoile courante efface la
//  note.
// =============================================================================

import { Pressable, StyleSheet, View } from 'react-native';
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
        >
          <Ionicons
            name={i <= pleines ? 'star' : 'star-outline'}
            size={taille}
            color={couleurs.note}
            style={styles.etoile}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rangee: { flexDirection: 'row' },
  etoile: { marginRight: 2 },
});
