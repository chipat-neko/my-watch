// =============================================================================
//  Écran : Profil
//  ---------------------------------------------------------------------------
//  Adresse e-mail, statistiques de suivi, choix de l'apparence, import de
//  données (Netflix / TV Time), connexion Trakt et déconnexion.
//
//  Note : cet écran choisit la couleur d'accent de l'application — il serait
//  absurde qu'il soit le seul à ne pas la respecter. C'était pourtant le cas :
//  l'avatar, les icônes, l'interrupteur et les chiffres étaient figés en
//  turquoise, y compris en variante bleue ou rose.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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
import { useVariante, ACCENTS, LIBELLES_VARIANTE, Variante } from '@/hooks/useVariante';
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

export default function EcranProfil() {
  const { utilisateur, seDeconnecter } = useAuth();
  const { variante, accent, encre, definirVariante } = useVariante();
  const router = useRouter();
  const { width: fenetre } = useWindowDimensions();
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [notifs, setNotifs] = useState(false);
  const [notifsOccupe, setNotifsOccupe] = useState(false);

  const grandEcran = fenetre >= seuilLarge;
  const largeurUtile = fenetre - (grandEcran ? largeurRail : 0);
  const d = densiteDe(largeurUtile);
  const t = typo(d);
  const padding = paddingEcran(largeurUtile);

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
      <ScrollView
        contentContainerStyle={[styles.contenu, { paddingHorizontal: padding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[t.h1, styles.enTete]}>Profil</Text>

        {/* Carte utilisateur */}
        <View style={styles.carte}>
          <View style={[styles.avatar, { backgroundColor: accent }]}>
            <Ionicons name="person" size={26} color={encre} />
          </View>
          <Text style={[t.h3, { color: couleurs.texte }]}>
            {utilisateur?.email ?? 'Utilisateur'}
          </Text>
          <Text style={[t.caption, { color: couleurs.texteFaible, marginTop: 2 }]}>
            Membre de My Watch
          </Text>
        </View>

        {/* Statistiques : une grille 2×2 de cartes, chacune avec sa couleur.
            Trois chiffres alignés sur une barre plate ne créent aucun point
            d'accroche — c'est ce qui rendait cet écran le plus vide de l'app. */}
        <View style={styles.stats}>
          <Stat
            valeur={stats?.nbSeries ?? 0}
            libelle="Séries suivies"
            couleur={couleurs.succes}
            icone="tv"
            densite={d}
          />
          <Stat
            valeur={stats?.nbFilms ?? 0}
            libelle="Films"
            couleur={couleurs.statBleu}
            icone="film"
            densite={d}
          />
          <Stat
            valeur={stats?.nbEpisodesVus ?? 0}
            libelle="Épisodes vus"
            couleur={couleurs.statOr}
            icone="play-circle"
            densite={d}
          />
          <Stat
            valeur={stats?.nbTermines ?? 0}
            libelle="Terminés"
            couleur={couleurs.accentRose}
            icone="checkmark-done"
            densite={d}
          />
        </View>

        {/* Apparence : direction visuelle (classic / grid / social) */}
        <Text style={[t.overline, styles.sectionLabel]}>APPARENCE</Text>
        <View style={styles.variantes}>
          {(['classic', 'grid', 'social'] as Variante[]).map((v) => {
            const actif = variante === v;
            return (
              <Pressable
                key={v}
                onPress={() => definirVariante(v)}
                accessibilityRole="button"
                accessibilityState={{ selected: actif }}
                accessibilityLabel={`Apparence ${LIBELLES_VARIANTE[v]}`}
                style={({ hovered, pressed }: EtatPressable) => [
                  styles.varianteBtn,
                  { borderColor: actif ? ACCENTS[v].accent : couleurs.bordure },
                  actif && { backgroundColor: `${ACCENTS[v].accent}14` },
                  hovered && !actif && { backgroundColor: couleurs.surface3 },
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={[styles.varPastille, { backgroundColor: ACCENTS[v].accent }]} />
                <Text style={[t.label, { color: actif ? couleurs.texte : couleurs.texteDoux }]}>
                  {LIBELLES_VARIANTE[v]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[t.overline, styles.sectionLabel]}>RÉGLAGES</Text>

        {/* Réglage : notifications des sorties */}
        <View style={styles.action}>
          <View style={[styles.actionIcone, { backgroundColor: `${accent}1F` }]}>
            <Ionicons name="notifications-outline" size={19} color={accent} />
          </View>
          <View style={styles.actionTexte}>
            <Text style={[t.h3, { color: couleurs.texte }]}>Notifications des sorties</Text>
            <Text style={[t.caption, { color: couleurs.texteFaible, marginTop: 2 }]}>
              Un rappel le jour d&apos;un nouvel épisode
            </Text>
          </View>
          <Switch
            value={notifs}
            onValueChange={basculerNotifs}
            disabled={notifsOccupe}
            trackColor={{ true: accent, false: couleurs.surface2 }}
            thumbColor={couleurs.texte}
            accessibilityLabel="Notifications des sorties"
          />
        </View>

        <Action
          icone="cloud-upload-outline"
          titre="Importer mon historique"
          sous="Depuis un export Netflix ou TV Time (CSV)"
          accent={accent}
          densite={d}
          onPress={() => router.push('/import')}
        />

        <Action
          icone="sync-outline"
          titre="Connecter Trakt.tv"
          sous="Synchro auto de l'historique et des notes"
          accent={accent}
          densite={d}
          onPress={() => router.push('/trakt')}
        />

        {/* Déconnexion : couleur sémantique de danger, et visuellement séparée
            des actions ordinaires. */}
        <Pressable
          style={({ hovered, pressed }: EtatPressable) => [
            styles.action,
            styles.deconnexion,
            hovered && {
              backgroundColor: `${couleurs.accentRose}14`,
              borderColor: couleurs.accentRose,
            },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => seDeconnecter()}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <Ionicons name="log-out-outline" size={20} color={couleurs.accentRose} />
          <Text style={[t.label, { color: couleurs.accentRose }]}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Une carte de statistique : chiffre, libellé, et sa couleur propre. */
function Stat({
  valeur,
  libelle,
  couleur,
  icone,
  densite,
}: {
  valeur: number;
  libelle: string;
  couleur: string;
  icone: keyof typeof Ionicons.glyphMap;
  densite: 'mobile' | 'desktop';
}) {
  const t = typo(densite);
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcone, { backgroundColor: `${couleur}1F` }]}>
        <Ionicons name={icone} size={16} color={couleur} />
      </View>
      <Text
        style={[styles.statValeur, { color: couleur, fontSize: densite === 'desktop' ? 34 : 30 }]}
      >
        {valeur}
      </Text>
      <Text style={[t.caption, { color: couleurs.texteFaible }]}>{libelle}</Text>
    </View>
  );
}

/** Une ligne d'action : icône teintée, titre, sous-titre, chevron. */
function Action({
  icone,
  titre,
  sous,
  accent,
  densite,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  sous: string;
  accent: string;
  densite: 'mobile' | 'desktop';
  onPress: () => void;
}) {
  const t = typo(densite);
  return (
    <Pressable
      style={({ hovered, pressed }: EtatPressable) => [
        styles.action,
        hovered && { backgroundColor: couleurs.surface3, borderColor: couleurs.bordure2 },
        pressed && { opacity: 0.9 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titre}
    >
      <View style={[styles.actionIcone, { backgroundColor: `${accent}1F` }]}>
        <Ionicons name={icone} size={19} color={accent} />
      </View>
      <View style={styles.actionTexte}>
        <Text style={[t.h3, { color: couleurs.texte }]}>{titre}</Text>
        <Text style={[t.caption, { color: couleurs.texteFaible, marginTop: 2 }]}>{sous}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.texteFaible} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Colonne unique : conteneur « standard », pas la largeur des grilles.
  contenu: {
    width: '100%',
    maxWidth: conteneurs.standard,
    alignSelf: 'center',
    paddingBottom: espacements.section,
  },
  enTete: { color: couleurs.texte, paddingTop: espacements.sm, marginBottom: espacements.ml },
  carte: {
    alignItems: 'center',
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
    padding: espacements.l,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: rayons.rond,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.sm,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: espacements.sm, marginTop: espacements.sm },
  stat: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
    padding: espacements.ml,
  },
  statIcone: {
    width: 32,
    height: 32,
    borderRadius: rayons.s,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.s,
  },
  statValeur: {
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -1,
    // Chiffres à chasse fixe : sinon les compteurs sautent à la mise à jour.
    fontVariant: ['tabular-nums'],
  },
  sectionLabel: {
    color: couleurs.texteFaible,
    marginTop: espacements.section,
    marginBottom: espacements.sm,
  },
  variantes: { flexDirection: 'row', gap: espacements.s },
  varianteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.s,
    height: 48,
    borderRadius: rayons.m,
    borderWidth: 1.5,
    backgroundColor: couleurs.surface,
    cursor: 'pointer',
  },
  varPastille: { width: 12, height: 12, borderRadius: rayons.rond },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
    padding: espacements.sm,
    marginBottom: espacements.s,
    cursor: 'pointer',
  },
  actionIcone: {
    width: 40,
    height: 40,
    borderRadius: rayons.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTexte: { flex: 1 },
  deconnexion: {
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderColor: couleurs.bordure2,
    marginTop: espacements.ml,
    height: 52,
  },
});
