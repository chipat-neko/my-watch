// =============================================================================
//  Écran : Import d'historique (Netflix / TV Time)
//  ---------------------------------------------------------------------------
//  Récupère un historique existant à partir d'un fichier :
//   - Netflix  : compte -> « Activité de visionnage » -> Télécharger tout (.csv)
//   - TV Time  : export RGPD sur gdpr.tvtime.com (une ARCHIVE .zip)
//
//  Deux corrections importantes par rapport à la première version :
//
//   1. L'archive TV Time est lue DIRECTEMENT. Il fallait auparavant l'extraire à
//      la main et importer chaque CSV un par un.
//   2. Le statut n'est plus imposé. Tout arrivait en « terminé », si bien que des
//      séries à peine commencées étaient déclarées finies. Il est maintenant
//      déduit du fichier quand c'est possible, et DEMANDÉ sinon.
//
//  Rappel affiché : il n'existe pas d'API officielle pour connecter un compte
//  Netflix ; l'import de fichier est la méthode fiable et légale.
// =============================================================================

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { lireFichierBinaire, lireFichierTexte } from '@/lib/fichier';
import { estArchive, FichierArchive, lireArchive } from '@/services/archive';
import { analyserFichier, importer, NatureFichier, ResultatImport } from '@/services/import';
import { EtatPressable, LigneImport, StatutSuivi } from '@/types';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, polices, rayons } from '@/theme/theme';

/** Les statuts proposés, et ce qu'ils veulent dire pour un import. */
const STATUTS: { valeur: StatutSuivi; libelle: string; aide: string }[] = [
  { valeur: 'termine', libelle: 'Terminé', aide: 'Déjà vu en entier' },
  { valeur: 'en_cours', libelle: 'En cours', aide: 'Commencé, pas fini' },
  { valeur: 'a_voir', libelle: 'À voir', aide: 'Prévu, pas commencé' },
];

/**
 * Statut déduit de la nature du fichier.
 *
 * `null` quand on ne peut pas trancher : l'écran demandera. C'est tout l'objet
 * de la correction — deviner « terminé » pour tout était précisément le bug.
 */
function statutDeduit(nature: NatureFichier): StatutSuivi | null {
  switch (nature) {
    case 'historique':
      return 'termine'; // Un historique Netflix liste ce qui a été vu.
    case 'watchlist':
      return 'a_voir';
    case 'suivi':
      return 'en_cours';
    case 'episodes':
      // Le statut n'a pas d'importance : les épisodes vus seront marqués un par
      // un, et c'est eux qui diront où en est la série.
      return 'en_cours';
    default:
      return null;
  }
}

/** Libellé lisible de ce que contient un fichier. */
function libelleNature(nature: NatureFichier): string {
  switch (nature) {
    case 'historique':
      return 'Historique de visionnage';
    case 'episodes':
      return 'Épisodes vus';
    case 'watchlist':
      return 'À voir plus tard';
    case 'suivi':
      return 'Séries suivies';
    default:
      return 'Contenu non identifié';
  }
}

export default function EcranImport() {
  const router = useRouter();
  const { accent, encre } = useVariante();

  const [nomFichier, setNomFichier] = useState<string | null>(null);
  /** Les fichiers exploitables : un seul pour un CSV, plusieurs pour une archive. */
  const [fichiers, setFichiers] = useState<FichierArchive[]>([]);
  const [choisi, setChoisi] = useState(0);
  const [statut, setStatut] = useState<StatutSuivi>('termine');
  const [progression, setProgression] = useState<{ fait: number; total: number } | null>(null);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const fichier: FichierArchive | undefined = fichiers[choisi];
  const lignes: LigneImport[] = fichier?.lignes ?? [];
  const deduit = fichier ? statutDeduit(fichier.nature) : null;
  const nbEpisodes = lignes.reduce((n, l) => n + (l.episodes?.length ?? 0), 0);

  /** Étape 1 : choix du fichier + analyse locale (aperçu). */
  async function choisirFichier() {
    setErreur(null);
    setResultat(null);
    setFichiers([]);
    try {
      const choix = await DocumentPicker.getDocumentAsync({
        // `*/*` reste nécessaire : les .zip et .csv sont typés de façon
        // capricieuse selon les plateformes, et un filtre trop strict empêche
        // purement et simplement de sélectionner le fichier.
        type: ['text/csv', 'text/comma-separated-values', 'application/zip', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (choix.canceled || !choix.assets?.[0]) return;

      const asset = choix.assets[0];
      setNomFichier(asset.name);

      let trouves: FichierArchive[];
      if (estArchive(asset.name)) {
        // L'archive TV Time telle qu'elle est téléchargée : plus besoin de
        // l'extraire, ni d'importer ses fichiers un par un.
        const octets = await lireFichierBinaire(asset.uri);
        trouves = await lireArchive(octets);
      } else {
        const contenu = await lireFichierTexte(asset.uri);
        const analyse = analyserFichier(contenu, asset.name);
        trouves = [{ nom: asset.name, ...analyse }];
      }

      const utiles = trouves.filter((f) => f.lignes.length > 0);
      setFichiers(utiles);
      setChoisi(0);

      if (utiles.length === 0) {
        setErreur(
          estArchive(asset.name)
            ? 'Aucun fichier exploitable dans cette archive. Vérifie qu’il s’agit bien de l’export TV Time.'
            : 'Aucun titre détecté. Vérifie qu’il s’agit bien d’un CSV Netflix ou TV Time.'
        );
        return;
      }
      setStatut(statutDeduit(utiles[0].nature) ?? 'termine');
    } catch {
      setErreur('Impossible de lire ce fichier.');
    }
  }

  /** Étape 3 : import réel vers la bibliothèque. */
  async function lancerImport() {
    setProgression({ fait: 0, total: lignes.length });
    try {
      const res = await importer(lignes, statut, (fait, total) => setProgression({ fait, total }));
      setResultat(res);
    } catch {
      setErreur('L’import a échoué. Réessaie.');
    } finally {
      setProgression(null);
    }
  }

  return (
    <SafeAreaView style={styles.ecran}>
      <Stack.Screen options={{ headerShown: false }} />

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
          Sur Netflix : « Compte » → « Activité de visionnage » → « Télécharger tout » (.csv). Sur
          TV Time : export RGPD sur gdpr.tvtime.com — dépose l’archive .zip telle quelle, sans
          l’extraire.
        </Text>

        <Pressable style={styles.bouton} onPress={choisirFichier} accessibilityRole="button">
          <Ionicons name="document-attach-outline" size={20} color={couleurs.texte} />
          <Text style={styles.boutonTexte}>Choisir un fichier (.csv ou .zip)</Text>
        </Pressable>

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

        {fichiers.length > 0 && !resultat ? (
          <View style={styles.apercu}>
            <Text style={styles.apercuTitre}>{nomFichier}</Text>

            {/* Une archive contient plusieurs fichiers : on les liste au lieu
                d'obliger à les déposer un par un. */}
            {fichiers.length > 1 ? (
              <>
                <Text style={styles.section}>
                  {fichiers.length} fichiers trouvés dans l’archive. Lequel importer ?
                </Text>
                {fichiers.map((f, i) => {
                  const actif = i === choisi;
                  return (
                    <Pressable
                      key={f.nom}
                      onPress={() => {
                        setChoisi(i);
                        setStatut(statutDeduit(f.nature) ?? 'termine');
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: actif }}
                      style={({ hovered }: EtatPressable) => [
                        styles.ligneFichier,
                        actif && { borderColor: accent, backgroundColor: `${accent}14` },
                        hovered && !actif && { borderColor: couleurs.bordure2 },
                      ]}
                    >
                      <Ionicons
                        name={actif ? 'radio-button-on' : 'radio-button-off'}
                        size={17}
                        color={actif ? accent : couleurs.texteFaible}
                      />
                      <View style={styles.ligneFichierTexte}>
                        <Text style={styles.nomFichier} numberOfLines={1}>
                          {libelleNature(f.nature)}
                        </Text>
                        <Text style={styles.sousFichier} numberOfLines={1}>
                          {f.nom} · {f.lignes.length} titre{f.lignes.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : null}

            <Text style={styles.apercuTexte}>
              {lignes.length} titre{lignes.length > 1 ? 's' : ''} détecté
              {lignes.length > 1 ? 's' : ''}
              {nbEpisodes > 0 ? `, ${nbEpisodes} épisodes vus` : ''}.
            </Text>

            {/* Le cœur de la correction : quand le fichier ne dit pas où en sont
                les titres, on DEMANDE au lieu de supposer « terminé ». */}
            {nbEpisodes > 0 ? (
              <View style={[styles.info, { borderColor: `${accent}59` }]}>
                <Ionicons name="checkmark-done" size={16} color={accent} />
                <Text style={[styles.infoTexte, { color: accent }]}>
                  Les épisodes vus seront cochés un par un : l’avancement de chaque série sera
                  exact, sans supposition.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.section}>
                  {deduit
                    ? 'Statut à appliquer (déduit du fichier) :'
                    : 'Ce fichier ne dit pas où en sont ces titres. Quel statut leur donner ?'}
                </Text>
                <View style={styles.statuts}>
                  {STATUTS.map((s) => {
                    const actif = s.valeur === statut;
                    return (
                      <Pressable
                        key={s.valeur}
                        onPress={() => setStatut(s.valeur)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: actif }}
                        accessibilityLabel={`${s.libelle} — ${s.aide}`}
                        style={({ hovered }: EtatPressable) => [
                          styles.statutBtn,
                          actif && { borderColor: accent, backgroundColor: `${accent}14` },
                          hovered && !actif && { borderColor: couleurs.bordure2 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statutLibelle,
                            { color: actif ? accent : couleurs.texteCorps },
                          ]}
                        >
                          {s.libelle}
                        </Text>
                        <Text style={styles.statutAide}>{s.aide}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

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
                  : `Importer ${lignes.length} titre${lignes.length > 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {resultat ? (
          <View style={styles.apercu}>
            <Ionicons name="checkmark-circle" size={40} color={couleurs.succes} />
            <Text style={styles.apercuTitre}>Import terminé</Text>
            <Text style={styles.apercuTexte}>
              {resultat.importes} titre{resultat.importes > 1 ? 's' : ''} ajouté
              {resultat.importes > 1 ? 's' : ''}.
              {resultat.episodes > 0
                ? ` ${resultat.episodes} épisode${resultat.episodes > 1 ? 's' : ''} coché${resultat.episodes > 1 ? 's' : ''}.`
                : ''}
              {resultat.echecs.length > 0
                ? ` ${resultat.echecs.length} non trouvé${resultat.echecs.length > 1 ? 's' : ''} sur TMDb.`
                : ''}
            </Text>

            {/* Reste-t-il d'autres fichiers dans l'archive ? On le dit, plutôt
                que de laisser croire que tout est fait. */}
            {fichiers.length > 1 ? (
              <Text style={styles.sousFichier}>
                L’archive contient {fichiers.length} fichiers : reviens ici pour importer les
                autres.
              </Text>
            ) : null}

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
    fontFamily: familles.medium,
    lineHeight: 20,
    marginBottom: espacements.l,
  },
  bouton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.s,
    backgroundColor: couleurs.surface2,
    borderRadius: rayons.m,
    paddingVertical: espacements.m,
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
  },
  erreur: { color: couleurs.accentRose, marginTop: espacements.m, fontSize: polices.normale },
  apercu: {
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
    padding: espacements.ml,
    marginTop: espacements.l,
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
    fontFamily: familles.medium,
    marginTop: espacements.s,
  },
  section: {
    color: couleurs.texteCorps,
    fontSize: polices.normale,
    fontFamily: familles.semibold,
    marginTop: espacements.ml,
    marginBottom: espacements.s,
  },
  ligneFichier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.m,
    padding: espacements.sm,
    marginBottom: espacements.s,
    cursor: 'pointer',
  },
  ligneFichierTexte: { flex: 1 },
  nomFichier: { color: couleurs.texte, fontSize: polices.normale, fontFamily: familles.semibold },
  sousFichier: {
    color: couleurs.texteFaible,
    fontSize: polices.petite,
    fontFamily: familles.medium,
    marginTop: 2,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    borderWidth: 1,
    borderRadius: rayons.m,
    padding: espacements.sm,
    marginTop: espacements.m,
  },
  infoTexte: { flex: 1, fontSize: polices.petite, fontFamily: familles.medium, lineHeight: 17 },
  statuts: { flexDirection: 'row', gap: espacements.s },
  statutBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
    borderRadius: rayons.m,
    padding: espacements.sm,
    cursor: 'pointer',
  },
  statutLibelle: { fontSize: polices.normale, fontFamily: familles.bold },
  statutAide: {
    color: couleurs.texteFaible,
    fontSize: 11,
    fontFamily: familles.medium,
    marginTop: 2,
  },
});
