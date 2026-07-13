// =============================================================================
//  Écran : Détail d'un titre (film ou série)
//  ---------------------------------------------------------------------------
//  Affiche les informations d'un titre TMDb et permet à l'utilisateur de :
//    - l'ajouter à sa liste avec un statut (À voir / En cours / Terminé)
//    - voir sur quelles plateformes le regarder ("Où regarder")
//    - (séries) parcourir les saisons et cocher les épisodes vus
//
//  Les paramètres d'URL "id" et "type" sont fournis par la navigation
//  (voir router.push({ pathname: '/titre/[id]', params: { id, type } })).
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { detailsTitre, ouRegarder, episodesSaison } from '@/lib/tmdb';
import {
  entreePour,
  ajouterTitre,
  changerStatut,
  retirerTitre,
  noter,
  episodesVusDeLaSerie,
  marquerEpisodeVu,
  demarquerEpisode,
  noterEpisode,
} from '@/services/bibliotheque';
import { Chargement } from '@/components/Chargement';
import { Etoiles } from '@/components/Etoiles';
import { Titre, Episode, StatutSuivi, TypeMedia, EntreeBibliotheque } from '@/types';
import { urlFond, nomsGenres } from '@/theme/constantes';
import { couleurs, espacements, polices, rayons } from '@/theme/theme';

const STATUTS: { libelle: string; valeur: StatutSuivi }[] = [
  { libelle: 'À voir', valeur: 'a_voir' },
  { libelle: 'En cours', valeur: 'en_cours' },
  { libelle: 'Terminé', valeur: 'termine' },
];

export default function EcranDetail() {
  // Récupération et typage des paramètres d'URL.
  const params = useLocalSearchParams<{ id: string; type: TypeMedia }>();
  const id = Number(params.id);
  const type: TypeMedia = params.type === 'film' ? 'film' : 'serie';
  const router = useRouter();

  const [titre, setTitre] = useState<Titre | null>(null);
  const [plateformes, setPlateformes] = useState<string[]>([]);
  const [entree, setEntree] = useState<EntreeBibliotheque | null>(null);
  const [chargement, setChargement] = useState(true);

  // Chargement initial : détails + plateformes + entrée éventuelle en biblio.
  useEffect(() => {
    (async () => {
      try {
        const [t, p, e] = await Promise.all([
          detailsTitre(id, type),
          ouRegarder(id, type).catch(() => []),
          entreePour(id, type).catch(() => null),
        ]);
        setTitre(t);
        setPlateformes(p);
        setEntree(e);
      } finally {
        setChargement(false);
      }
    })();
  }, [id, type]);

  /**
   * Applique un statut : ajoute le titre s'il n'est pas suivi, sinon met à
   * jour son statut. Puis rafraîchit l'entrée locale.
   */
  async function appliquerStatut(statut: StatutSuivi) {
    if (!titre) return;
    if (entree) {
      await changerStatut(entree.id, statut);
    } else {
      await ajouterTitre(titre, statut);
    }
    setEntree(await entreePour(id, type));
  }

  /** Retire complètement le titre de la bibliothèque. */
  async function retirer() {
    if (!entree) return;
    await retirerTitre(entree.id);
    setEntree(null);
  }

  /**
   * Garantit que la série est suivie « en cours » dès qu'on coche un épisode :
   * on l'ajoute si elle n'est pas encore dans la liste, ou on fait passer un
   * simple « à voir » en « en cours ». On ne rétrograde jamais un statut
   * « terminé »/« abandonné » déjà choisi par l'utilisateur.
   */
  async function garantirEnCours() {
    if (!titre) return;
    if (!entree) {
      await ajouterTitre(titre, 'en_cours');
      setEntree(await entreePour(id, type));
    } else if (entree.statut === 'a_voir') {
      await changerStatut(entree.id, 'en_cours');
      setEntree({ ...entree, statut: 'en_cours' });
    }
  }

  /** Attribue (ou efface) la note personnelle du titre. */
  async function noterTitre(note: number | null) {
    if (!entree) return;
    await noter(entree.id, note);
    setEntree({ ...entree, notePerso: note });
  }

  if (chargement || !titre) return <Chargement message="Chargement du titre…" />;

  return (
    <SafeAreaView style={styles.ecran} edges={['bottom']}>
      {/* Masque l'en-tête par défaut : on gère notre propre bouton retour. */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image de fond + dégradé + bouton retour */}
        <ImageBackground
          source={urlFond(titre.cheminFond) ? { uri: urlFond(titre.cheminFond)! } : undefined}
          style={styles.fond}
        >
          <View style={styles.voile} />
          <Pressable
            style={styles.retour}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Revenir en arrière"
          >
            <Ionicons name="chevron-back" size={26} color={couleurs.texte} />
          </Pressable>
        </ImageBackground>

        <View style={styles.corps}>
          <Text style={styles.titre}>{titre.titre}</Text>

          {/* Note + genres */}
          <View style={styles.metaLigne}>
            <Ionicons name="star" size={16} color={couleurs.note} />
            <Text style={styles.note}>{titre.note.toFixed(1)}</Text>
            <Text style={styles.genres}>{nomsGenres(titre.genres).slice(0, 3).join(' · ')}</Text>
          </View>

          {/* Boutons de statut */}
          <View style={styles.statuts}>
            {STATUTS.map((s) => {
              const actif = entree?.statut === s.valeur;
              return (
                <Pressable
                  key={s.valeur}
                  onPress={() => appliquerStatut(s.valeur)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif }}
                  accessibilityLabel={`Statut : ${s.libelle}`}
                  style={[styles.statutBtn, actif && styles.statutBtnActif]}
                >
                  <Text style={[styles.statutTexte, actif && styles.statutTexteActif]}>
                    {s.libelle}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Ma note (titre suivi) */}
          {entree ? (
            <View style={styles.noteBloc}>
              <Text style={styles.noteLabel}>Ma note</Text>
              <Etoiles note={entree.notePerso} onChange={noterTitre} />
            </View>
          ) : null}

          {entree ? (
            <Pressable
              onPress={retirer}
              accessibilityRole="button"
              accessibilityLabel="Retirer de ma liste"
              style={styles.retirer}
            >
              <Ionicons name="trash-outline" size={16} color={couleurs.accentRose} />
              <Text style={styles.retirerTexte}>Retirer de ma liste</Text>
            </Pressable>
          ) : null}

          {/* Date de visionnage (pour un titre terminé) */}
          {entree?.statut === 'termine' && entree.vuLe ? (
            <Text style={styles.vuLe}>
              Vu le{' '}
              {new Date(entree.vuLe).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          ) : null}

          {/* Où regarder */}
          {plateformes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitre}>Où regarder</Text>
              <View style={styles.chips}>
                {plateformes.map((p) => (
                  <View key={p} style={styles.chip}>
                    <Text style={styles.chipTexte}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Synopsis */}
          {titre.synopsis ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitre}>Synopsis</Text>
              <Text style={styles.synopsis}>{titre.synopsis}</Text>
            </View>
          ) : null}

          {/* Épisodes (séries uniquement) */}
          {type === 'serie' ? (
            <BlocEpisodes
              serieId={id}
              nbSaisons={titre.nombreSaisons ?? 0}
              onEpisodeCoche={garantirEnCours}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
//  Sous-composant : liste des épisodes d'une série avec cases "vu"
// -----------------------------------------------------------------------------
function BlocEpisodes({
  serieId,
  nbSaisons,
  onEpisodeCoche,
}: {
  serieId: number;
  /** Nombre de saisons, fourni par le parent (déjà connu via detailsTitre). */
  nbSaisons: number;
  /** Appelé quand un épisode est coché, pour activer le suivi de la série. */
  onEpisodeCoche: () => void;
}) {
  const [saison, setSaison] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [vus, setVus] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Map<number, number | null>>(new Map());
  const [chargement, setChargement] = useState(true);

  // Le nombre de saisons vient du parent : pas de second appel /tv/{id} ici.

  // Épisodes de la saison courante + épisodes déjà vus.
  const rafraichir = useCallback(async () => {
    setChargement(true);
    try {
      const [eps, vusDb] = await Promise.all([
        episodesSaison(serieId, saison),
        episodesVusDeLaSerie(serieId).catch(() => []),
      ]);
      setEpisodes(eps);
      setVus(new Set(vusDb.map((v) => v.episodeId)));
      setNotes(new Map(vusDb.map((v): [number, number | null] => [v.episodeId, v.note])));
    } finally {
      setChargement(false);
    }
  }, [serieId, saison]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  /** Coche/décoche un épisode et met à jour Supabase. */
  async function basculer(ep: Episode) {
    const dejaVu = vus.has(ep.id);
    // Mise à jour optimiste de l'UI (immédiate), puis appel réseau.
    const copie = new Set(vus);
    if (dejaVu) {
      copie.delete(ep.id);
      setVus(copie);
      await demarquerEpisode(ep.id).catch(() => rafraichir());
    } else {
      copie.add(ep.id);
      setVus(copie);
      await marquerEpisodeVu(serieId, ep.id, ep.saison, ep.numero).catch(() => rafraichir());
      // Cocher un épisode fait entrer la série dans le suivi « en cours ».
      onEpisodeCoche();
    }
  }

  /** Note un épisode (ce qui le marque aussi comme vu). */
  async function noterEp(ep: Episode, note: number | null) {
    const etaitVu = vus.has(ep.id);
    // Mise à jour optimiste : la note, et l'épisode passe "vu".
    setNotes((prev) => new Map(prev).set(ep.id, note));
    if (!etaitVu) setVus((prev) => new Set(prev).add(ep.id));
    await noterEpisode(serieId, ep.id, ep.saison, ep.numero, note).catch(() => rafraichir());
    if (!etaitVu && note !== null) onEpisodeCoche();
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitre}>Épisodes</Text>

      {/* Sélecteur de saison */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.saisons}>
        {Array.from({ length: nbSaisons }, (_, i) => i + 1).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSaison(s)}
            accessibilityRole="button"
            accessibilityState={{ selected: s === saison }}
            accessibilityLabel={`Saison ${s}`}
            style={[styles.saisonBtn, s === saison && styles.saisonBtnActif]}
          >
            <Text style={[styles.saisonTexte, s === saison && styles.saisonTexteActif]}>
              Saison {s}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {chargement ? (
        <Chargement />
      ) : (
        episodes.map((ep) => {
          const vu = vus.has(ep.id);
          return (
            <Pressable
              key={ep.id}
              style={styles.episode}
              onPress={() => basculer(ep)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: vu }}
              accessibilityLabel={`Épisode ${ep.numero}${ep.nom ? ', ' + ep.nom : ''}`}
              accessibilityHint={vu ? 'Marquer comme non vu' : 'Marquer comme vu'}
            >
              <Ionicons
                name={vu ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={vu ? couleurs.succes : couleurs.texteDoux}
              />
              <View style={styles.episodeInfos}>
                <Text style={styles.episodeTitre} numberOfLines={1}>
                  {ep.numero}. {ep.nom || 'Épisode ' + ep.numero}
                </Text>
                {ep.dateDiffusion ? (
                  <Text style={styles.episodeDate}>
                    {new Date(ep.dateDiffusion).toLocaleDateString('fr-FR')}
                  </Text>
                ) : null}
                <View style={styles.episodeNote}>
                  <Etoiles
                    note={notes.get(ep.id) ?? null}
                    onChange={(n) => noterEp(ep, n)}
                    taille={16}
                  />
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  fond: { height: 220, justifyContent: 'flex-start', backgroundColor: couleurs.surface2 },
  voile: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,14,26,0.35)' },
  retour: {
    margin: espacements.m,
    width: 40,
    height: 40,
    borderRadius: rayons.rond,
    backgroundColor: 'rgba(14,14,26,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corps: { padding: espacements.m },
  titre: { color: couleurs.texte, fontSize: polices.grandTitre, fontWeight: '800' },
  metaLigne: { flexDirection: 'row', alignItems: 'center', marginTop: espacements.s },
  note: {
    color: couleurs.texte,
    fontWeight: '700',
    marginLeft: espacements.xs,
    marginRight: espacements.m,
  },
  genres: { color: couleurs.texteDoux, fontSize: polices.normale, flexShrink: 1 },
  statuts: { flexDirection: 'row', marginTop: espacements.l },
  statutBtn: {
    flex: 1,
    paddingVertical: espacements.m,
    borderRadius: rayons.m,
    backgroundColor: couleurs.surface2,
    marginRight: espacements.s,
    alignItems: 'center',
  },
  statutBtnActif: { backgroundColor: couleurs.accent },
  statutTexte: { color: couleurs.texteDoux, fontWeight: '600', fontSize: polices.normale },
  statutTexteActif: { color: couleurs.texte },
  retirer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacements.m,
  },
  retirerTexte: {
    color: couleurs.accentRose,
    marginLeft: espacements.xs,
    fontSize: polices.normale,
  },
  vuLe: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.m,
    fontSize: polices.normale,
  },
  noteBloc: { flexDirection: 'row', alignItems: 'center', marginTop: espacements.l },
  noteLabel: { color: couleurs.texteDoux, fontSize: polices.normale, marginRight: espacements.m },
  section: { marginTop: espacements.l },
  sectionTitre: {
    color: couleurs.texte,
    fontSize: polices.titre,
    fontWeight: '700',
    marginBottom: espacements.m,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    backgroundColor: couleurs.surface,
    borderRadius: rayons.rond,
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    marginRight: espacements.s,
    marginBottom: espacements.s,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  chipTexte: { color: couleurs.texte, fontSize: polices.normale },
  synopsis: { color: couleurs.texteDoux, fontSize: polices.moyenne, lineHeight: 22 },
  saisons: { flexDirection: 'row', marginBottom: espacements.m },
  saisonBtn: {
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    marginRight: espacements.s,
  },
  saisonBtnActif: { backgroundColor: couleurs.accent },
  saisonTexte: { color: couleurs.texteDoux, fontWeight: '600' },
  saisonTexteActif: { color: couleurs.texte },
  episode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.m,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  episodeInfos: { flex: 1, marginLeft: espacements.m },
  episodeTitre: { color: couleurs.texte, fontSize: polices.normale, fontWeight: '500' },
  episodeDate: { color: couleurs.texteDoux, fontSize: polices.petite, marginTop: 2 },
  episodeNote: { marginTop: espacements.xs },
});
