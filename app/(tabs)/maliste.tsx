// =============================================================================
//  Écran : Ma liste (Bibliothèque)
//  ---------------------------------------------------------------------------
//  Affiche les titres suivis par l'utilisateur, filtrables par statut :
//  « À voir », « En cours », « Terminé ». On recharge à chaque affichage de
//  l'onglet pour refléter les ajouts récents.
// =============================================================================

import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CartePoster } from '@/components/CartePoster';
import { Chargement } from '@/components/Chargement';
import { chargerBibliotheque } from '@/services/bibliotheque';
import { EntreeBibliotheque, StatutSuivi, Titre } from '@/types';
import { couleurs, espacements, polices, rayons } from '@/theme/theme';

// Filtres proposés en haut de l'écran (libellé + statut correspondant).
const FILTRES: { libelle: string; statut: StatutSuivi }[] = [
  { libelle: 'À voir', statut: 'a_voir' },
  { libelle: 'En cours', statut: 'en_cours' },
  { libelle: 'Terminé', statut: 'termine' },
];

export default function EcranMaListe() {
  const router = useRouter();
  const [entrees, setEntrees] = useState<EntreeBibliotheque[]>([]);
  const [statutActif, setStatutActif] = useState<StatutSuivi>('en_cours');
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        setChargement(true);
        try {
          const data = await chargerBibliotheque();
          if (actif) setEntrees(data);
        } finally {
          if (actif) setChargement(false);
        }
      })();
      return () => {
        actif = false;
      };
    }, [])
  );

  /** Recharge la bibliothèque lors d'un "tirer pour rafraîchir". */
  async function rafraichir() {
    setRafraichit(true);
    try {
      setEntrees(await chargerBibliotheque());
    } finally {
      setRafraichit(false);
    }
  }

  // Entrées correspondant au filtre courant (recalculées seulement si besoin).
  const filtrees = useMemo(
    () => entrees.filter((e) => e.statut === statutActif),
    [entrees, statutActif]
  );

  /** Convertit une entrée de bibliothèque vers un Titre minimal pour la carte. */
  function versTitre(e: EntreeBibliotheque): Titre {
    return {
      id: e.tmdbId,
      type: e.type,
      titre: e.titre,
      titreOriginal: e.titre,
      synopsis: '',
      cheminAffiche: e.cheminAffiche,
      cheminFond: null,
      note: 0,
      dateSortie: null,
      genres: [],
    };
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <Text style={styles.enTete}>Ma liste</Text>

      {/* Filtres par statut */}
      <View style={styles.filtres}>
        {FILTRES.map((f) => {
          const actif = f.statut === statutActif;
          return (
            <Pressable
              key={f.statut}
              onPress={() => setStatutActif(f.statut)}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={`Filtrer : ${f.libelle}`}
              style={[styles.puce, actif && styles.puceActive]}
            >
              <Text style={[styles.puceTexte, actif && styles.puceTexteActif]}>{f.libelle}</Text>
            </Pressable>
          );
        })}
      </View>

      {chargement ? (
        <Chargement />
      ) : (
        <FlatList
          data={filtrees}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.colonne}
          contentContainerStyle={styles.liste}
          refreshControl={
            <RefreshControl
              refreshing={rafraichit}
              onRefresh={rafraichir}
              tintColor={couleurs.accent}
              colors={[couleurs.accent]}
            />
          }
          renderItem={({ item }) => (
            <CartePoster
              titre={versTitre(item)}
              largeur={104}
              onPress={() =>
                router.push({
                  pathname: '/titre/[id]',
                  params: { id: String(item.tmdbId), type: item.type },
                })
              }
            />
          )}
          ListEmptyComponent={
            <Text style={styles.vide}>
              Rien ici pour l'instant. Ajoute des titres depuis la recherche.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  enTete: {
    color: couleurs.texte,
    fontSize: polices.grandTitre,
    fontWeight: '800',
    paddingHorizontal: espacements.m,
    paddingTop: espacements.m,
  },
  filtres: {
    flexDirection: 'row',
    paddingHorizontal: espacements.m,
    marginVertical: espacements.m,
  },
  puce: {
    paddingHorizontal: espacements.m,
    paddingVertical: espacements.s,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    marginRight: espacements.s,
  },
  puceActive: { backgroundColor: couleurs.accent },
  puceTexte: { color: couleurs.texteDoux, fontSize: polices.normale, fontWeight: '600' },
  puceTexteActif: { color: couleurs.texte },
  liste: { paddingHorizontal: espacements.m, paddingBottom: espacements.xl },
  colonne: { justifyContent: 'space-between' },
  vide: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.xl,
    paddingHorizontal: espacements.l,
    fontSize: polices.normale,
  },
});
