// =============================================================================
//  Écran : À venir (Calendrier)
//  ---------------------------------------------------------------------------
//  Prochains épisodes des séries suivies, groupés par jour (Aujourd'hui /
//  Demain / Cette semaine / Plus tard). Le libellé du groupe prend la couleur
//  d'accent de la variante. Données : agenda (bibliothèque + prochains TMDb).
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProchainEpisode } from '@/lib/tmdb';
import { prochainsEpisodes } from '@/services/agenda';
import { synchroniserNotifications } from '@/services/notifications';
import { urlAffiche } from '@/theme/constantes';
import { LignesSquelettes } from '@/components/Squelette';
import { useVariante } from '@/hooks/useVariante';
import { EtatPressable } from '@/types';
import {
  conteneurs,
  couleurs,
  densiteDe,
  espacements,
  largeurRail,
  paddingEcran,
  rayons,
  seuilLarge,
  typo,
} from '@/theme/theme';

const ORDRE = ["Aujourd'hui", 'Demain', 'Cette semaine', 'Plus tard'];

/** Catégorise une date ISO (AAAA-MM-JJ) en groupe d'affichage. */
function groupeDe(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const jours = Math.round((d.getTime() - auj.getTime()) / 86_400_000);
  if (jours <= 0) return "Aujourd'hui";
  if (jours === 1) return 'Demain';
  if (jours <= 7) return 'Cette semaine';
  return 'Plus tard';
}

export default function EcranCalendrier() {
  const router = useRouter();
  const { accent } = useVariante();
  const { width: fenetre } = useWindowDimensions();
  const [episodes, setEpisodes] = useState<ProchainEpisode[]>([]);
  const [premierChargement, setPremierChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const staggerArme = useRef(true);

  const grandEcran = fenetre >= seuilLarge;
  const largeurUtile = fenetre - (grandEcran ? largeurRail : 0);
  const d = densiteDe(largeurUtile);
  const t = typo(d);
  const padding = paddingEcran(largeurUtile);

  const charger = useCallback(async () => {
    const valides = await prochainsEpisodes();
    setEpisodes(valides);
    synchroniserNotifications(valides).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        try {
          // Le rafraîchissement se fait SOUS les données déjà affichées : remonter
          // un squelette à chaque retour d'onglet est un clignotement, pas un
          // chargement.
          const valides = await prochainsEpisodes();
          if (actif) {
            setEpisodes(valides);
            synchroniserNotifications(valides).catch(() => {});
          }
        } finally {
          if (actif) {
            setPremierChargement(false);
            setTimeout(() => (staggerArme.current = false), 800);
          }
        }
      })();
      return () => {
        actif = false;
      };
    }, [])
  );

  async function rafraichir() {
    setRafraichit(true);
    try {
      await charger();
    } finally {
      setRafraichit(false);
    }
  }

  // Regroupe les épisodes par jour, dans l'ordre défini.
  const parGroupe: Record<string, ProchainEpisode[]> = {};
  for (const e of episodes) {
    const g = groupeDe(e.dateDiffusion);
    (parGroupe[g] ??= []).push(e);
  }
  const sections = ORDRE.filter((g) => parGroupe[g]?.length).map((g) => ({
    title: g,
    data: parGroupe[g],
  }));

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={[styles.conteneur, { paddingHorizontal: padding }]}>
        <View style={styles.enTeteLigne}>
          <View style={styles.titreLigne}>
            {/* Le calendrier n'est plus un onglet : il lui faut un retour. */}
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
            <Text style={[t.h1, styles.enTete]}>À venir</Text>
          </View>
          {/* Sur web, `RefreshControl` ne répond à aucun geste : sans ce bouton,
              une personne sur ordinateur n'a AUCUN moyen de rafraîchir. */}
          {Platform.OS === 'web' ? (
            <BoutonRafraichir enCours={rafraichit} accent={accent} onPress={rafraichir} />
          ) : null}
        </View>

        {premierChargement ? (
          <LignesSquelettes nombre={5} />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => `${item.serieId}-${item.saison}-${item.numero}`}
            contentContainerStyle={styles.liste}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={rafraichit}
                onRefresh={rafraichir}
                tintColor={accent}
                colors={[accent]}
              />
            }
            renderSectionHeader={({ section }) => (
              <Animated.View
                entering={staggerArme.current ? FadeInDown.duration(280) : undefined}
                style={styles.jourBloc}
              >
                <Text style={[t.overline, { color: accent }]}>{section.title.toUpperCase()}</Text>
                <Text style={[t.caption, { color: couleurs.texteFaible, marginTop: 2 }]}>
                  {section.data.length} {section.data.length > 1 ? 'épisodes' : 'épisode'}
                </Text>
              </Animated.View>
            )}
            renderItem={({ item }) => (
              <LigneEpisode
                episode={item}
                densite={d}
                onPress={() =>
                  router.push({
                    pathname: '/titre/[id]',
                    params: { id: String(item.serieId), type: 'serie' },
                  })
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.vide}>
                <View
                  style={[styles.videRond, { borderColor: accent, backgroundColor: `${accent}14` }]}
                >
                  <Ionicons name="calendar-outline" size={40} color={accent} />
                </View>
                <Text style={[t.h2, { color: couleurs.texte, marginTop: espacements.l }]}>
                  Rien de programmé
                </Text>
                <Text style={[t.body, styles.videSous]}>
                  Aucun épisode à venir pour tes séries suivies. Ajoute des séries « en cours »
                  depuis Découvrir.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/** Bouton de rafraîchissement web, avec son icône qui tourne pendant la requête. */
function BoutonRafraichir({
  enCours,
  accent,
  onPress,
}: {
  enCours: boolean;
  accent: string;
  onPress: () => void;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (enCours) {
      rotation.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1);
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [enCours, rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Pressable
      onPress={onPress}
      disabled={enCours}
      accessibilityRole="button"
      accessibilityLabel="Rafraîchir"
      style={({ hovered }: EtatPressable) => [
        styles.rafraichir,
        hovered && { backgroundColor: couleurs.surface3, borderColor: couleurs.bordure2 },
      ]}
    >
      <Animated.View style={style}>
        <Ionicons name="refresh" size={18} color={enCours ? accent : couleurs.texteDoux} />
      </Animated.View>
    </Pressable>
  );
}

/** Une ligne du calendrier : affiche + titre + épisode + date. */
function LigneEpisode({
  episode,
  densite,
  onPress,
}: {
  episode: ProchainEpisode;
  densite: 'mobile' | 'desktop';
  onPress: () => void;
}) {
  const t = typo(densite);
  const uri = urlAffiche(episode.cheminAffiche, 'w185');
  const date = new Date(`${episode.dateDiffusion}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Pressable
      style={({ hovered }: EtatPressable) => [
        styles.ligne,
        hovered && { backgroundColor: couleurs.surface3, borderColor: couleurs.bordure2 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${episode.serieTitre}, saison ${episode.saison} épisode ${episode.numero}, le ${date}`}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.miniature}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : (
        <View style={styles.miniature} />
      )}
      <View style={styles.infos}>
        <Text style={[t.h3, { color: couleurs.texte }]} numberOfLines={1}>
          {episode.serieTitre}
        </Text>
        <Text style={[t.body, { color: couleurs.texteDoux }]} numberOfLines={1}>
          S{episode.saison} E{episode.numero}
          {episode.nom ? ` · ${episode.nom}` : ''}
        </Text>
        <Text style={[t.caption, styles.date]}>{date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.texteFaible} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Colonne unique : 1280 et non 1440 (réservé aux grilles d'affiches).
  conteneur: { flex: 1, width: '100%', maxWidth: conteneurs.standard, alignSelf: 'center' },
  enTeteLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: espacements.sm,
    marginBottom: espacements.ml,
  },
  titreLigne: { flexDirection: 'row', alignItems: 'center', gap: espacements.s },
  retour: {
    width: 40,
    height: 40,
    borderRadius: rayons.rond,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  enTete: { color: couleurs.texte },
  rafraichir: {
    width: 40,
    height: 40,
    borderRadius: rayons.rond,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    cursor: 'pointer',
  },
  liste: { paddingBottom: espacements.section },
  jourBloc: { marginTop: espacements.section, marginBottom: espacements.m },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
    padding: espacements.sm,
    marginBottom: espacements.sm,
    cursor: 'pointer',
  },
  miniature: {
    width: 54,
    height: 81,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.lisere,
  },
  infos: { flex: 1, justifyContent: 'center', gap: 2 },
  date: { color: couleurs.texteFaible, textTransform: 'capitalize' },
  vide: { alignItems: 'center', justifyContent: 'center', paddingVertical: espacements.hero },
  videRond: {
    width: 88,
    height: 88,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videSous: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.s,
    maxWidth: 380,
  },
});
