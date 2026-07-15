// =============================================================================
//  Disposition « Social » de l'accueil
//  ---------------------------------------------------------------------------
//  Un fil vertical de grandes cartes 16:9, une série à la fois.
//
//  Le handoff prévoyait ici le fil des amis. Cela demande un back-end de
//  relations et de publications que My Watch n'a pas — et inventer de faux amis
//  serait pire que de ne rien montrer. L'apparence devient donc un fil
//  d'activité PERSONNEL, avec la même honnêteté : ce sont tes séries, racontées
//  une par une, image en grand, action à portée de pouce.
//
//  C'est l'exact opposé de l'apparence « Grille » : celle-ci montre trente
//  affiches à balayer, celle-là en montre trois à lire.
// =============================================================================

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CarteFil } from '@/components/accueil/CarteFil';
import { AvanceeSerie } from '@/services/progressionCalcul';
import { PositionEpisode } from '@/services/prochainAVoir';
import { EntreeBibliotheque } from '@/types';
import { conteneurs, couleurs, Densite, espacements, typo } from '@/theme/theme';

interface Props {
  enCours: EntreeBibliotheque[];
  aVoir: EntreeBibliotheque[];
  avancees: Map<number, AvanceeSerie>;
  accent: string;
  encre: string;
  densite: Densite;
  padding: number;
  titreEcran: string;
  staggerArme: boolean;
  onOuvrir: (tmdbId: number, type: string) => void;
  onMarquerVu: (entree: EntreeBibliotheque, position: PositionEpisode) => Promise<void>;
}

export function Fil({
  enCours,
  aVoir,
  avancees,
  accent,
  encre,
  densite,
  padding,
  titreEcran,
  staggerArme,
  onOuvrir,
  onMarquerVu,
}: Props) {
  const t = typo(densite);

  // Le fil met en avant ce qui est en cours ; la watchlist suit, car on ne peut
  // rien y « marquer vu ».
  const cartes = [...enCours, ...aVoir];

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.contenu, { paddingHorizontal: padding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[t.h1, styles.enTete]}>{titreEcran}</Text>
        <Text style={[t.body, styles.sous]}>
          Ton activité, une série à la fois.{' '}
          {enCours.length > 0 ? `${enCours.length} en cours.` : ''}
        </Text>

        <View style={styles.pile}>
          {cartes.map((e, i) => (
            <Animated.View
              key={e.id}
              entering={
                staggerArme ? FadeInDown.duration(280).delay(Math.min(i, 6) * 40) : undefined
              }
            >
              <CarteFil
                entree={e}
                avancee={avancees.get(e.tmdbId)}
                accent={accent}
                encre={encre}
                densite={densite}
                onPress={() => onOuvrir(e.tmdbId, e.type)}
                onMarquerVu={(position) => onMarquerVu(e, position)}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  /**
   * Un fil se lit en colonne : borné à la mesure de lecture, et non à la largeur
   * des grilles. Des cartes de 1400px de large seraient illisibles — l'œil ne
   * suit plus la ligne au retour.
   */
  contenu: {
    width: '100%',
    maxWidth: conteneurs.lecture,
    alignSelf: 'center',
    paddingBottom: espacements.section,
  },
  enTete: { color: couleurs.texte, paddingTop: espacements.sm },
  sous: { color: couleurs.texteDoux, marginTop: espacements.xs, marginBottom: espacements.ml },
  pile: { gap: espacements.ml },
});
