// =============================================================================
//  Disposition « Grille » de l'accueil
//  ---------------------------------------------------------------------------
//  Un mur d'affiches, sans hero ni titres de section : tout ce qu'on suit, d'un
//  seul coup d'œil, trié par ce qui reste à voir.
//
//  Choix assumé : pas de récit. Là où l'apparence « Classique » consacre 560px à
//  un seul titre, celle-ci en montre trente. Les séries en cours passent devant
//  (avec leur épisode et leur avancement), puis la watchlist, puis ce qui est
//  terminé — l'ordre du plus actionnable au plus archivé.
// =============================================================================

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CarteMosaique } from '@/components/accueil/CarteMosaique';
import { AvanceeSerie } from '@/services/progressionCalcul';
import { EntreeBibliotheque } from '@/types';
import { couleurs, Densite, espacements, maxLargeur, typo } from '@/theme/theme';

interface Props {
  enCours: EntreeBibliotheque[];
  aVoir: EntreeBibliotheque[];
  termines: EntreeBibliotheque[];
  avancees: Map<number, AvanceeSerie>;
  accent: string;
  densite: Densite;
  padding: number;
  largeurUtile: number;
  titreEcran: string;
  staggerArme: boolean;
  onOuvrir: (tmdbId: number, type: string) => void;
}

export function Mosaique({
  enCours,
  aVoir,
  termines,
  avancees,
  accent,
  densite,
  padding,
  largeurUtile,
  titreEcran,
  staggerArme,
  onOuvrir,
}: Props) {
  const t = typo(densite);

  // Volontairement plus dense que l'apparence « Classique » (176 sur desktop) :
  // c'est la promesse de cette disposition.
  const cible = densite === 'desktop' ? 132 : 96;
  const gap = espacements.sm;
  const dispo = Math.min(largeurUtile, maxLargeur) - padding * 2;
  const colonnes = Math.max(3, Math.round(dispo / (cible + gap)));
  const largeur = Math.floor((dispo - (colonnes - 1) * gap) / colonnes);

  // L'ordre porte le sens : ce qu'on peut regarder maintenant, puis ce qu'on a
  // prévu, puis ce qui est fini.
  const tout = [
    ...enCours.map((e) => ({ e, vu: false })),
    ...aVoir.map((e) => ({ e, vu: false })),
    ...termines.map((e) => ({ e, vu: true })),
  ];

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.contenu, { paddingHorizontal: padding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.enTete}>
          <Text style={[t.h1, { color: couleurs.texte }]}>{titreEcran}</Text>
          <Text style={[t.caption, { color: couleurs.texteFaible }]}>
            {tout.length} titre{tout.length > 1 ? 's' : ''}
            {enCours.length > 0 ? ` · ${enCours.length} en cours` : ''}
          </Text>
        </View>

        <View style={[styles.grille, { gap }]}>
          {tout.map(({ e, vu }, i) => (
            <Animated.View
              key={e.id}
              entering={
                staggerArme ? FadeInDown.duration(280).delay(Math.min(i, 8) * 40) : undefined
              }
            >
              <CarteMosaique
                entree={e}
                avancee={avancees.get(e.tmdbId)}
                largeur={largeur}
                accent={accent}
                vu={vu}
                onPress={() => onOuvrir(e.tmdbId, e.type)}
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
  contenu: {
    width: '100%',
    maxWidth: maxLargeur,
    alignSelf: 'center',
    paddingBottom: espacements.section,
  },
  enTete: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: espacements.sm,
    paddingTop: espacements.sm,
    marginBottom: espacements.ml,
  },
  grille: { flexDirection: 'row', flexWrap: 'wrap' },
});
