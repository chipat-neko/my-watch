// =============================================================================
//  Écran : Accueil (Découverte)
//  ---------------------------------------------------------------------------
//  Vitrine de titres à découvrir : tendances de la semaine, séries populaires
//  et films populaires, présentés en rangées horizontales. Un appui sur une
//  affiche ouvre l'écran de détail.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ListeHorizontale } from '@/components/ListeHorizontale';
import { Chargement } from '@/components/Chargement';
import { tendances, seriesPopulaires, filmsPopulaires } from '@/lib/tmdb';
import { Titre } from '@/types';
import { couleurs, espacements, polices } from '@/theme/theme';

export default function EcranAccueil() {
  const router = useRouter();
  const [tend, setTend] = useState<Titre[]>([]);
  const [series, setSeries] = useState<Titre[]>([]);
  const [films, setFilms] = useState<Titre[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Charge (ou recharge) les trois rangées en parallèle pour aller plus vite.
  const charger = useCallback(async () => {
    try {
      const [t, s, f] = await Promise.all([tendances(), seriesPopulaires(), filmsPopulaires()]);
      setTend(t);
      setSeries(s);
      setFilms(f);
      setErreur(null);
    } catch {
      setErreur('Impossible de charger les contenus. Vérifie ta clé TMDb et ta connexion.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setChargement(true);
      await charger();
      setChargement(false);
    })();
  }, [charger]);

  /** Recharge le contenu lors d'un "tirer pour rafraîchir". */
  async function rafraichir() {
    setRafraichit(true);
    await charger();
    setRafraichit(false);
  }

  /** Ouvre l'écran de détail pour le titre sélectionné. */
  function ouvrirDetail(titre: Titre) {
    router.push({ pathname: '/titre/[id]', params: { id: String(titre.id), type: titre.type } });
  }

  if (chargement) return <Chargement message="Chargement des tendances…" />;

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contenu}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={rafraichir}
            tintColor={couleurs.accent}
            colors={[couleurs.accent]}
          />
        }
      >
        <Text style={styles.enTete}>Découvrir</Text>

        {erreur ? (
          <Text style={styles.erreur}>{erreur}</Text>
        ) : (
          <View>
            <ListeHorizontale
              titreSection="Tendances de la semaine"
              donnees={tend}
              onPressTitre={ouvrirDetail}
            />
            <ListeHorizontale
              titreSection="Séries populaires"
              donnees={series}
              onPressTitre={ouvrirDetail}
            />
            <ListeHorizontale
              titreSection="Films populaires"
              donnees={films}
              onPressTitre={ouvrirDetail}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  contenu: {
    paddingVertical: espacements.m,
  },
  enTete: {
    color: couleurs.texte,
    fontSize: polices.grandTitre,
    fontWeight: '800',
    paddingHorizontal: espacements.m,
    marginBottom: espacements.l,
  },
  erreur: {
    color: couleurs.accentRose,
    paddingHorizontal: espacements.m,
    fontSize: polices.normale,
  },
});
