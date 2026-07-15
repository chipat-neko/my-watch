// =============================================================================
//  Écran : Historique (journal de visionnage)
//  ---------------------------------------------------------------------------
//  Ce que tu as vu, et quand. La date de visionnage était enregistrée depuis le
//  premier jour (`EpisodeVu.vuLe`) sans jamais être affichée nulle part : c'est
//  pourtant le souvenir que garde une app de suivi, et l'une des pages les plus
//  consultées de TV Time.
// =============================================================================

import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chargerBibliotheque, historiqueEpisodes } from '@/services/bibliotheque';
import { EntreeHistorique, grouperParJour, libelleJour } from '@/services/historiqueCalcul';
import { LignesSquelettes } from '@/components/Squelette';
import { urlAffiche } from '@/theme/constantes';
import { EntreeBibliotheque, EtatPressable } from '@/types';
import { useVariante } from '@/hooks/useVariante';
import {
  conteneurs,
  couleurs,
  densiteDe,
  espacements,
  paddingEcran,
  rayons,
  typo,
} from '@/theme/theme';

/** Ce qu'il faut savoir d'une série pour l'afficher dans le journal. */
interface InfoSerie {
  titre: string;
  cheminAffiche: string | null;
  type: string;
}

export default function EcranHistorique() {
  const router = useRouter();
  const { accent } = useVariante();
  const { width: fenetre } = useWindowDimensions();

  const d = densiteDe(fenetre);
  const t = typo(d);
  const padding = paddingEcran(fenetre);

  const [entrees, setEntrees] = useState<EntreeHistorique[]>([]);
  const [series, setSeries] = useState<Map<number, InfoSerie>>(new Map());
  const [chargement, setChargement] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        try {
          // Le journal ne connaît que des identifiants de série : la
          // bibliothèque fournit les titres et les affiches, sans un seul appel
          // TMDb.
          const [vus, biblio] = await Promise.all([
            historiqueEpisodes(),
            chargerBibliotheque().catch(() => [] as EntreeBibliotheque[]),
          ]);
          if (!actif) return;
          setEntrees(
            vus.map((v) => ({
              episodeId: v.episodeId,
              serieId: v.serieId,
              saison: v.saison,
              numero: v.numero,
              vuLe: v.vuLe,
              note: v.note,
            }))
          );
          setSeries(
            new Map(
              biblio.map((e) => [
                e.tmdbId,
                { titre: e.titre, cheminAffiche: e.cheminAffiche, type: e.type },
              ])
            )
          );
        } finally {
          if (actif) setChargement(false);
        }
      })();
      return () => {
        actif = false;
      };
    }, [])
  );

  const sections = useMemo(
    () =>
      grouperParJour(entrees).map((j) => ({
        title: j.jour,
        data: j.entrees,
      })),
    [entrees]
  );

  return (
    <SafeAreaView style={styles.ecran} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.conteneur, { paddingHorizontal: padding }]}>
        <View style={styles.barre}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Revenir en arrière"
            style={({ hovered }: EtatPressable) => [
              styles.retour,
              hovered && { backgroundColor: couleurs.surface3 },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
          </Pressable>
          <Text style={[t.h2, { color: couleurs.texte }]}>Mon historique</Text>
        </View>

        {chargement ? (
          <LignesSquelettes nombre={6} />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.episodeId)}
            contentContainerStyle={styles.liste}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            renderSectionHeader={({ section }) => (
              <View style={styles.jour}>
                <Text style={[t.overline, { color: accent }]}>
                  {libelleJour(section.title).toUpperCase()}
                </Text>
                <Text style={[t.caption, { color: couleurs.texteFaible }]}>
                  {section.data.length} épisode{section.data.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const serie = series.get(item.serieId);
              const uri = urlAffiche(serie?.cheminAffiche ?? null, 'w185');
              const heure = new Date(item.vuLe).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/titre/[id]',
                      params: {
                        id: String(item.serieId),
                        type: serie?.type ?? 'serie',
                        nom: serie?.titre ?? '',
                        affiche: serie?.cheminAffiche ?? '',
                      },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${serie?.titre ?? 'Série'}, saison ${item.saison} épisode ${item.numero}, vu à ${heure}`}
                  style={({ hovered }: EtatPressable) => [
                    styles.ligne,
                    hovered && { backgroundColor: couleurs.surface3 },
                  ]}
                >
                  {uri ? (
                    <Image
                      source={{ uri }}
                      style={styles.affiche}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      accessible={false}
                    />
                  ) : (
                    <View style={styles.affiche} />
                  )}

                  <View style={styles.infos}>
                    <Text style={[t.h3, { color: couleurs.texte }]} numberOfLines={1}>
                      {/* Un titre retiré de la bibliothèque garde ses épisodes
                          vus : on l'annonce plutôt que d'afficher un vide. */}
                      {serie?.titre ?? 'Titre retiré de ta liste'}
                    </Text>
                    <Text style={[t.caption, { color: couleurs.texteDoux, marginTop: 2 }]}>
                      S{item.saison} E{item.numero} · {heure}
                    </Text>
                  </View>

                  {item.note !== null ? (
                    <View style={styles.note}>
                      <Ionicons name="star" size={11} color={couleurs.note} />
                      <Text style={styles.noteTexte}>{(item.note / 2).toFixed(1)}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.vide}>
                <View
                  style={[styles.videRond, { borderColor: accent, backgroundColor: `${accent}14` }]}
                >
                  <Ionicons name="time-outline" size={38} color={accent} />
                </View>
                <Text style={[t.h2, { color: couleurs.texte, marginTop: espacements.l }]}>
                  Rien dans ton historique
                </Text>
                <Text style={[t.body, styles.videSous]}>
                  Coche des épisodes : ils apparaîtront ici, jour par jour.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Un journal se lit en colonne : borné à la mesure de lecture.
  conteneur: { flex: 1, width: '100%', maxWidth: conteneurs.lecture, alignSelf: 'center' },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    paddingVertical: espacements.sm,
  },
  retour: {
    width: 40,
    height: 40,
    borderRadius: rayons.rond,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  liste: { paddingBottom: espacements.section },
  jour: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: espacements.xl,
    marginBottom: espacements.sm,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.m,
    padding: espacements.s,
    marginBottom: espacements.s,
    cursor: 'pointer',
  },
  affiche: {
    width: 40,
    height: 60,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.lisere,
  },
  infos: { flex: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: couleurs.surface2,
    paddingHorizontal: espacements.s,
    paddingVertical: 3,
    borderRadius: rayons.rond,
  },
  noteTexte: {
    color: couleurs.note,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  vide: { alignItems: 'center', justifyContent: 'center', paddingVertical: espacements.hero },
  videRond: {
    width: 84,
    height: 84,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videSous: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.s,
    maxWidth: 340,
  },
});
