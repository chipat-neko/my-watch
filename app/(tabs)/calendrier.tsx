// =============================================================================
//  Écran : À venir (Calendrier)
//  ---------------------------------------------------------------------------
//  Prochains épisodes des séries suivies, groupés par jour (Aujourd'hui /
//  Demain / Cette semaine / Plus tard). Le libellé du groupe prend la couleur
//  d'accent de la variante. Données : agenda (bibliothèque + prochains TMDb).
// =============================================================================

import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ProchainEpisode } from '@/lib/tmdb';
import { prochainsEpisodes } from '@/services/agenda';
import { synchroniserNotifications } from '@/services/notifications';
import { urlAffiche } from '@/theme/constantes';
import { Chargement } from '@/components/Chargement';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, maxLargeur, polices, rayons } from '@/theme/theme';

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
  const [episodes, setEpisodes] = useState<ProchainEpisode[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        setChargement(true);
        try {
          const valides = await prochainsEpisodes();
          if (actif) {
            setEpisodes(valides);
            synchroniserNotifications(valides).catch(() => {});
          }
        } finally {
          if (actif) setChargement(false);
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
      const valides = await prochainsEpisodes();
      setEpisodes(valides);
      synchroniserNotifications(valides).catch(() => {});
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

  if (chargement) return <Chargement message="Recherche des prochains épisodes…" />;

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={styles.conteneur}>
        <Text style={styles.enTete}>À venir</Text>
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.serieId}-${item.saison}-${item.numero}`}
          contentContainerStyle={styles.liste}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={rafraichit}
              onRefresh={rafraichir}
              tintColor={accent}
              colors={[accent]}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={[styles.jour, { color: accent }]}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <LigneEpisode
              episode={item}
              onPress={() =>
                router.push({
                  pathname: '/titre/[id]',
                  params: { id: String(item.serieId), type: 'serie' },
                })
              }
            />
          )}
          ListEmptyComponent={
            <Text style={styles.vide}>
              Aucun épisode programmé pour tes séries suivies. Ajoute des séries « en cours » depuis
              Découvrir.
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

/** Une ligne du calendrier : affiche + titre + épisode + date. */
function LigneEpisode({ episode, onPress }: { episode: ProchainEpisode; onPress: () => void }) {
  const uri = urlAffiche(episode.cheminAffiche, 'w185');
  const date = new Date(`${episode.dateDiffusion}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Pressable
      style={styles.ligne}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${episode.serieTitre}, saison ${episode.saison} épisode ${episode.numero}`}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.miniature} />
      ) : (
        <View style={styles.miniature} />
      )}
      <View style={styles.infos}>
        <Text style={styles.serie} numberOfLines={1}>
          {episode.serieTitre}
        </Text>
        <Text style={styles.details} numberOfLines={1}>
          S{episode.saison} E{episode.numero}
          {episode.nom ? ` · ${episode.nom}` : ''}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Borne la largeur du contenu et le centre (sinon il s'étire sur grand écran).
  conteneur: { flex: 1, width: '100%', maxWidth: maxLargeur, alignSelf: 'center' },
  enTete: {
    color: couleurs.texte,
    fontSize: polices.grandTitre,
    fontFamily: familles.extrabold,
    paddingHorizontal: espacements.l,
    paddingTop: espacements.m,
  },
  liste: { paddingHorizontal: espacements.l, paddingBottom: espacements.xl },
  jour: {
    fontSize: polices.moyenne,
    fontFamily: familles.extrabold,
    marginTop: espacements.l,
    marginBottom: espacements.s,
  },
  ligne: {
    flexDirection: 'row',
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.m,
    padding: espacements.s,
    marginBottom: espacements.s,
  },
  miniature: {
    width: 54,
    height: 80,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
  },
  infos: { flex: 1, marginLeft: espacements.m, justifyContent: 'center' },
  serie: { color: couleurs.texte, fontSize: polices.moyenne, fontFamily: familles.bold },
  details: {
    color: couleurs.texteDoux,
    fontSize: polices.normale,
    fontFamily: familles.medium,
    marginTop: 2,
  },
  date: {
    color: couleurs.texteCorps,
    fontSize: polices.petite,
    fontFamily: familles.semibold,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  vide: {
    color: couleurs.texteDoux,
    fontFamily: familles.medium,
    textAlign: 'center',
    marginTop: espacements.xl,
    paddingHorizontal: espacements.l,
    fontSize: polices.normale,
  },
});
