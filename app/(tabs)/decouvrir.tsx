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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CartePoster } from '@/components/CartePoster';
import { Chargement } from '@/components/Chargement';
import { rechercher, tendances, seriesPopulaires, filmsPopulaires } from '@/lib/tmdb';
import { Titre } from '@/types';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, maxLargeur, polices, rayons } from '@/theme/theme';

const FILTRES = ['Pour toi', 'Séries', 'Films'] as const;
type Filtre = (typeof FILTRES)[number];

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
    router.push({ pathname: '/titre/[id]', params: { id: String(titre.id), type: titre.type } });
  }

  const enRecherche = texte.trim().length >= 2;
  const source = filtre === 'Séries' ? series : filtre === 'Films' ? films : tend;
  const grille = enRecherche ? resultats : source;

  // Grille adaptative : le nombre de colonnes est calculé d'après la largeur
  // RÉELLEMENT disponible (bornée par maxLargeur). Sans ça, sur grand écran les
  // cartes seraient projetées aux extrémités. La variante "grid" est plus dense.
  const dispo = Math.min(fenetre, maxLargeur) - espacements.l * 2;
  const cible = variante === 'grid' ? 118 : 165;
  const colonnes = Math.max(2, Math.floor(dispo / cible));
  const largeur = Math.floor((dispo - (colonnes - 1) * espacements.m) / colonnes);

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={styles.conteneur}>
        <Text style={styles.enTete}>{variante === 'grid' ? 'Explorer' : 'Découvrir'}</Text>

        {/* Barre de recherche */}
        <View style={styles.barre}>
          <Ionicons name="search" size={20} color={couleurs.texteDoux} />
          <TextInput
            style={styles.champ}
            placeholder="Séries, films, anime…"
            placeholderTextColor={couleurs.texteDoux}
            value={texte}
            onChangeText={setTexte}
            autoCorrect={false}
            accessibilityLabel="Rechercher un film ou une série"
          />
          {texte ? (
            <Pressable
              onPress={() => setTexte('')}
              accessibilityRole="button"
              accessibilityLabel="Effacer"
            >
              <Ionicons name="close-circle" size={18} color={couleurs.texteDoux} />
            </Pressable>
          ) : null}
        </View>

        {chargement ? (
          <Chargement />
        ) : (
          <FlatList
            key={colonnes}
            data={grille}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            numColumns={colonnes}
            columnWrapperStyle={styles.colonne}
            contentContainerStyle={styles.liste}
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
                          style={[styles.chip, actif && { backgroundColor: accent }]}
                        >
                          <Text style={[styles.chipTexte, actif && { color: encre }]}>{f}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.section}>
                    {filtre === 'Pour toi' ? 'Tendances cette semaine' : `Populaires`}
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <CartePoster titre={item} largeur={largeur} onPress={() => ouvrir(item)} />
            )}
            ListEmptyComponent={
              <Text style={styles.vide}>
                {enRecherche ? 'Aucun résultat.' : 'Tape au moins 2 caractères pour rechercher.'}
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
  // Borne la largeur du contenu et le centre (sinon il s'étire sur grand écran).
  conteneur: { flex: 1, width: '100%', maxWidth: maxLargeur, alignSelf: 'center' },
  enTete: {
    color: couleurs.texte,
    fontSize: polices.grandTitre,
    fontFamily: familles.extrabold,
    paddingHorizontal: espacements.l,
    paddingTop: espacements.m,
  },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderRadius: rayons.rond,
    paddingHorizontal: espacements.m,
    marginHorizontal: espacements.l,
    marginTop: espacements.m,
  },
  champ: {
    flex: 1,
    color: couleurs.texte,
    fontSize: polices.moyenne,
    fontFamily: familles.medium,
    paddingVertical: espacements.m,
  },
  filtres: { flexDirection: 'row', gap: espacements.s, paddingTop: espacements.l },
  chip: {
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
  },
  chipTexte: {
    color: couleurs.texteDoux,
    fontSize: polices.normale,
    fontFamily: familles.semibold,
  },
  section: {
    color: couleurs.texte,
    fontSize: polices.titre,
    fontFamily: familles.extrabold,
    marginTop: espacements.l,
    marginBottom: espacements.m,
  },
  liste: { paddingHorizontal: espacements.l, paddingBottom: espacements.xl },
  // Espacement régulier entre colonnes (les cartes remplissent la largeur calculée).
  colonne: { gap: espacements.m, marginBottom: espacements.m },
  vide: {
    color: couleurs.texteDoux,
    fontFamily: familles.medium,
    textAlign: 'center',
    marginTop: espacements.xl,
    fontSize: polices.normale,
  },
});
