// =============================================================================
//  Écran : Profil
//  ---------------------------------------------------------------------------
//  Montre l'adresse e-mail de l'utilisateur, quelques statistiques de suivi,
//  un accès à l'import de données (Netflix / TV Time) et le bouton de
//  déconnexion.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { statistiques, Statistiques } from '@/services/bibliotheque';
import { prochainsEpisodes } from '@/services/agenda';
import {
  activerNotifications,
  desactiverNotifications,
  notificationsActivees,
} from '@/services/notifications';
import { couleurs, espacements, polices, rayons } from '@/theme/theme';

export default function EcranProfil() {
  const { session, seDeconnecter } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [notifs, setNotifs] = useState(false);
  const [notifsOccupe, setNotifsOccupe] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      statistiques()
        .then((s) => actif && setStats(s))
        .catch(() => {});
      return () => {
        actif = false;
      };
    }, [])
  );

  // Reflète la préférence de notifications enregistrée localement.
  useEffect(() => {
    notificationsActivees().then(setNotifs);
  }, []);

  /** Active ou désactive les rappels de nouveaux épisodes. */
  async function basculerNotifs(valeur: boolean) {
    setNotifsOccupe(true);
    try {
      if (valeur) {
        const episodes = await prochainsEpisodes();
        const ok = await activerNotifications(episodes);
        setNotifs(ok);
        if (!ok) {
          Alert.alert(
            'Notifications refusées',
            'Autorise les notifications dans les réglages de ton téléphone pour être prévenu des nouveaux épisodes.'
          );
        }
      } else {
        await desactiverNotifications();
        setNotifs(false);
      }
    } finally {
      setNotifsOccupe(false);
    }
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.enTete}>Profil</Text>

        {/* Carte utilisateur */}
        <View style={styles.carte}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={couleurs.texte} />
          </View>
          <Text style={styles.email}>{session?.user.email ?? 'Utilisateur'}</Text>
        </View>

        {/* Statistiques */}
        <View style={styles.statsLigne}>
          <Stat valeur={stats?.nbSeries ?? 0} libelle="Séries" />
          <Stat valeur={stats?.nbFilms ?? 0} libelle="Films" />
          <Stat valeur={stats?.nbEpisodesVus ?? 0} libelle="Épisodes vus" />
        </View>

        {/* Réglage : notifications des sorties */}
        <View style={styles.action}>
          <Ionicons name="notifications-outline" size={22} color={couleurs.accent} />
          <View style={styles.actionTexte}>
            <Text style={styles.actionTitre}>Notifications des sorties</Text>
            <Text style={styles.actionSousTitre}>Un rappel le jour d'un nouvel épisode</Text>
          </View>
          <Switch
            value={notifs}
            onValueChange={basculerNotifs}
            disabled={notifsOccupe}
            trackColor={{ true: couleurs.accent, false: couleurs.surface2 }}
            thumbColor={couleurs.texte}
            accessibilityLabel="Notifications des sorties"
          />
        </View>

        {/* Import de données */}
        <Pressable
          style={styles.action}
          onPress={() => router.push('/import')}
          accessibilityRole="button"
          accessibilityLabel="Importer mon historique"
        >
          <Ionicons name="cloud-upload-outline" size={22} color={couleurs.accent} />
          <View style={styles.actionTexte}>
            <Text style={styles.actionTitre}>Importer mon historique</Text>
            <Text style={styles.actionSousTitre}>Depuis un export Netflix ou TV Time (CSV)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={couleurs.texteDoux} />
        </Pressable>

        {/* Connexion Trakt.tv */}
        <Pressable
          style={styles.action}
          onPress={() => router.push('/trakt')}
          accessibilityRole="button"
          accessibilityLabel="Connecter Trakt.tv"
        >
          <Ionicons name="sync-outline" size={22} color={couleurs.accent} />
          <View style={styles.actionTexte}>
            <Text style={styles.actionTitre}>Connecter Trakt.tv</Text>
            <Text style={styles.actionSousTitre}>Synchro auto de l'historique et des notes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={couleurs.texteDoux} />
        </Pressable>

        {/* Déconnexion */}
        <Pressable
          style={[styles.action, styles.deconnexion]}
          onPress={() => seDeconnecter()}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <Ionicons name="log-out-outline" size={22} color={couleurs.accentRose} />
          <Text
            style={[styles.actionTitre, { color: couleurs.accentRose, marginLeft: espacements.m }]}
          >
            Se déconnecter
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Petit bloc statistique (valeur + libellé). */
function Stat({ valeur, libelle }: { valeur: number; libelle: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValeur}>{valeur}</Text>
      <Text style={styles.statLibelle}>{libelle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espacements.m },
  enTete: {
    color: couleurs.texte,
    fontSize: polices.grandTitre,
    fontWeight: '800',
    marginBottom: espacements.l,
  },
  carte: {
    alignItems: 'center',
    backgroundColor: couleurs.surface,
    borderRadius: rayons.l,
    padding: espacements.l,
    marginBottom: espacements.m,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.m,
  },
  email: { color: couleurs.texte, fontSize: polices.moyenne, fontWeight: '600' },
  statsLigne: {
    flexDirection: 'row',
    backgroundColor: couleurs.surface,
    borderRadius: rayons.l,
    paddingVertical: espacements.l,
    marginBottom: espacements.l,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValeur: { color: couleurs.accent, fontSize: polices.grandTitre, fontWeight: '800' },
  statLibelle: { color: couleurs.texteDoux, fontSize: polices.normale, marginTop: espacements.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.surface,
    borderRadius: rayons.m,
    padding: espacements.m,
    marginBottom: espacements.m,
  },
  actionTexte: { flex: 1, marginLeft: espacements.m },
  actionTitre: { color: couleurs.texte, fontSize: polices.moyenne, fontWeight: '600' },
  actionSousTitre: { color: couleurs.texteDoux, fontSize: polices.petite, marginTop: 2 },
  deconnexion: { justifyContent: 'center' },
});
