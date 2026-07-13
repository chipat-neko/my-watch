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
import { couleurs, espacements, polices, rayons } from '@/theme/theme';

export default function EcranTrakt() {
  const router = useRouter();
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
          <Text style={styles.aide}>
            Pour utiliser Trakt, renseigne EXPO_PUBLIC_TRAKT_CLIENT_ID et
            EXPO_PUBLIC_TRAKT_CLIENT_SECRET dans ton fichier .env (voir .env.example), puis relance
            l'application.
          </Text>
        ) : chargement ? (
          <Chargement />
        ) : connecte ? (
          <View>
            <Text style={styles.aide}>
              Ton compte Trakt est connecté. Lance la synchronisation pour importer ton historique
              (séries, films) et tes notes.
            </Text>
            <Pressable
              style={[styles.bouton, styles.boutonAccent]}
              onPress={lancerSync}
              disabled={progression !== null}
              accessibilityRole="button"
              accessibilityState={{ disabled: progression !== null }}
            >
              <Text style={styles.boutonTexte}>
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
            <Text style={styles.codeAppairage}>{code.userCode}</Text>
            <Text style={styles.aide}>En attente d'autorisation…</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.bouton, styles.boutonAccent]}
            onPress={connecter}
            accessibilityRole="button"
          >
            <Text style={styles.boutonTexte}>Connecter mon compte Trakt</Text>
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
  titre: { color: couleurs.texte, fontSize: polices.titre, fontWeight: '800' },
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
  boutonAccent: { backgroundColor: couleurs.accent },
  boutonTexte: { color: couleurs.texte, fontWeight: '700', fontSize: polices.moyenne },
  apercu: {
    backgroundColor: couleurs.surface,
    borderRadius: rayons.l,
    padding: espacements.l,
    alignItems: 'center',
    marginTop: espacements.m,
  },
  codeAppairage: {
    color: couleurs.accent,
    fontSize: polices.grandTitre,
    fontWeight: '800',
    letterSpacing: 4,
    marginVertical: espacements.m,
  },
  statut: { color: couleurs.texteDoux, fontSize: polices.normale, marginTop: espacements.l },
});
