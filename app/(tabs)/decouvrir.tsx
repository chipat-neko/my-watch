// =============================================================================
//  Écran : Découvrir
//  ---------------------------------------------------------------------------
//  Fusionne la découverte (tendances / populaires / par genre) et la recherche.
//
//  Défilement infini : l'écran plafonnait à 20 résultats — la première page de
//  TMDb — et s'arrêtait là. Le catalogue entier est maintenant accessible.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CartePoster } from '@/components/CartePoster';
import { GrilleSquelettes } from '@/components/Squelette';
import {
  rechercher,
  tendances,
  seriesPopulaires,
  filmsPopulaires,
  parGenre,
  mieuxNotes,
} from '@/lib/tmdb';
import { encoreDesPages, fusionnerPage } from '@/services/pagination';
import { EtatPressable, Titre, TypeMedia } from '@/types';
import { GENRES_FR } from '@/theme/constantes';
import { useVariante } from '@/hooks/useVariante';
import {
  couleurs,
  densiteDe,
  espacements,
  largeurRail,
  maxLargeur,
  paddingEcran,
  rayons,
  seuilLarge,
  typo,
} from '@/theme/theme';

const FILTRES = ['Pour toi', 'Séries', 'Films'] as const;
type Filtre = (typeof FILTRES)[number];

type Classement = 'populaire' | 'note';

/**
 * Genres proposés en filtre, dans l'ordre d'usage réel. Volontairement une
 * sélection, et non les 19 genres de TMDb : une barre de dix-neuf puces ne se
 * lit plus, elle se subit.
 *
 * Les identifiants « Action » diffèrent entre films (28) et séries (10759) —
 * d'où le couple.
 */
const GENRES: { libelle: string; film: number; serie: number }[] = [
  { libelle: 'Action', film: 28, serie: 10759 },
  { libelle: 'Comédie', film: 35, serie: 35 },
  { libelle: 'Drame', film: 18, serie: 18 },
  { libelle: 'Crime', film: 80, serie: 80 },
  { libelle: 'Sci-Fi', film: 878, serie: 10765 },
  { libelle: 'Animation', film: 16, serie: 16 },
  { libelle: 'Documentaire', film: 99, serie: 99 },
  { libelle: 'Horreur', film: 27, serie: 9648 },
];

/**
 * Retire le contour bleu que le navigateur pose par défaut sur un champ focus :
 * ici, le focus est déjà porté par la bordure d'accent de la barre. `outlineStyle`
 * est compris par react-native-web mais absent des typings de React Native.
 */
const SANS_CONTOUR_WEB = { outlineStyle: 'none' } as unknown as TextStyle;

export default function EcranDecouvrir() {
  const router = useRouter();
  const { variante, accent, encre } = useVariante();
  const { width: fenetre } = useWindowDimensions();

  const [texte, setTexte] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('Pour toi');
  const [genre, setGenre] = useState<number | null>(null);
  const [classement, setClassement] = useState<Classement>('populaire');

  const [titres, setTitres] = useState<Titre[]>([]);
  const [page, setPage] = useState(1);
  const [fini, setFini] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [chargeSuite, setChargeSuite] = useState(false);
  const [focus, setFocus] = useState(false);

  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Identifie la requête courante : une réponse lente d'un filtre abandonné ne
  // doit jamais écraser les résultats du filtre actuel.
  const requete = useRef(0);

  const enRecherche = texte.trim().length >= 2;
  const typeCourant: TypeMedia = filtre === 'Films' ? 'film' : 'serie';

  /** Charge une page pour l'état courant (filtre, genre, classement, recherche). */
  const chargerPage = useCallback(
    async (n: number): Promise<Titre[]> => {
      const q = texte.trim();
      if (q.length >= 2) return rechercher(q, n);
      if (genre !== null) {
        const g = GENRES.find((x) => (filtre === 'Films' ? x.film : x.serie) === genre);
        const id = g ? (filtre === 'Films' ? g.film : g.serie) : genre;
        return parGenre(typeCourant, id, n, classement);
      }
      if (classement === 'note' && filtre !== 'Pour toi') return mieuxNotes(typeCourant, n);
      if (filtre === 'Séries') return seriesPopulaires(n);
      if (filtre === 'Films') return filmsPopulaires(n);
      return tendances(n);
    },
    [texte, filtre, genre, classement, typeCourant]
  );

  // Premier chargement, et rechargement à chaque changement de critère.
  useEffect(() => {
    const q = texte.trim();
    if (minuteur.current) clearTimeout(minuteur.current);

    // La recherche est débattue (400 ms) ; changer de filtre, non — le geste est
    // déjà délibéré.
    const delai = q.length >= 2 ? 400 : 0;
    if (q.length > 0 && q.length < 2) {
      setTitres([]);
      setChargement(false);
      return;
    }

    const mien = ++requete.current;
    setChargement(true);
    minuteur.current = setTimeout(async () => {
      try {
        const r = await chargerPage(1);
        if (requete.current !== mien) return;
        setTitres(r);
        setPage(1);
        setFini(!encoreDesPages(r, 1));
      } catch {
        if (requete.current === mien) setTitres([]);
      } finally {
        if (requete.current === mien) setChargement(false);
      }
    }, delai);

    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [chargerPage, texte]);

  /** Page suivante, au bout de la liste. */
  async function suite() {
    if (chargeSuite || fini || chargement || titres.length === 0) return;
    const mien = requete.current;
    setChargeSuite(true);
    try {
      const suivante = page + 1;
      const r = await chargerPage(suivante);
      if (requete.current !== mien) return;
      setTitres((courants) => fusionnerPage(courants, r));
      setPage(suivante);
      setFini(!encoreDesPages(r, suivante));
    } catch {
      // Réseau indisponible : on s'arrête là plutôt que de boucler sur l'erreur.
      setFini(true);
    } finally {
      if (requete.current === mien) setChargeSuite(false);
    }
  }

  function ouvrir(titre: Titre) {
    router.push({
      pathname: '/titre/[id]',
      params: {
        id: String(titre.id),
        type: titre.type,
        // Transmis pour que le détail affiche le titre et l'affiche SANS attendre
        // TMDb : l'image est déjà en cache, donc l'élément touché « suit »
        // l'utilisateur au lieu de disparaître derrière un écran de chargement.
        nom: titre.titre,
        affiche: titre.cheminAffiche ?? '',
      },
    });
  }

  const grandEcran = fenetre >= seuilLarge;
  // ⚠️ LE BUG QUI ÉCRASAIT LES AFFICHES : ce calcul partait de la largeur de la
  // FENÊTRE, alors que la barre latérale en consomme déjà 248.
  const largeurUtile = fenetre - (grandEcran ? largeurRail : 0);
  const d = densiteDe(largeurUtile);
  const t = typo(d);
  const padding = paddingEcran(largeurUtile);
  const gap = d === 'desktop' ? espacements.l : espacements.sm;

  const cible =
    d === 'desktop' ? (variante === 'grid' ? 148 : 176) : variante === 'grid' ? 92 : 108;
  const dispo = Math.min(largeurUtile, maxLargeur) - padding * 2;
  const colonnes = Math.max(2, Math.round(dispo / (cible + gap)));
  const largeur = Math.floor((dispo - (colonnes - 1) * gap) / colonnes);

  const listeMixte = enRecherche || (filtre === 'Pour toi' && genre === null);
  const titreSection = enRecherche
    ? `Résultats pour « ${texte.trim()} »`
    : genre !== null
      ? `${GENRES_FR[genre] ?? 'Genre'} · ${filtre === 'Films' ? 'Films' : 'Séries'}`
      : filtre === 'Pour toi'
        ? 'Tendances'
        : classement === 'note'
          ? `${filtre} les mieux notés`
          : `${filtre} populaires`;

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={[styles.conteneur, { paddingHorizontal: padding }]}>
        <Text style={[t.h1, styles.enTete]}>{variante === 'grid' ? 'Explorer' : 'Découvrir'}</Text>

        <View
          style={[
            styles.barre,
            { maxWidth: d === 'desktop' ? 440 : undefined },
            focus && { borderColor: `${accent}8C`, shadowColor: accent },
          ]}
        >
          <Ionicons name="search" size={18} color={focus ? accent : couleurs.texteFaible} />
          <TextInput
            style={[t.bodyStrong, styles.champ, SANS_CONTOUR_WEB]}
            placeholder="Séries, films, anime…"
            placeholderTextColor={couleurs.texteFaible}
            value={texte}
            onChangeText={setTexte}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            autoCorrect={false}
            accessibilityLabel="Rechercher un film ou une série"
          />
          {texte ? (
            <Pressable
              onPress={() => setTexte('')}
              accessibilityRole="button"
              accessibilityLabel="Effacer"
              style={styles.effacer}
            >
              <Ionicons name="close-circle" size={18} color={couleurs.texteDoux} />
            </Pressable>
          ) : null}
        </View>

        {chargement ? (
          <View style={{ marginTop: espacements.xl }}>
            <GrilleSquelettes colonnes={colonnes} largeur={largeur} lignes={2} gap={gap} />
          </View>
        ) : (
          <FlatList
            key={colonnes}
            data={titres}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            numColumns={colonnes}
            columnWrapperStyle={{ gap, marginBottom: gap }}
            contentContainerStyle={styles.liste}
            showsVerticalScrollIndicator={false}
            // 0.6 : on charge avant d'atteindre le bas, pour que le défilement
            // ne s'interrompe jamais.
            onEndReached={suite}
            onEndReachedThreshold={0.6}
            ListHeaderComponent={
              <View>
                {enRecherche ? null : (
                  <>
                    <View style={styles.filtres}>
                      {FILTRES.map((f) => {
                        const actif = f === filtre;
                        return (
                          <Pressable
                            key={f}
                            onPress={() => {
                              setFiltre(f);
                              // Les genres n'ont pas le même identifiant selon
                              // le type : garder la sélection en changeant de
                              // filtre afficherait un genre faux.
                              setGenre(null);
                              if (f === 'Pour toi') setClassement('populaire');
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: actif }}
                            style={({ hovered }: EtatPressable) => [
                              styles.chip,
                              actif && { backgroundColor: accent, borderColor: accent },
                              hovered && !actif && { backgroundColor: couleurs.surface3 },
                            ]}
                          >
                            <Text style={[t.label, { color: actif ? encre : couleurs.texteDoux }]}>
                              {f}
                            </Text>
                          </Pressable>
                        );
                      })}

                      {/* Le classement n'a pas de sens sur « Pour toi », qui EST
                          déjà un classement (les tendances de la semaine). */}
                      {filtre !== 'Pour toi' ? (
                        <Pressable
                          onPress={() =>
                            setClassement((c) => (c === 'populaire' ? 'note' : 'populaire'))
                          }
                          accessibilityRole="button"
                          accessibilityLabel={
                            classement === 'populaire' ? 'Trier par note' : 'Trier par popularité'
                          }
                          style={({ hovered }: EtatPressable) => [
                            styles.chip,
                            styles.chipTri,
                            hovered && { backgroundColor: couleurs.surface3 },
                          ]}
                        >
                          <Ionicons
                            name={classement === 'note' ? 'star' : 'flame'}
                            size={13}
                            color={classement === 'note' ? couleurs.note : couleurs.texteDoux}
                          />
                          <Text style={[t.label, { color: couleurs.texteDoux }]}>
                            {classement === 'note' ? 'Mieux notés' : 'Populaires'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    {/* Genres : rail horizontal, il déborde volontairement. */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.genres}
                    >
                      <Pressable
                        onPress={() => setGenre(null)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: genre === null }}
                        style={({ hovered }: EtatPressable) => [
                          styles.puceGenre,
                          genre === null && { borderColor: accent, backgroundColor: `${accent}1F` },
                          hovered && genre !== null && { backgroundColor: couleurs.surface3 },
                        ]}
                      >
                        <Text
                          style={[
                            t.caption,
                            { color: genre === null ? accent : couleurs.texteDoux },
                          ]}
                        >
                          Tous les genres
                        </Text>
                      </Pressable>

                      {GENRES.map((g) => {
                        const id = filtre === 'Films' ? g.film : g.serie;
                        const actif = genre === id;
                        return (
                          <Pressable
                            key={g.libelle}
                            onPress={() => setGenre(actif ? null : id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: actif }}
                            style={({ hovered }: EtatPressable) => [
                              styles.puceGenre,
                              actif && { borderColor: accent, backgroundColor: `${accent}1F` },
                              hovered && !actif && { backgroundColor: couleurs.surface3 },
                            ]}
                          >
                            <Text
                              style={[t.caption, { color: actif ? accent : couleurs.texteDoux }]}
                            >
                              {g.libelle}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                <View style={styles.sectionEnTete}>
                  {enRecherche ? null : (
                    <Text style={[t.overline, { color: accent }]}>
                      {genre !== null
                        ? 'FILTRÉ PAR GENRE'
                        : filtre === 'Pour toi'
                          ? 'CETTE SEMAINE'
                          : 'EN CE MOMENT'}
                    </Text>
                  )}
                  <Text
                    style={[t.h2, { color: couleurs.texte, marginTop: espacements.xs }]}
                    numberOfLines={1}
                  >
                    {titreSection}
                  </Text>
                </View>
              </View>
            }
            renderItem={({ item, index }) => (
              <Animated.View
                // Plafond à 8 : sans lui, le 30ᵉ élément attendrait 1,2 s et
                // l'écran aurait l'air cassé, pas raffiné.
                entering={FadeInDown.duration(280).delay(Math.min(index, 8) * 40)}
              >
                <CartePoster
                  titre={item}
                  largeur={largeur}
                  accent={accent}
                  montrerType={listeMixte}
                  onPress={() => ouvrir(item)}
                />
              </Animated.View>
            )}
            ListFooterComponent={
              chargeSuite ? (
                <View style={styles.pied}>
                  <ActivityIndicator color={accent} />
                </View>
              ) : fini && titres.length > 12 ? (
                <Text style={[t.caption, styles.finListe]}>Tu as tout vu.</Text>
              ) : null
            }
            ListEmptyComponent={
              <Text style={[t.body, styles.vide]}>
                {enRecherche
                  ? `Aucun résultat pour « ${texte.trim()} ».`
                  : genre !== null
                    ? 'Aucun titre dans ce genre.'
                    : 'Tape au moins 2 caractères pour rechercher.'}
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Borné à 1440 (et non 1100) : sur un écran de 1900, une borne à 1100 laissait
  // 42 % de la surface vide — ce n'est pas de la respiration, c'est un abandon.
  conteneur: { flex: 1, width: '100%', maxWidth: maxLargeur, alignSelf: 'center' },
  enTete: { color: couleurs.texte, paddingTop: espacements.sm, marginBottom: espacements.ml },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    height: 52,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.rond,
    paddingHorizontal: espacements.ml,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  champ: { flex: 1, color: couleurs.texte, height: '100%' },
  effacer: { cursor: 'pointer' },
  filtres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
    paddingTop: espacements.ml,
  },
  chip: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: espacements.m,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    cursor: 'pointer',
  },
  chipTri: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    marginLeft: 'auto',
  },
  genres: { flexDirection: 'row', gap: espacements.s, paddingTop: espacements.sm },
  puceGenre: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: espacements.sm,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    cursor: 'pointer',
  },
  // 56 au-dessus, 16 en dessous : c'est ce rapport de 3,5 qui groupe le titre
  // avec son contenu et sépare les sections. À distances égales, rien ne se lit.
  sectionEnTete: { marginTop: espacements.xl, marginBottom: espacements.m },
  liste: { paddingBottom: espacements.section },
  pied: { paddingVertical: espacements.l, alignItems: 'center' },
  finListe: {
    color: couleurs.texteFaible,
    textAlign: 'center',
    paddingVertical: espacements.l,
  },
  vide: { color: couleurs.texteDoux, textAlign: 'center', marginTop: espacements.xxl },
});
