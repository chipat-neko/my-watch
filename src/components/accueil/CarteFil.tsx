// =============================================================================
//  Composant : CarteFil (apparence « Social »)
//  ---------------------------------------------------------------------------
//  Une grande carte 16:9, empilée dans un fil vertical.
//
//  Le handoff prévoyait ici « Tes amis regardent ». Cela suppose un back-end de
//  relations et de publications que My Watch n'a pas — et fabriquer de faux amis
//  serait pire que de ne rien montrer. L'apparence est donc réinterprétée en un
//  fil d'activité PERSONNEL : le même contenu que les autres apparences, mais
//  raconté comme un journal, une carte à la fois, image en grand.
//
//  Différence de fond avec « Grille » : là où la mosaïque optimise le balayage,
//  le fil optimise la lecture — une seule chose à la fois, et de la place pour
//  l'image.
// =============================================================================

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Progression } from '@/components/Progression';
import { AvanceeSerie } from '@/services/progressionCalcul';
import { PositionEpisode } from '@/services/prochainAVoir';
import { urlAffiche, urlFond } from '@/theme/constantes';
import { EntreeBibliotheque, EtatPressable } from '@/types';
import { couleurs, Densite, espacements, fondus, rayons, typo } from '@/theme/theme';

interface Props {
  entree: EntreeBibliotheque;
  avancee?: AvanceeSerie;
  accent: string;
  encre: string;
  densite: Densite;
  onPress: () => void;
  onMarquerVu?: (position: PositionEpisode) => Promise<void>;
}

export function CarteFil({ entree, avancee, accent, encre, densite, onPress, onMarquerVu }: Props) {
  const t = typo(densite);
  const [occupe, setOccupe] = useState(false);
  const prochain = avancee?.prochain;

  // Le backdrop vient de l'appel TMDb déjà fait pour l'avancement ; à défaut,
  // l'affiche, que le recadrage 16:9 rendra abstraite mais colorée.
  const fond =
    urlFond(avancee?.cheminFond ?? null, 'w780') ?? urlAffiche(entree.cheminAffiche, 'w500');

  async function marquer() {
    if (!prochain || !onMarquerVu || occupe) return;
    setOccupe(true);
    try {
      await onMarquerVu(prochain);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        prochain
          ? `${entree.titre}, à regarder saison ${prochain.saison} épisode ${prochain.numero}`
          : entree.titre
      }
      style={({ hovered }: EtatPressable) => [
        styles.carte,
        hovered && { borderColor: couleurs.bordure2, transform: [{ translateY: -2 }] },
      ]}
    >
      <View style={styles.image}>
        {fond ? (
          <Image
            source={{ uri: fond }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="top"
            transition={260}
            cachePolicy="memory-disk"
            accessible={false}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: couleurs.surface2 }]} />
        )}
        <LinearGradient
          colors={[...fondus.versBas]}
          locations={[...fondus.positionsVersBas]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.surImage}>
          <Text style={[t.overline, { color: accent }]}>
            {prochain ? `À REGARDER · S${prochain.saison} E${prochain.numero}` : 'À JOUR'}
          </Text>
          <Text style={[t.h2, { color: couleurs.texte }]} numberOfLines={1}>
            {entree.titre}
          </Text>
        </View>
      </View>

      <View style={styles.pied}>
        <View style={styles.pieceProgression}>
          {avancee && avancee.total > 0 ? (
            <Progression vus={avancee.vus} total={avancee.total} accent={accent} libelle />
          ) : (
            <Text style={[t.caption, { color: couleurs.texteFaible }]}>Série · en cours</Text>
          )}
        </View>

        {prochain && onMarquerVu ? (
          <Pressable
            onPress={marquer}
            disabled={occupe}
            accessibilityRole="button"
            accessibilityLabel={`Marquer S${prochain.saison} E${prochain.numero} comme vu`}
            hitSlop={8}
            style={({ hovered, pressed }: EtatPressable) => [
              styles.btnVu,
              { borderColor: accent },
              hovered && { backgroundColor: accent },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            {({ hovered }: EtatPressable) => (
              <>
                <Ionicons
                  name={occupe ? 'hourglass-outline' : 'checkmark'}
                  size={16}
                  color={hovered ? encre : accent}
                />
                <Text style={[t.label, { color: hovered ? encre : accent }]}>Vu</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  // 16:9 : le format des backdrops TMDb, jamais recadré autrement.
  image: { width: '100%', aspectRatio: 16 / 9, justifyContent: 'flex-end' },
  surImage: { padding: espacements.m },
  pied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacements.m,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.sm,
  },
  pieceProgression: { flex: 1, maxWidth: 280 },
  btnVu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    height: 38,
    paddingHorizontal: espacements.m,
    borderRadius: rayons.rond,
    borderWidth: 1.5,
    cursor: 'pointer',
  },
});
