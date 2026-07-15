// =============================================================================
//  Composant : CartePoster
//  ---------------------------------------------------------------------------
//  L'affiche d'un titre (film/série) sous forme de carte cliquable. Réutilisé
//  dans les grilles (Découvrir) et les rails horizontaux (Accueil).
//
//  Trois principes, tirés des applications du domaine (Trakt, Letterboxd, Plex) :
//
//   1. Une affiche EST l'identifiant. Le texte en dessous est une étiquette de
//      confirmation, pas un titre : UNE ligne, à hauteur FIGÉE. Sur deux lignes,
//      les cellules prennent des hauteurs différentes et la grille devient
//      dentelée — la signature visuelle n°1 d'une app non finie.
//   2. Sous ~150px, une affiche est un timbre illisible : le logotype gravé dedans
//      n'est plus déchiffrable. La cible desktop est 176px.
//   3. Sur fond sombre, une affiche claire « flotte », découpée. Un liseré à 6 %
//      de blanc la POSE. C'est le détail le moins cher du composant.
// =============================================================================

import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Titre } from '@/types';
import { urlAffiche } from '@/theme/constantes';
import { Progression } from '@/components/Progression';
import { couleurs, densiteDe, espacements, rayons, typo } from '@/theme/theme';

interface Props {
  titre: Titre;
  /** Largeur de la carte (par défaut 120). La hauteur en découle : ratio 2:3 exact. */
  largeur?: number;
  /** Action au clic (généralement : ouvrir l'écran de détail). */
  onPress?: () => void;
  /**
   * Affiche la pastille Film/Série. `false` par défaut : quand le filtre dit
   * déjà « Films », un badge « Film » sur chaque carte est du bruit pur. À
   * n'activer que sur les listes MIXTES (recherche, « Pour toi »).
   */
  montrerType?: boolean;
  /** Avancement de la série (épisodes vus / total), affiché en pied d'affiche. */
  progression?: { vus: number; total: number };
  /** Couleur d'accent (variante) — requise si `progression` est fournie. */
  accent?: string;
  /** Marque l'affiche d'une coche « vu ». */
  vu?: boolean;
}

export function CartePoster({
  titre,
  largeur = 120,
  onPress,
  montrerType = false,
  progression,
  accent = couleurs.accent,
  vu = false,
}: Props) {
  const { width: fenetre } = useWindowDimensions();
  const d = densiteDe(fenetre);
  const t = typo(d);

  // Ratio 2:3 EXACT (standard TMDb 500×750). `round` et non `floor` : un arrondi
  // libre sur la hauteur désaligne les rangées d'un pixel, visible sur fond sombre.
  const hauteur = Math.round(largeur * 1.5);

  // TMDb sert w342 (342×513). À DPR 2, une carte de ~171px consomme exactement
  // 342px de bitmap : 1:1, zéro upscale, zéro octet gaspillé. Au-delà de 190 il
  // faut w500 (+2,4× le poids).
  const uri = urlAffiche(titre.cheminAffiche, largeur <= 190 ? 'w342' : 'w500');

  // Le press et le survol pilotent des valeurs partagées plutôt que la callback
  // de style de Pressable : celle-ci ne donne qu'un booléen, donc un changement
  // atteint en une frame et relâché en une frame. C'est ce « snap » qui fait
  // cheap — pas les valeurs elles-mêmes.
  const echelle = useSharedValue(1);
  const eleve = useSharedValue(0);

  const styleAnime = useAnimatedStyle(() => ({
    transform: [{ scale: echelle.value }, { translateY: eleve.value * -6 }],
  }));

  const RESSORT_PRESS = {
    damping: 15,
    stiffness: 400,
    mass: 0.5,
    reduceMotion: ReduceMotion.System,
  };
  const RESSORT_RETOUR = { damping: 12, stiffness: 260, reduceMotion: ReduceMotion.System };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        echelle.value = withSpring(0.96, RESSORT_PRESS);
      }}
      onPressOut={() => {
        echelle.value = withSpring(1, RESSORT_RETOUR);
      }}
      onHoverIn={() => {
        eleve.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
        echelle.value = withTiming(1.03, { duration: 180, easing: Easing.out(Easing.cubic) });
      }}
      onHoverOut={() => {
        // Sortie à ~67 % de la durée d'entrée : une UI qui se rétracte plus vite
        // qu'elle ne se déploie est perçue comme réactive.
        eleve.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.cubic) });
        echelle.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${titre.titre}, ${titre.type === 'film' ? 'film' : 'série'}`}
      style={styles.zone}
    >
      <Animated.View style={[{ width: largeur }, styleAnime]}>
        <View style={[styles.cadre, { width: largeur, height: hauteur }]}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.affiche}
              contentFit="cover"
              // Le fondu à l'arrivée de chaque affiche est, à lui seul, ce qui
              // tue le côté « layout statique ».
              transition={220}
              cachePolicy="memory-disk"
              accessible={false}
            />
          ) : (
            <View style={[styles.affiche, styles.absente]}>
              <Text style={[t.caption, { color: couleurs.texteFaible }]}>Pas d'affiche</Text>
            </View>
          )}

          {/* Note TMDb, en haut à droite. Un mur d'affiches sans un seul chiffre
              n'offre aucune accroche à l'œil. */}
          {titre.note > 0 ? (
            <View style={styles.badgeNote}>
              <Ionicons name="star" size={9} color={couleurs.note} />
              <Text style={styles.badgeNoteTexte}>{titre.note.toFixed(1)}</Text>
            </View>
          ) : null}

          {vu ? (
            <View style={[styles.coche, { borderColor: accent, backgroundColor: `${accent}29` }]}>
              <Ionicons name="checkmark" size={13} color={accent} />
            </View>
          ) : null}

          {montrerType ? (
            <View style={styles.badgeType}>
              <Text style={styles.badgeTypeTexte}>{titre.type === 'film' ? 'FILM' : 'SÉRIE'}</Text>
            </View>
          ) : null}

          {/* Progression collée au bas de l'affiche : pas de rayon (une barre
              arrondie de 3px se lit mal). */}
          {progression && progression.total > 0 ? (
            <View style={styles.progression}>
              <Progression
                vus={progression.vus}
                total={progression.total}
                accent={accent}
                epaisseur={3}
              />
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: d === 'desktop' ? 10 : espacements.s }}>
          {/* `height` figée et non `minHeight` : minHeight laisse encore les
              jambages et diacritiques déborder d'un pixel et désaligner la rangée. */}
          <Text
            numberOfLines={1}
            style={[t.label, { color: couleurs.texte, height: t.label.lineHeight }]}
          >
            {titre.titre}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              t.caption,
              { color: couleurs.texteDoux, height: t.caption.lineHeight, marginTop: 2 },
            ]}
          >
            {metaDe(titre)}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Ligne de méta sous le titre : année, à défaut le type. */
function metaDe(titre: Titre): string {
  const annee = titre.dateSortie ? titre.dateSortie.slice(0, 4) : null;
  const type = titre.type === 'film' ? 'Film' : 'Série';
  return annee ? `${annee} · ${type}` : type;
}

const styles = StyleSheet.create({
  // `cursor: pointer` : absent du code jusqu'ici, et c'est le signal web le plus
  // élémentaire qu'un élément est cliquable.
  zone: { cursor: 'pointer' },
  cadre: {
    borderRadius: rayons.m,
    overflow: 'hidden',
    backgroundColor: couleurs.surface2,
    // Le liseré qui « pose » l'affiche sur le fond sombre.
    borderWidth: 1,
    borderColor: couleurs.lisere,
    // L'ombre ne sert qu'à séparer : en dark mode c'est la lumière du liseré qui
    // porte l'élévation.
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  affiche: { width: '100%', height: '100%' },
  absente: { alignItems: 'center', justifyContent: 'center' },
  badgeNote: {
    position: 'absolute',
    top: espacements.s,
    right: espacements.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    // Teinte du fond de page, jamais une valeur hors palette.
    backgroundColor: 'rgba(11,14,17,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: rayons.rond,
  },
  badgeNoteTexte: {
    color: couleurs.note,
    fontSize: 11,
    fontFamily: 'Manrope_800ExtraBold',
    fontVariant: ['tabular-nums'],
  },
  coche: {
    position: 'absolute',
    top: espacements.s,
    left: espacements.s,
    width: 24,
    height: 24,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeType: {
    position: 'absolute',
    bottom: espacements.s,
    left: espacements.s,
    backgroundColor: 'rgba(11,14,17,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rayons.s,
  },
  badgeTypeTexte: {
    color: couleurs.texteCorps,
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1,
  },
  progression: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
