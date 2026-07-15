// =============================================================================
//  Écran : Connexion Trakt.tv
//  ---------------------------------------------------------------------------
//  Connecte un compte Trakt via le "device flow" : on affiche un code que
//  l'utilisateur saisit sur trakt.tv/activate, puis on sonde l'autorisation.
//  Une fois connecté, on peut synchroniser l'historique et les notes.
// =============================================================================

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Chargement } from '@/components/Chargement';
import { attendre } from '@/services/async';
import {
  traktConfigure,
  estConnecteTrakt,
  demarrerAppairage,
  sonderAppairage,
  deconnecterTrakt,
  synchroniserDepuisTrakt,
  CodeAppareil,
  EtatSondage,
  ResultatSyncTrakt,
} from '@/services/trakt';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, polices, rayons } from '@/theme/theme';

export default function EcranTrakt() {
  const router = useRouter();
  const { accent, encre } = useVariante();
  const [configure] = useState(traktConfigure());
  const [connecte, setConnecte] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [code, setCode] = useState<CodeAppareil | null>(null);
  const [statut, setStatut] = useState<string | null>(null);
  const [progression, setProgression] = useState<{ fait: number; total: number } | null>(null);
  const [resultat, setResultat] = useState<ResultatSyncTrakt | null>(null);

  useEffect(() => {
    estConnecteTrakt().then((c) => {
      setConnecte(c);
      setChargement(false);
    });
  }, []);

  // Sonde le device flow tant qu'un code d'appairage est actif.
  useEffect(() => {
    if (!code) return;
    let actif = true;
    const debut = Date.now();
    (async () => {
      while (actif) {
        await attendre(code.interval * 1000);
        if (!actif) return;
        if (Date.now() - debut > code.expiresIn * 1000) {
          setStatut('Code expiré, réessaie.');
          setCode(null);
          return;
        }
        let etat: EtatSondage;
        try {
          etat = await sonderAppairage(code.deviceCode);
        } catch {
          etat = 'en_attente';
        }
        if (!actif) return;
        if (etat === 'ok') {
          setConnecte(true);
          setCode(null);
          setStatut('Connecté à Trakt ! Tu peux lancer la synchronisation.');
          return;
        }
        if (etat === 'refuse') {
          setStatut('Connexion refusée.');
          setCode(null);
          return;
        }
        if (etat === 'expire') {
          setStatut('Code expiré, réessaie.');
          setCode(null);
          return;
        }
        // 'en_attente' -> on continue de sonder.
      }
    })();
    return () => {
      actif = false;
    };
  }, [code]);

  async function connecter() {
    setStatut(null);
    setResultat(null);
    try {
      const c = await demarrerAppairage();
      setCode(c);
      setStatut(`Ouvre ${c.url} et saisis le code ci-dessous.`);
      Linking.openURL(c.url).catch(() => {});
    } catch {
      setStatut('Impossible de démarrer la connexion Trakt.');
    }
  }

  async function lancerSync() {
    setResultat(null);
    setStatut(null);
    setProgression({ fait: 0, total: 0 });
    try {
      const r = await synchroniserDepuisTrakt((fait, total) => setProgression({ fait, total }));
      setResultat(r);
    } catch {
      setStatut('Erreur pendant la synchronisation.');
    } finally {
      setProgression(null);
    }
  }

  async function deconnecter() {
    await deconnecterTrakt();
    setConnecte(false);
    setResultat(null);
    setStatut(null);
  }

  return (
    <SafeAreaView style={styles.ecran}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.barre}>
        <Text style={styles.titre}>Connexion Trakt.tv</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={26} color={couleurs.texte} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.contenu}>
        {!configure ? (
          // Le message expliquait quoi coller, pas où le trouver. Et il ne
          // s'affichait même pas : `colle_ici_ton_client_id` n'étant pas vide,
          // l'app se croyait configurée et échouait en silence.
          <View>
            <View style={[styles.alerte, { borderColor: couleurs.statOr }]}>
              <Ionicons name="warning-outline" size={18} color={couleurs.statOr} />
              <Text style={[styles.alerteTexte, { color: couleurs.statOr }]}>
                Trakt n’est pas encore configuré. My Watch a besoin de sa propre application Trakt —
                elle se crée en deux minutes, gratuitement.
              </Text>
            </View>

            <Text style={styles.etapeTitre}>1. Crée l’application</Text>
            <Text style={styles.aide}>
              Va sur trakt.tv/oauth/applications → « New Application ». Mets « My Watch » en nom, et
              dans « Redirect URI » : urn:ietf:wg:oauth:2.0:oob (c’est ce qui autorise la connexion
              par code, sans navigateur intégré).
            </Text>

            <Pressable
              onPress={() => Linking.openURL('https://trakt.tv/oauth/applications/new')}
              accessibilityRole="link"
              style={[styles.bouton, { marginTop: espacements.s }]}
            >
              <Ionicons name="open-outline" size={18} color={couleurs.texte} />
              <Text style={styles.boutonTexte}>Ouvrir Trakt</Text>
            </Pressable>

            <Text style={styles.etapeTitre}>2. Colle les deux clés</Text>
            <Text style={styles.aide}>
              Trakt affiche un « Client ID » et un « Client Secret » : deux longues suites de 64
              caractères. Copie-les dans le fichier .env, à la place de
              colle_ici_ton_client_id_trakt :
            </Text>
            <View style={styles.bloc}>
              <Text style={styles.code}>EXPO_PUBLIC_TRAKT_CLIENT_ID=…</Text>
              <Text style={styles.code}>EXPO_PUBLIC_TRAKT_CLIENT_SECRET=…</Text>
            </View>

            <Text style={styles.etapeTitre}>3. Redéploie</Text>
            <Text style={styles.aide}>
              Les clés sont lues à la construction : lance npm run deploy:web pour que le site les
              prenne en compte.
            </Text>
          </View>
        ) : chargement ? (
          <Chargement />
        ) : connecte ? (
          <View>
            <Text style={styles.aide}>
              Ton compte Trakt est connecté. Lance la synchronisation pour importer ton historique
              (séries, films) et tes notes.
            </Text>
            <Pressable
              style={[
                styles.bouton,
                styles.boutonAccent,
                { backgroundColor: accent, shadowColor: accent },
              ]}
              onPress={lancerSync}
              disabled={progression !== null}
              accessibilityRole="button"
              accessibilityState={{ disabled: progression !== null }}
            >
              {/* `encre` et non blanc : le blanc sur l'accent turquoise échoue au
                  rapport de contraste de 4,5:1. */}
              <Text style={[styles.boutonTexte, { color: encre }]}>
                {progression
                  ? progression.total
                    ? `Synchronisation… ${progression.fait}/${progression.total}`
                    : 'Synchronisation…'
                  : 'Synchroniser maintenant'}
              </Text>
            </Pressable>

            {resultat ? (
              <Text style={styles.aide}>
                {resultat.importes} titre(s) importé(s)
                {resultat.echecs > 0 ? `, ${resultat.echecs} échec(s).` : '.'}
              </Text>
            ) : null}

            <Pressable style={styles.bouton} onPress={deconnecter} accessibilityRole="button">
              <Text style={styles.boutonTexte}>Déconnecter Trakt</Text>
            </Pressable>
          </View>
        ) : code ? (
          <View style={styles.apercu}>
            <Text style={styles.aide}>Sur {code.url}, saisis ce code :</Text>
            <Text style={[styles.codeAppairage, { color: accent }]}>{code.userCode}</Text>
            <Text style={styles.aide}>En attente d'autorisation…</Text>
          </View>
        ) : (
          <Pressable
            style={[
              styles.bouton,
              styles.boutonAccent,
              { backgroundColor: accent, shadowColor: accent },
            ]}
            onPress={connecter}
            accessibilityRole="button"
          >
            <Text style={[styles.boutonTexte, { color: encre }]}>Connecter mon compte Trakt</Text>
          </Pressable>
        )}

        {statut ? <Text style={styles.statut}>{statut}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: espacements.m,
  },
  titre: { color: couleurs.texte, fontSize: polices.titre, fontFamily: familles.extrabold },
  contenu: { padding: espacements.m },
  aide: {
    color: couleurs.texteDoux,
    fontSize: polices.normale,
    lineHeight: 20,
    marginVertical: espacements.m,
  },
  bouton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surface2,
    borderRadius: rayons.m,
    paddingVertical: espacements.m,
    marginTop: espacements.m,
  },
  boutonAccent: {
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  boutonTexte: { color: couleurs.texte, fontFamily: familles.bold, fontSize: polices.moyenne },
  alerte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    borderWidth: 1,
    borderRadius: rayons.m,
    padding: espacements.sm,
    marginBottom: espacements.l,
  },
  alerteTexte: { flex: 1, fontSize: polices.normale, fontFamily: familles.medium, lineHeight: 19 },
  etapeTitre: {
    color: couleurs.texte,
    fontSize: polices.moyenne,
    fontFamily: familles.bold,
    marginTop: espacements.l,
    marginBottom: espacements.xs,
  },
  bloc: {
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderRadius: rayons.s,
    padding: espacements.sm,
    marginTop: espacements.s,
    gap: 4,
  },
  // Chasse fixe : une clé se recopie caractère par caractère.
  code: { color: couleurs.texteCorps, fontSize: 12, fontFamily: 'monospace' },
  apercu: {
    backgroundColor: couleurs.surface,
    borderRadius: rayons.l,
    padding: espacements.l,
    alignItems: 'center',
    marginTop: espacements.m,
  },
  codeAppairage: {
    fontSize: 34,
    fontFamily: familles.extrabold,
    letterSpacing: 4,
    marginVertical: espacements.m,
    // Chiffres à chasse fixe : un code d'appairage qui gigote pendant qu'on le
    // recopie est pénible.
    fontVariant: ['tabular-nums'],
  },
  statut: { color: couleurs.texteDoux, fontSize: polices.normale, marginTop: espacements.l },
});
