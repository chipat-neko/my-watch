// =============================================================================
//  Écran : Import d'historique (Netflix / TV Time)
//  ---------------------------------------------------------------------------
//  Permet de récupérer un historique existant à partir d'un fichier CSV :
//   - Netflix  : compte -> "Activité de visionnage" -> Télécharger tout
//   - TV Time  : export RGPD sur gdpr.tvtime.com (à faire AVANT le 15/07/2026)
//
//  Étapes : 1) choisir le fichier  2) aperçu du nombre de titres détectés
//           3) import (avec barre de progression) vers la bibliothèque.
//
//  Rappel important affiché à l'utilisateur : il n'existe pas d'API officielle
//  pour connecter directement un compte Netflix ; l'import de fichier est la
//  méthode fiable et légale.
// =============================================================================

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { lireFichierTexte } from '@/lib/fichier';
import { analyserCsv, importer, ResultatImport } from '@/services/import';
import { LigneImport } from '@/types';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, polices, rayons } from '@/theme/theme';

export default function EcranImport() {
  const router = useRouter();
  const { accent, encre } = useVariante();
  const [lignes, setLignes] = useState<LigneImport[]>([]);
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [progression, setProgression] = useState<{ fait: number; total: number } | null>(null);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /** Étape 1 : choix du fichier + analyse locale (aperçu). */
  async function choisirFichier() {
    setErreur(null);
    setResultat(null);
    try {
      const choix = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (choix.canceled || !choix.assets?.[0]) return;

      const fichier = choix.assets[0];
      const contenu = await lireFichierTexte(fichier.uri);
      const analyse = analyserCsv(contenu);

      setNomFichier(fichier.name);
      setLignes(analyse);
      if (analyse.length === 0) {
        setErreur(
          "Aucun titre détecté dans ce fichier. Vérifie qu'il s'agit bien d'un CSV Netflix ou TV Time."
        );
      }
    } catch {
      setErreur('Impossible de lire ce fichier.');
    }
  }

  /** Étape 3 : import réel vers la bibliothèque. */
  async function lancerImport() {
    setProgression({ fait: 0, total: lignes.length });
    const res = await importer(lignes, (fait, total) => setProgression({ fait, total }));
    setProgression(null);
    setResultat(res);
  }

  return (
    <SafeAreaView style={styles.ecran}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Barre de titre avec fermeture */}
      <View style={styles.barre}>
        <Text style={styles.titre}>Importer mon historique</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={26} color={couleurs.texte} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.aide}>
          Récupère ton historique depuis un fichier CSV. Sur Netflix : « Compte » → « Activité de
          visionnage » → « Télécharger tout ». Sur TV Time : export RGPD (à faire avant sa
          fermeture).
        </Text>

        {/* Bouton de sélection */}
        <Pressable style={styles.bouton} onPress={choisirFichier} accessibilityRole="button">
          <Ionicons name="document-attach-outline" size={20} color={couleurs.texte} />
          <Text style={styles.boutonTexte}>Choisir un fichier CSV</Text>
        </Pressable>

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        {/* Aperçu */}
        {nomFichier && lignes.length > 0 && !resultat ? (
          <View style={styles.apercu}>
            <Text style={styles.apercuTitre}>{nomFichier}</Text>
            <Text style={styles.apercuTexte}>
              {lignes.length} titre(s) détecté(s) prêt(s) à importer.
            </Text>

            <Pressable
              style={[
                styles.bouton,
                styles.boutonAccent,
                { backgroundColor: accent, shadowColor: accent },
              ]}
              onPress={lancerImport}
              disabled={progression !== null}
              accessibilityRole="button"
              accessibilityState={{ disabled: progression !== null }}
            >
              {/* `encre` et non blanc : le blanc sur l'accent turquoise échoue au
                  rapport de contraste de 4,5:1. */}
              <Text style={[styles.boutonTexte, { color: encre }]}>
                {progression
                  ? `Import… ${progression.fait}/${progression.total}`
                  : `Importer ${lignes.length} titre(s)`}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Résultat final */}
        {resultat ? (
          <View style={styles.apercu}>
            <Ionicons name="checkmark-circle" size={40} color={couleurs.succes} />
            <Text style={styles.apercuTitre}>Import terminé</Text>
            <Text style={styles.apercuTexte}>
              {resultat.importes} titre(s) ajouté(s).
              {resultat.echecs.length > 0
                ? ` ${resultat.echecs.length} non trouvé(s) sur TMDb.`
                : ''}
            </Text>
            <Pressable
              style={[
                styles.bouton,
                styles.boutonAccent,
                { backgroundColor: accent, shadowColor: accent },
              ]}
              onPress={() => router.back()}
              accessibilityRole="button"
            >
              <Text style={[styles.boutonTexte, { color: encre }]}>Terminer</Text>
            </Pressable>
          </View>
        ) : null}
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
    marginBottom: espacements.l,
  },
  bouton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surface2,
    borderRadius: rayons.m,
    paddingVertical: espacements.m,
    marginTop: espacements.s,
  },
  boutonAccent: {
    marginTop: espacements.l,
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  boutonTexte: {
    color: couleurs.texte,
    fontFamily: familles.bold,
    fontSize: polices.moyenne,
    marginLeft: espacements.s,
  },
  erreur: { color: couleurs.accentRose, marginTop: espacements.m, fontSize: polices.normale },
  apercu: {
    backgroundColor: couleurs.surface,
    borderRadius: rayons.l,
    padding: espacements.l,
    marginTop: espacements.l,
    alignItems: 'center',
  },
  apercuTitre: {
    color: couleurs.texte,
    fontSize: polices.moyenne,
    fontFamily: familles.bold,
    marginTop: espacements.s,
  },
  apercuTexte: {
    color: couleurs.texteDoux,
    fontSize: polices.normale,
    textAlign: 'center',
    marginTop: espacements.xs,
  },
});
