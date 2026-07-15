// =============================================================================
//  Écran : Découvrir
//  ---------------------------------------------------------------------------
//  Fusionne la découverte (tendances / populaires) et la recherche (le handoff
//  place la recherche dans cet onglet). Champ de recherche en haut ; sans
//  saisie, on montre des chips de filtre + une grille de tendances.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
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
import { rechercher, tendances, seriesPopulaires, filmsPopulaires } from '@/lib/tmdb';
import { EtatPressable, Titre } from '@/types';
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
  const [resultats, setResultats] = useState<Titre[]>([]);
  const [filtre, setFiltre] = useState<Filtre>('Pour toi');
  const [tend, setTend] = useState<Titre[]>([]);
  const [series, setSeries] = useState<Titre[]>([]);
  const [films, setFilms] = useState<Titre[]>([]);
  const [chargement, setChargement] = useState(true);
  const [focus, setFocus] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, s, f] = await Promise.all([tendances(), seriesPopulaires(), filmsPopulaires()]);
        setTend(t);
        setSeries(s);
        setFilms(f);
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  // Recherche débattue (400 ms).
  useEffect(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    const q = texte.trim();
    if (q.length < 2) {
      setResultats([]);
      return;
    }
    minuteur.current = setTimeout(async () => {
      try {
        setResultats(await rechercher(q));
      } catch {
        setResultats([]);
      }
    }, 400);
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [texte]);

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

  const enRecherche = texte.trim().length >= 2;
  const source = filtre === 'Séries' ? series : filtre === 'Films' ? films : tend;
  const grille = enRecherche ? resultats : source;

  const grandEcran = fenetre >= seuilLarge;
  // ⚠️ LE BUG QUI ÉCRASAIT LES AFFICHES : ce calcul partait de la largeur de la
  // FENÊTRE, alors que la barre latérale en consomme déjà 248. Sur une fenêtre de
  // 1100px, le code croyait disposer de 1060px pour 828px réels — soit six
  // colonnes tassées dans la place de quatre. Le défaut touchait TOUT écran de
  // moins de 1372px, donc la quasi-totalité des ordinateurs portables.
  const largeurUtile = fenetre - (grandEcran ? largeurRail : 0);
  const d = densiteDe(largeurUtile);
  const t = typo(d);
  const padding = paddingEcran(largeurUtile);
  const gap = d === 'desktop' ? espacements.l : espacements.sm;

  // 176px : en dessous de ~150 une affiche est un timbre dont le logotype n'est
  // plus lisible. Et à DPR 2, ~171px consomme exactement les 342px de bitmap que
  // sert TMDb : 1:1, aucun octet gaspillé.
  const cible =
    d === 'desktop' ? (variante === 'grid' ? 148 : 176) : variante === 'grid' ? 92 : 108;

  const dispo = Math.min(largeurUtile, maxLargeur) - padding * 2;
  // `round` et non `floor` : arrondir vers le bas gaspille jusqu'à une colonne
  // entière de vide.
  const colonnes = Math.max(2, Math.round(dispo / (cible + gap)));
  const largeur = Math.floor((dispo - (colonnes - 1) * gap) / colonnes);

  // Un badge « Film » sur chaque carte quand le filtre dit déjà « Films » est du
  // bruit pur : on ne l'affiche que sur les listes réellement mixtes.
  const listeMixte = enRecherche || filtre === 'Pour toi';

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
          // Un squelette aux dimensions RÉELLES des cartes, et non un spinner :
          // il préfigure le layout, donc rien ne saute au remplissage.
          <View style={{ marginTop: espacements.xl }}>
            <GrilleSquelettes colonnes={colonnes} largeur={largeur} lignes={2} gap={gap} />
          </View>
        ) : (
          <FlatList
            key={colonnes}
            data={grille}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            numColumns={colonnes}
            columnWrapperStyle={{ gap, marginBottom: gap }}
            contentContainerStyle={styles.liste}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              enRecherche ? null : (
                <View>
                  <View style={styles.filtres}>
                    {FILTRES.map((f) => {
                      const actif = f === filtre;
                      return (
                        <Pressable
                          key={f}
                          onPress={() => setFiltre(f)}
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
                  </View>
                  <View style={styles.sectionEnTete}>
                    <Text style={[t.overline, { color: accent }]}>
                      {filtre === 'Pour toi' ? 'CETTE SEMAINE' : 'EN CE MOMENT'}
                    </Text>
                    <Text style={[t.h2, { color: couleurs.texte, marginTop: espacements.xs }]}>
                      {filtre === 'Pour toi' ? 'Tendances' : `${filtre} populaires`}
                    </Text>
                  </View>
                </View>
              )
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
            ListEmptyComponent={
              <Text style={[t.body, styles.vide]}>
                {enRecherche
                  ? `Aucun résultat pour « ${texte.trim()} ».`
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
  filtres: { flexDirection: 'row', gap: espacements.s, paddingBottom: espacements.xs },
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
  // 56 au-dessus, 16 en dessous : c'est ce rapport de 3,5 qui groupe le titre
  // avec son contenu et sépare les sections. À distances égales, rien ne se lit.
  sectionEnTete: { marginTop: espacements.section, marginBottom: espacements.m },
  liste: { paddingBottom: espacements.section },
  vide: { color: couleurs.texteDoux, textAlign: 'center', marginTop: espacements.xxl },
});
