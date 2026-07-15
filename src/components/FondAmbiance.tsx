// =============================================================================
//  Composant : FondAmbiance
//  ---------------------------------------------------------------------------
//  Teinte la page entière avec l'image du contenu affiché — la technique
//  d'Apple TV, de Plex et d'AniList.
//
//  C'est LA différence entre « une app » et « un formulaire » : sans elle, un
//  fond uni sur lequel flottent des vignettes ne peut pas donner autre chose
//  qu'un rendu plat, quelles que soient les animations posées par-dessus.
//
//  Aucune extraction de couleur dominante n'est nécessaire : on floute l'image
//  elle-même et on la laisse colorer le fond.
// =============================================================================

import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs, fondus } from '@/theme/theme';
import { IMG_BASE } from '@/theme/constantes';

interface Props {
  /** Chemin TMDb de l'image (backdrop de préférence, affiche à défaut). */
  chemin: string | null;
  /** Hauteur de la zone teintée. */
  hauteur?: number;
}

export function FondAmbiance({ chemin, hauteur = 720 }: Props) {
  return (
    <View style={[styles.zone, { height: hauteur }]} pointerEvents="none">
      {/* Dégradé de page : une seule ligne, et plus jamais d'aplat. */}
      <LinearGradient
        colors={[...fondus.page]}
        locations={[...fondus.positionsPage]}
        style={StyleSheet.absoluteFill}
      />

      {chemin ? (
        <Image
          // On charge délibérément une PETITE image (w300) pour l'étirer plein
          // écran : l'upscale produit un flou natif, gratuit, en ~12 ko, et
          // identique sur toutes les plateformes. `blurRadius` n'est pas
          // implémenté par react-native-web — il ne faut rien bâtir dessus.
          source={{ uri: `${IMG_BASE}w300${chemin}` }}
          style={[StyleSheet.absoluteFill, styles.image]}
          contentFit="cover"
          transition={400}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : null}

      {/* Fondu vers le fond de page : 5 stops. Un fondu à 2 stops se lit comme
          une bande, et fondre vers #000 (au lieu de la teinte du fond) crée une
          couture grise — les deux signatures « cheap » les plus courantes. */}
      <LinearGradient
        colors={[...fondus.versBas]}
        locations={[...fondus.positionsVersBas]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: couleurs.page,
    overflow: 'hidden',
  },
  // 0.38 : au-delà, le texte cesse d'être lisible ; en deçà, la teinte disparaît.
  image: { opacity: 0.38 },
});
