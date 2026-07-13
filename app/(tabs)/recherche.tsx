// =============================================================================
//  Écran : Recherche
//  ---------------------------------------------------------------------------
//  Champ de recherche + résultats en grille (films et séries). La recherche
//  est "débattue" (debounced) : on n'interroge TMDb que 400 ms après la
//  dernière frappe. Les résultats se chargent ensuite page par page au fil du
//  défilement (défilement infini) pour dépasser les 20 premiers résultats.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CartePoster } from '@/components/CartePoster';
import { rechercher } from '@/lib/tmdb';
import { Titre } from '@/types';
import { couleurs, espacements, polices, rayons } from '@/theme/theme';

export default function EcranRecherche() {
  const router = useRouter();
  const [texte, setTexte] = useState('');
  const [resultats, setResultats] = useState<Titre[]>([]);
  const [enCours, setEnCours] = useState(false); // chargement de la 1re page
  const [chargePlus, setChargePlus] = useState(false); // chargement d'une page suivante
  const [aPlus, setAPlus] = useState(false); // reste-t-il des pages à charger ?

  // Référence vers le minuteur de "debounce" pour pouvoir l'annuler.
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Page TMDb déjà chargée, et texte de la recherche en vigueur (anti-course).
  const page = useRef(1);
  const rechercheActive = useRef('');
  // Verrou pour n'avoir qu'un seul chargement de page suivante à la fois.
  const chargementEnCours = useRef(false);

  useEffect(() => {
    // À chaque changement de texte, on relance un minuteur de 400 ms.
    if (minuteur.current) clearTimeout(minuteur.current);

    const q = texte.trim();
    if (q.length < 2) {
      setResultats([]);
      setAPlus(false);
      return;
    }

    minuteur.current = setTimeout(async () => {
      rechercheActive.current = q;
      page.current = 1;
      setEnCours(true);
      try {
        const premiers = await rechercher(q, 1);
        if (rechercheActive.current !== q) return; // une frappe plus récente a pris le relais
        setResultats(premiers);
        setAPlus(premiers.length > 0);
      } catch {
        if (rechercheActive.current === q) {
          setResultats([]);
          setAPlus(false);
        }
      } finally {
        if (rechercheActive.current === q) setEnCours(false);
      }
    }, 400);

    // Nettoyage : on annule le minuteur si le composant se met à jour/démonte.
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [texte]);

  /** Charge la page suivante et l'ajoute aux résultats (défilement infini). */
  async function chargerPlus() {
    const q = texte.trim();
    if (q.length < 2 || !aPlus || chargementEnCours.current) return;
    chargementEnCours.current = true;
    setChargePlus(true);
    const prochaine = page.current + 1;
    try {
      const suite = await rechercher(q, prochaine);
      if (rechercheActive.current !== q) return; // recherche obsolète : on ignore
      page.current = prochaine;
      // Dédoublonne (TMDb peut répéter un titre d'une page à l'autre).
      setResultats((prev) => {
        const cles = new Set(prev.map((t) => `${t.type}-${t.id}`));
        return [...prev, ...suite.filter((t) => !cles.has(`${t.type}-${t.id}`))];
      });
      setAPlus(suite.length > 0);
    } catch {
      setAPlus(false); // on cesse de tenter en cas d'erreur réseau
    } finally {
      chargementEnCours.current = false;
      if (rechercheActive.current === q) setChargePlus(false);
    }
  }

  function ouvrirDetail(titre: Titre) {
    router.push({ pathname: '/titre/[id]', params: { id: String(titre.id), type: titre.type } });
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      {/* Barre de recherche */}
      <View style={styles.barre}>
        <Ionicons name="search" size={20} color={couleurs.texteDoux} />
        <TextInput
          style={styles.champ}
          placeholder="Rechercher un film ou une série…"
          placeholderTextColor={couleurs.texteDoux}
          value={texte}
          onChangeText={setTexte}
          autoCorrect={false}
          accessibilityLabel="Rechercher un film ou une série"
        />
      </View>

      {/* Résultats en grille (3 colonnes) */}
      <FlatList
        data={resultats}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        numColumns={3}
        columnWrapperStyle={styles.colonne}
        contentContainerStyle={styles.liste}
        renderItem={({ item }) => (
          <CartePoster titre={item} largeur={104} onPress={() => ouvrirDetail(item)} />
        )}
        onEndReached={chargerPlus}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          chargePlus ? <ActivityIndicator style={styles.pied} color={couleurs.accent} /> : null
        }
        ListEmptyComponent={
          <Text style={styles.vide}>
            {enCours
              ? 'Recherche en cours…'
              : texte.trim().length < 2
                ? 'Tape au moins 2 caractères pour lancer une recherche.'
                : 'Aucun résultat.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.surface2,
    borderRadius: rayons.m,
    paddingHorizontal: espacements.m,
    margin: espacements.m,
  },
  champ: {
    flex: 1,
    color: couleurs.texte,
    fontSize: polices.moyenne,
    paddingVertical: espacements.m,
    marginLeft: espacements.s,
  },
  liste: {
    paddingHorizontal: espacements.m,
    paddingBottom: espacements.xl,
  },
  colonne: {
    justifyContent: 'space-between',
  },
  pied: {
    marginVertical: espacements.l,
  },
  vide: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.xl,
    fontSize: polices.normale,
    paddingHorizontal: espacements.l,
  },
});
