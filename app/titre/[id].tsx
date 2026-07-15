// =============================================================================
//  Écran : Détail d'un titre (film ou série)
//  ---------------------------------------------------------------------------
//  Affiche les informations d'un titre TMDb et permet à l'utilisateur de :
//    - l'ajouter à sa liste avec un statut (À voir / En cours / Terminé)
//    - voir sur quelles plateformes le regarder ("Où regarder")
//    - (séries) parcourir les saisons et cocher les épisodes vus
//
//  Les paramètres d'URL "id" et "type" sont fournis par la navigation. On y
//  transmet aussi le titre et l'affiche déjà connus de l'écran appelant : ils
//  s'affichent IMMÉDIATEMENT pendant que TMDb répond, de sorte que l'élément
//  touché « suit » l'utilisateur au lieu de disparaître derrière un spinner.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import { enParallele } from '@/services/async';
import { CocheVu } from '@/components/CocheVu';
import { Etoiles } from '@/components/Etoiles';
import { Progression } from '@/components/Progression';
import { LignesSquelettes, Squelette } from '@/components/Squelette';
import { useVariante } from '@/hooks/useVariante';
import { Titre, Episode, EtatPressable, StatutSuivi, TypeMedia, EntreeBibliotheque } from '@/types';
import { urlAffiche, urlFond, nomsGenres } from '@/theme/constantes';
import {
  conteneurs,
  couleurs,
  densiteDe,
  espacements,
  fondus,
  paddingEcran,
  rayons,
  typo,
} from '@/theme/theme';

const STATUTS: { libelle: string; valeur: StatutSuivi }[] = [
  { libelle: 'À voir', valeur: 'a_voir' },
  { libelle: 'En cours', valeur: 'en_cours' },
  { libelle: 'Terminé', valeur: 'termine' },
];

export default function EcranDetail() {
  // Récupération et typage des paramètres d'URL.
  const params = useLocalSearchParams<{
    id: string;
    type: TypeMedia;
    nom?: string;
    affiche?: string;
  }>();
  const id = Number(params.id);
  const type: TypeMedia = params.type === 'film' ? 'film' : 'serie';
  const router = useRouter();
  const { accent, encre } = useVariante();
  const { width: fenetre } = useWindowDimensions();

  const d = densiteDe(fenetre);
  const t = typo(d);
  const padding = paddingEcran(fenetre);

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

  // Le titre et l'affiche transmis par l'écran appelant tiennent lieu de
  // contenu tant que TMDb n'a pas répondu : l'affiche est déjà dans le cache
  // image, donc il n'y a aucun clignotement.
  const nomAffiche = titre?.titre ?? params.nom ?? '';
  const fond =
    urlFond(titre?.cheminFond ?? null, 'w1280') ??
    urlAffiche(titre?.cheminAffiche ?? params.affiche ?? null, 'w500');

  const hauteurFond = d === 'desktop' ? Math.round(Math.min(480, fenetre * 0.3)) : 260;

  return (
    <SafeAreaView style={styles.ecran} edges={['bottom']}>
      {/* Masque l'en-tête par défaut : on gère notre propre bouton retour. */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: hauteurFond }}>
          {fond ? (
            <Image
              source={{ uri: fond }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="top"
              transition={300}
              cachePolicy="memory-disk"
              accessible={false}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: couleurs.surface2 }]} />
          )}
          {/* Fondu vers le fond de page : le backdrop ne s'arrête pas, il se dissout. */}
          <LinearGradient
            colors={[...fondus.versBas]}
            locations={[...fondus.positionsVersBas]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(11,14,17,0.7)', 'rgba(11,14,17,0)']}
            style={styles.voileHaut}
            pointerEvents="none"
          />
          <Pressable
            style={({ hovered }: EtatPressable) => [
              styles.retour,
              { margin: padding },
              hovered && { backgroundColor: 'rgba(11,14,17,0.85)' },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Revenir en arrière"
          >
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
        </View>

        {/* Le corps remonte sur le backdrop : la couture disparaît. */}
        <View style={[styles.corps, { paddingHorizontal: padding }]}>
          <Text style={[d === 'desktop' ? t.display : t.h1, { color: couleurs.texte }]}>
            {nomAffiche}
          </Text>

          {chargement || !titre ? (
            <View style={{ marginTop: espacements.m, gap: espacements.s }}>
              <Squelette largeur="40%" hauteur={16} rayon={rayons.s} />
              <Squelette largeur="100%" hauteur={48} rayon={rayons.m} />
            </View>
          ) : (
            <>
              {/* Méta : note, année, genres — en capitales espacées. */}
              <View style={styles.metaLigne}>
                <Ionicons name="star" size={14} color={couleurs.note} />
                <Text style={[styles.note, { color: couleurs.note }]}>{titre.note.toFixed(1)}</Text>
                <Text style={[t.overline, { color: couleurs.texteDoux }]}>
                  {[
                    titre.dateSortie ? titre.dateSortie.slice(0, 4) : null,
                    type === 'film' ? 'FILM' : 'SÉRIE',
                    nomsGenres(titre.genres).slice(0, 2).join(' · ').toUpperCase(),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
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
                      style={({ hovered, pressed }: EtatPressable) => [
                        styles.statutBtn,
                        actif && { backgroundColor: accent, borderColor: accent },
                        hovered && !actif && { backgroundColor: couleurs.surface3 },
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <Text style={[t.label, { color: actif ? encre : couleurs.texteDoux }]}>
                        {s.libelle}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {entree ? (
                <View style={styles.noteBloc}>
                  <Text style={[t.overline, { color: couleurs.texteFaible }]}>MA NOTE</Text>
                  <Etoiles note={entree.notePerso} onChange={noterTitre} />
                </View>
              ) : null}

              {entree?.statut === 'termine' && entree.vuLe ? (
                <Text style={[t.caption, styles.vuLe]}>
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
                  <Text style={[t.h2, styles.sectionTitre]}>Où regarder</Text>
                  <View style={styles.chips}>
                    {plateformes.map((p) => (
                      <View key={p} style={styles.chip}>
                        <Text style={[t.label, { color: couleurs.texteCorps }]}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Synopsis : borné à la mesure de lecture (~75 caractères). */}
              {titre.synopsis ? (
                <View style={styles.section}>
                  <Text style={[t.h2, styles.sectionTitre]}>Synopsis</Text>
                  <Text style={[t.body, styles.synopsis]}>{titre.synopsis}</Text>
                </View>
              ) : null}

              {/* Épisodes (séries uniquement) */}
              {type === 'serie' ? (
                <BlocEpisodes
                  serieId={id}
                  nbSaisons={titre.nombreSaisons ?? 0}
                  nbEpisodes={titre.nombreEpisodes ?? 0}
                  accent={accent}
                  encre={encre}
                  densite={d}
                  onEpisodeCoche={garantirEnCours}
                />
              ) : null}

              {entree ? (
                <Pressable
                  onPress={retirer}
                  accessibilityRole="button"
                  accessibilityLabel="Retirer de ma liste"
                  style={({ hovered }: EtatPressable) => [
                    styles.retirer,
                    hovered && { backgroundColor: `${couleurs.accentRose}14` },
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color={couleurs.accentRose} />
                  <Text style={[t.label, { color: couleurs.accentRose }]}>Retirer de ma liste</Text>
                </Pressable>
              ) : null}
            </>
          )}
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
  nbEpisodes,
  accent,
  encre,
  densite,
  onEpisodeCoche,
}: {
  serieId: number;
  /** Nombre de saisons, fourni par le parent (déjà connu via detailsTitre). */
  nbSaisons: number;
  /** Nombre total d'épisodes diffusés, pour la barre de progression. */
  nbEpisodes: number;
  accent: string;
  encre: string;
  densite: 'mobile' | 'desktop';
  onEpisodeCoche: () => void;
}) {
  const t = typo(densite);
  const [saison, setSaison] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [vus, setVus] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Map<number, number | null>>(new Map());
  const [totalVus, setTotalVus] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [lotEnCours, setLotEnCours] = useState(false);
  const staggerArme = useRef(true);

  const restantsDansLaSaison = episodes.filter((e) => !vus.has(e.id)).length;

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
      setTotalVus(vusDb.length);
    } finally {
      setChargement(false);
      setTimeout(() => (staggerArme.current = false), 800);
    }
  }, [serieId, saison]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  /** Coche/décoche un épisode et met à jour Firestore. */
  async function basculer(ep: Episode) {
    const dejaVu = vus.has(ep.id);
    // Mise à jour optimiste de l'UI (immédiate), puis appel réseau : le retour
    // visuel ne doit JAMAIS attendre la latence de Firestore.
    const copie = new Set(vus);
    if (dejaVu) {
      copie.delete(ep.id);
      setVus(copie);
      setTotalVus((n) => Math.max(0, n - 1));
      await demarquerEpisode(ep.id).catch(() => rafraichir());
    } else {
      copie.add(ep.id);
      setVus(copie);
      setTotalVus((n) => n + 1);
      await marquerEpisodeVu(serieId, ep.id, ep.saison, ep.numero).catch(() => rafraichir());
      // Cocher un épisode fait entrer la série dans le suivi « en cours ».
      onEpisodeCoche();
    }
  }

  /**
   * Marque vus tous les épisodes de la saison jusqu'à `limite` inclus (ou toute
   * la saison si `limite` est absent).
   *
   * C'est l'action qui manquait le plus : sans elle, rattraper une saison
   * signifie cocher vingt cases à la main, une par une, chacune avec son
   * aller-retour réseau.
   */
  async function marquerJusqua(limite?: number) {
    const manquants = episodes.filter(
      (e) => !vus.has(e.id) && (limite === undefined || e.numero <= limite)
    );
    if (manquants.length === 0 || lotEnCours) return;

    setLotEnCours(true);
    // Optimiste : les coches tombent toutes ensemble, la barre saute d'un coup.
    setVus((prev) => {
      const copie = new Set(prev);
      for (const e of manquants) copie.add(e.id);
      return copie;
    });
    setTotalVus((n) => n + manquants.length);

    try {
      // 5 en parallèle : assez pour que ce soit rapide, assez peu pour ne pas
      // saturer Firestore d'écritures simultanées.
      await enParallele(manquants, 5, async (e) => {
        await marquerEpisodeVu(serieId, e.id, e.saison, e.numero);
      });
      onEpisodeCoche();
    } catch {
      await rafraichir();
    } finally {
      setLotEnCours(false);
    }
  }

  /** Note un épisode (ce qui le marque aussi comme vu). */
  async function noterEp(ep: Episode, note: number | null) {
    const etaitVu = vus.has(ep.id);
    // Mise à jour optimiste : la note, et l'épisode passe "vu".
    setNotes((prev) => new Map(prev).set(ep.id, note));
    if (!etaitVu) {
      setVus((prev) => new Set(prev).add(ep.id));
      setTotalVus((n) => n + 1);
    }
    await noterEpisode(serieId, ep.id, ep.saison, ep.numero, note).catch(() => rafraichir());
    if (!etaitVu && note !== null) onEpisodeCoche();
  }

  return (
    <View style={styles.section}>
      <View style={styles.episodesEnTete}>
        <Text style={[t.h2, styles.sectionTitre]}>Épisodes</Text>
        {nbEpisodes > 0 ? (
          <View style={styles.progressionBloc}>
            <Progression
              vus={Math.min(totalVus, nbEpisodes)}
              total={nbEpisodes}
              accent={accent}
              libelle
            />
          </View>
        ) : null}
      </View>

      {/* Sélecteur de saison */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.saisons}
      >
        {Array.from({ length: nbSaisons }, (_, i) => i + 1).map((s) => {
          const actif = s === saison;
          return (
            <Pressable
              key={s}
              onPress={() => setSaison(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={`Saison ${s}`}
              style={({ hovered }: EtatPressable) => [
                styles.saisonBtn,
                actif && { backgroundColor: accent, borderColor: accent },
                hovered && !actif && { backgroundColor: couleurs.surface3 },
              ]}
            >
              <Text style={[t.label, { color: actif ? encre : couleurs.texteDoux }]}>
                Saison {s}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Marquage par lot : sans lui, rattraper une saison veut dire cocher
          vingt cases une par une. */}
      {!chargement && restantsDansLaSaison > 0 ? (
        <Pressable
          onPress={() => marquerJusqua()}
          disabled={lotEnCours}
          accessibilityRole="button"
          accessibilityLabel={`Marquer les ${restantsDansLaSaison} épisodes restants de la saison ${saison} comme vus`}
          style={({ hovered, pressed }: EtatPressable) => [
            styles.lot,
            hovered && { backgroundColor: `${accent}1F`, borderColor: accent },
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          <Ionicons
            name={lotEnCours ? 'hourglass-outline' : 'checkmark-done'}
            size={17}
            color={accent}
          />
          <Text style={[t.label, { color: accent }]}>
            {lotEnCours ? 'Marquage…' : `Marquer la saison vue (${restantsDansLaSaison} ép.)`}
          </Text>
        </Pressable>
      ) : null}

      {chargement ? (
        <LignesSquelettes nombre={5} />
      ) : (
        episodes.map((ep, i) => {
          const vu = vus.has(ep.id);
          return (
            <Animated.View
              key={ep.id}
              entering={
                staggerArme.current
                  ? FadeInDown.duration(280).delay(Math.min(i, 6) * 40)
                  : undefined
              }
            >
              <Pressable
                style={({ hovered }: EtatPressable) => [
                  styles.episode,
                  hovered && { backgroundColor: couleurs.surface },
                ]}
                onPress={() => basculer(ep)}
                // Appui long : marque tout jusqu'à cet épisode. Le geste est
                // caché, d'où le bouton « Marquer la saison vue » au-dessus qui,
                // lui, est visible : une action critique ne doit jamais dépendre
                // d'un geste qu'on ne peut pas deviner.
                onLongPress={() => marquerJusqua(ep.numero)}
                delayLongPress={400}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: vu }}
                accessibilityLabel={`Épisode ${ep.numero}${ep.nom ? ', ' + ep.nom : ''}`}
                accessibilityHint={
                  vu
                    ? 'Marquer comme non vu'
                    : 'Marquer comme vu. Appui long : marquer tous les épisodes jusqu’ici.'
                }
              >
                <CocheVu vu={vu} accent={accent} />
                <View style={styles.episodeInfos}>
                  <Text
                    style={[t.h3, { color: vu ? couleurs.texteDoux : couleurs.texte }]}
                    numberOfLines={1}
                  >
                    {ep.numero}. {ep.nom || 'Épisode ' + ep.numero}
                  </Text>
                  {ep.dateDiffusion ? (
                    <Text style={[t.caption, { color: couleurs.texteFaible, marginTop: 2 }]}>
                      {new Date(ep.dateDiffusion).toLocaleDateString('fr-FR')}
                      {ep.duree ? ` · ${ep.duree} min` : ''}
                    </Text>
                  ) : null}
                  <View style={styles.episodeNote}>
                    <Etoiles
                      note={notes.get(ep.id) ?? null}
                      onChange={(n) => noterEp(ep, n)}
                      taille={15}
                    />
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.page },
  voileHaut: { position: 'absolute', top: 0, left: 0, right: 0, height: 96 },
  retour: {
    width: 40,
    height: 40,
    borderRadius: rayons.rond,
    backgroundColor: 'rgba(11,14,17,0.6)',
    borderWidth: 1,
    borderColor: couleurs.lisere,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  corps: {
    // Remonte sur le backdrop : le hero ne se termine pas, il se dissout.
    marginTop: -64,
    width: '100%',
    maxWidth: conteneurs.standard,
    alignSelf: 'center',
    paddingBottom: espacements.section,
  },
  metaLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    marginTop: espacements.s,
  },
  note: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    marginRight: espacements.s,
    fontVariant: ['tabular-nums'],
  },
  statuts: { flexDirection: 'row', gap: espacements.s, marginTop: espacements.l },
  statutBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    cursor: 'pointer',
  },
  noteBloc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    marginTop: espacements.ml,
  },
  vuLe: { color: couleurs.texteFaible, marginTop: espacements.s },
  section: { marginTop: espacements.section },
  sectionTitre: { color: couleurs.texte, marginBottom: espacements.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacements.s },
  chip: {
    backgroundColor: couleurs.surface,
    borderRadius: rayons.rond,
    paddingHorizontal: espacements.m,
    height: 34,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
  },
  // ~75 caractères par ligne : la mesure optimale de lecture.
  synopsis: { color: couleurs.texteCorps, maxWidth: conteneurs.lecture },
  lot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.s,
    height: 44,
    borderRadius: rayons.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderStyle: 'dashed',
    marginBottom: espacements.sm,
    cursor: 'pointer',
  },
  episodesEnTete: { gap: espacements.s },
  progressionBloc: { maxWidth: 280, marginBottom: espacements.m },
  saisons: { flexDirection: 'row', gap: espacements.s, paddingBottom: espacements.m },
  saisonBtn: {
    paddingHorizontal: espacements.m,
    height: 38,
    justifyContent: 'center',
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    cursor: 'pointer',
  },
  episode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    paddingVertical: espacements.sm,
    paddingHorizontal: espacements.s,
    borderRadius: rayons.m,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    cursor: 'pointer',
  },
  episodeInfos: { flex: 1 },
  episodeNote: { marginTop: espacements.xs },
  retirer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.s,
    height: 48,
    borderRadius: rayons.rond,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    marginTop: espacements.section,
    cursor: 'pointer',
  },
});
