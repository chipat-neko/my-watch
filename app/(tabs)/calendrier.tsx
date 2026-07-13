// =============================================================================
//  Écran : À venir (Calendrier)
//  ---------------------------------------------------------------------------
//  Liste les prochains épisodes des séries suivies par l'utilisateur, triés
//  par date de diffusion. On récupère d'abord la bibliothèque (séries en cours
//  ou à voir), puis on interroge TMDb pour connaître le prochain épisode de
//  chacune.
// =============================================================================

import { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ProchainEpisode } from '@/lib/tmdb';
import { prochainsEpisodes } from '@/services/agenda';
import { synchroniserNotifications } from '@/services/notifications';
import { urlAffiche } from '@/theme/constantes';
import { Chargement } from '@/components/Chargement';
import { couleurs, espacements, polices, rayons } from '@/theme/theme';

export default function EcranCalendrier() {
  const [episodes, setEpisodes] = useState<ProchainEpisode[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);

  // useFocusEffect : recharge à chaque fois que l'onglet redevient visible
  // (utile si l'utilisateur vient d'ajouter une série).
  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        setChargement(true);
        try {
          const valides = await prochainsEpisodes();
          if (actif) {
            setEpisodes(valides);
            // Garde les rappels à jour si l'utilisateur les a activés.
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

  /** Recharge les prochains épisodes lors d'un "tirer pour rafraîchir". */
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

  if (chargement) return <Chargement message="Recherche des prochains épisodes…" />;

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <Text style={styles.enTete}>À venir</Text>
      <FlatList
        data={episodes}
        keyExtractor={(item) => `${item.serieId}-${item.saison}-${item.numero}`}
        contentContainerStyle={styles.liste}
        renderItem={({ item }) => <LigneEpisode episode={item} />}
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={rafraichir}
            tintColor={couleurs.accent}
            colors={[couleurs.accent]}
          />
        }
        ListEmptyComponent={
          <Text style={styles.vide}>
            Aucun épisode programmé pour tes séries suivies. Ajoute des séries « en cours » depuis
            la recherche !
          </Text>
        }
      />
    </SafeAreaView>
  );
}

/** Une ligne du calendrier : affiche + titre + numéro d'épisode + date. */
function LigneEpisode({ episode }: { episode: ProchainEpisode }) {
  const uri = urlAffiche(episode.cheminAffiche, 'w185');
  // Formatage lisible de la date (ex : "lundi 20 juillet").
  const date = new Date(episode.dateDiffusion).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={styles.ligne}>
      {uri ? (
        <Image source={{ uri }} style={styles.miniature} />
      ) : (
        <View style={styles.miniature} />
      )}
      <View style={styles.infos}>
        <Text style={styles.serie} numberOfLines={1}>
          {episode.serieTitre}
        </Text>
        <Text style={styles.details}>
          S{episode.saison} E{episode.numero} · {episode.nom}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  enTete: {
    color: couleurs.texte,
    fontSize: polices.grandTitre,
    fontWeight: '800',
    padding: espacements.m,
  },
  liste: { paddingHorizontal: espacements.m, paddingBottom: espacements.xl },
  ligne: {
    flexDirection: 'row',
    backgroundColor: couleurs.surface,
    borderRadius: rayons.m,
    padding: espacements.s,
    marginBottom: espacements.m,
  },
  miniature: {
    width: 60,
    height: 90,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
  },
  infos: { flex: 1, marginLeft: espacements.m, justifyContent: 'center' },
  serie: { color: couleurs.texte, fontSize: polices.moyenne, fontWeight: '700' },
  details: { color: couleurs.texteDoux, fontSize: polices.normale, marginTop: espacements.xs },
  date: {
    color: couleurs.accent,
    fontSize: polices.normale,
    marginTop: espacements.xs,
    fontWeight: '600',
  },
  vide: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.xl,
    paddingHorizontal: espacements.l,
    fontSize: polices.normale,
  },
});
