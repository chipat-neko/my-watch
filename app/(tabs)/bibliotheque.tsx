// =============================================================================
//  Écran : Ma bibliothèque
//  ---------------------------------------------------------------------------
//  Tout ce que l'utilisateur suit, filtrable par statut et triable.
//
//  Pourquoi cet onglet remplace « Communauté » : le volet social du handoff
//  demande un back-end (relations d'amitié, publications) que My Watch n'a pas
//  et n'aura pas avant longtemps. Réserver 20 % de la navigation à un écran
//  « bientôt disponible » alors que la BIBLIOTHÈQUE — le cœur d'une app de
//  suivi, « My Shows » chez TV Time — n'existait nulle part était un mauvais
//  arbitrage. La communauté reviendra quand elle aura quelque chose à montrer.
// =============================================================================

import { useCallback, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CartePoster } from '@/components/CartePoster';
import { GrilleSquelettes } from '@/components/Squelette';
import { chargerBibliotheque } from '@/services/bibliotheque';
import { avanceesDesSeries, AvanceeSerie } from '@/services/progression';
import { EntreeBibliotheque, EtatPressable, StatutSuivi, Titre } from '@/types';
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

/** Les filtres, dans l'ordre d'usage réel : on consulte surtout ce qu'on regarde. */
const FILTRES: { libelle: string; statut: StatutSuivi | 'tout' }[] = [
  { libelle: 'Tout', statut: 'tout' },
  { libelle: 'En cours', statut: 'en_cours' },
  { libelle: 'À voir', statut: 'a_voir' },
  { libelle: 'Terminé', statut: 'termine' },
  { libelle: 'Abandonné', statut: 'abandonne' },
];

type Tri = 'recent' | 'alpha';

const SANS_CONTOUR_WEB = { outlineStyle: 'none' } as unknown as TextStyle;

/** Convertit une entrée de bibliothèque en Titre minimal (pour les cartes). */
function versTitre(e: EntreeBibliotheque): Titre {
  return {
    id: e.tmdbId,
    type: e.type,
    titre: e.titre,
    titreOriginal: e.titre,
    synopsis: '',
    cheminAffiche: e.cheminAffiche,
    cheminFond: null,
    note: e.notePerso ?? 0,
    dateSortie: null,
    genres: [],
  };
}

export default function EcranBibliotheque() {
  const router = useRouter();
  const { variante, accent, encre } = useVariante();
  const { width: fenetre } = useWindowDimensions();

  const [entrees, setEntrees] = useState<EntreeBibliotheque[]>([]);
  const [avancees, setAvancees] = useState<Map<number, AvanceeSerie>>(new Map());
  const [filtre, setFiltre] = useState<StatutSuivi | 'tout'>('tout');
  const [tri, setTri] = useState<Tri>('recent');
  const [recherche, setRecherche] = useState('');
  const [premierChargement, setPremierChargement] = useState(true);
  const staggerArme = useRef(true);

  const grandEcran = fenetre >= seuilLarge;
  const largeurUtile = fenetre - (grandEcran ? largeurRail : 0);
  const d = densiteDe(largeurUtile);
  const t = typo(d);
  const padding = paddingEcran(largeurUtile);
  const gap = d === 'desktop' ? espacements.l : espacements.sm;

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        try {
          const biblio = await chargerBibliotheque();
          if (!actif) return;
          setEntrees(biblio);
          setPremierChargement(false);

          // L'avancement demande un appel TMDb par série : on le charge APRÈS
          // avoir affiché la grille, jamais avant. Les affiches ne doivent pas
          // attendre les barres de progression.
          const av = await avanceesDesSeries(biblio).catch(() => new Map<number, AvanceeSerie>());
          if (actif) setAvancees(av);
        } finally {
          if (actif) {
            setPremierChargement(false);
            setTimeout(() => (staggerArme.current = false), 800);
          }
        }
      })();
      return () => {
        actif = false;
      };
    }, [])
  );

  // Compteurs par statut : ils sont affichés dans les puces, donc calculés une
  // seule fois pour toute la liste.
  const compteurs = useMemo(() => {
    const c: Record<string, number> = { tout: entrees.length };
    for (const e of entrees) c[e.statut] = (c[e.statut] ?? 0) + 1;
    return c;
  }, [entrees]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLocaleLowerCase('fr');
    const liste = entrees.filter((e) => {
      if (filtre !== 'tout' && e.statut !== filtre) return false;
      // Recherche locale : la bibliothèque est déjà en mémoire, inutile de
      // solliciter le réseau pour filtrer ce qu'on a sous la main.
      return q.length === 0 || e.titre.toLocaleLowerCase('fr').includes(q);
    });

    return liste.sort((a, b) =>
      tri === 'alpha'
        ? a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' })
        : (b.vuLe ?? b.ajouteLe).localeCompare(a.vuLe ?? a.ajouteLe)
    );
  }, [entrees, filtre, recherche, tri]);

  const cible =
    d === 'desktop' ? (variante === 'grid' ? 148 : 176) : variante === 'grid' ? 92 : 108;
  const dispo = Math.min(largeurUtile, maxLargeur) - padding * 2;
  const colonnes = Math.max(2, Math.round(dispo / (cible + gap)));
  const largeur = Math.floor((dispo - (colonnes - 1) * gap) / colonnes);

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={[styles.conteneur, { paddingHorizontal: padding }]}>
        <View style={styles.enTeteLigne}>
          <Text style={[t.h1, { color: couleurs.texte }]}>Ma bibliothèque</Text>
          {entrees.length > 0 ? (
            <Pressable
              onPress={() => setTri((v) => (v === 'recent' ? 'alpha' : 'recent'))}
              accessibilityRole="button"
              accessibilityLabel={
                tri === 'recent' ? 'Trier par ordre alphabétique' : 'Trier par ajout récent'
              }
              style={({ hovered }: EtatPressable) => [
                styles.tri,
                hovered && { backgroundColor: couleurs.surface3, borderColor: couleurs.bordure2 },
              ]}
            >
              <Ionicons
                name={tri === 'recent' ? 'time-outline' : 'text-outline'}
                size={16}
                color={couleurs.texteDoux}
              />
              <Text style={[t.label, { color: couleurs.texteDoux }]}>
                {tri === 'recent' ? 'Récent' : 'A→Z'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {entrees.length > 0 ? (
          <View style={[styles.barre, { maxWidth: d === 'desktop' ? 440 : undefined }]}>
            <Ionicons name="search" size={17} color={couleurs.texteFaible} />
            <TextInput
              style={[t.bodyStrong, styles.champ, SANS_CONTOUR_WEB]}
              placeholder="Filtrer ma liste…"
              placeholderTextColor={couleurs.texteFaible}
              value={recherche}
              onChangeText={setRecherche}
              autoCorrect={false}
              accessibilityLabel="Filtrer ma bibliothèque"
            />
            {recherche ? (
              <Pressable
                onPress={() => setRecherche('')}
                accessibilityRole="button"
                accessibilityLabel="Effacer"
                style={styles.effacer}
              >
                <Ionicons name="close-circle" size={17} color={couleurs.texteDoux} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {premierChargement ? (
          <View style={{ marginTop: espacements.xl }}>
            <GrilleSquelettes colonnes={colonnes} largeur={largeur} lignes={2} gap={gap} />
          </View>
        ) : entrees.length === 0 ? (
          <View style={styles.vide}>
            <View
              style={[styles.videRond, { borderColor: accent, backgroundColor: `${accent}14` }]}
            >
              <Ionicons name="library-outline" size={40} color={accent} />
            </View>
            <Text style={[t.h2, { color: couleurs.texte, marginTop: espacements.l }]}>
              Rien dans ta bibliothèque
            </Text>
            <Text style={[t.body, styles.videSous]}>
              Les séries et films que tu ajoutes apparaîtront ici, avec leur avancement.
            </Text>
            <Pressable
              onPress={() => router.push('/decouvrir')}
              accessibilityRole="button"
              style={({ pressed }: EtatPressable) => [
                styles.videBtn,
                { backgroundColor: accent, shadowColor: accent },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={[t.label, { color: encre }]}>Découvrir</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            key={colonnes}
            data={visibles}
            keyExtractor={(item) => item.id}
            numColumns={colonnes}
            columnWrapperStyle={{ gap, marginBottom: gap }}
            contentContainerStyle={styles.liste}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.filtres}>
                {FILTRES.map((f) => {
                  const nb = compteurs[f.statut] ?? 0;
                  // Une puce « Abandonné (0) » n'aide personne : on masque les
                  // filtres sans contenu, sauf « Tout ».
                  if (nb === 0 && f.statut !== 'tout') return null;
                  const actif = f.statut === filtre;
                  return (
                    <Pressable
                      key={f.statut}
                      onPress={() => setFiltre(f.statut)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: actif }}
                      accessibilityLabel={`${f.libelle}, ${nb} titre${nb > 1 ? 's' : ''}`}
                      style={({ hovered }: EtatPressable) => [
                        styles.chip,
                        actif && { backgroundColor: accent, borderColor: accent },
                        hovered && !actif && { backgroundColor: couleurs.surface3 },
                      ]}
                    >
                      <Text style={[t.label, { color: actif ? encre : couleurs.texteDoux }]}>
                        {f.libelle}
                      </Text>
                      <Text
                        style={[styles.chipNb, { color: actif ? encre : couleurs.texteFaible }]}
                      >
                        {nb}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            }
            renderItem={({ item, index }) => {
              const avancee = avancees.get(item.tmdbId);
              return (
                <Animated.View
                  entering={
                    staggerArme.current
                      ? FadeInDown.duration(280).delay(Math.min(index, 8) * 40)
                      : undefined
                  }
                >
                  <CartePoster
                    titre={versTitre(item)}
                    largeur={largeur}
                    accent={accent}
                    // Une liste filtrée sur « Films » n'a pas besoin d'un badge
                    // « Film » sur chaque carte.
                    montrerType={filtre === 'tout'}
                    vu={item.statut === 'termine'}
                    progression={
                      avancee && item.statut === 'en_cours'
                        ? { vus: avancee.vus, total: avancee.total }
                        : undefined
                    }
                    onPress={() =>
                      router.push({
                        pathname: '/titre/[id]',
                        params: {
                          id: String(item.tmdbId),
                          type: item.type,
                          nom: item.titre,
                          affiche: item.cheminAffiche ?? '',
                        },
                      })
                    }
                  />
                </Animated.View>
              );
            }}
            ListEmptyComponent={
              <Text style={[t.body, styles.aucun]}>
                {recherche.trim()
                  ? `Aucun titre ne correspond à « ${recherche.trim()} ».`
                  : 'Aucun titre dans cette catégorie.'}
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
  conteneur: { flex: 1, width: '100%', maxWidth: maxLargeur, alignSelf: 'center' },
  enTeteLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: espacements.sm,
    marginBottom: espacements.m,
  },
  tri: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    height: 38,
    paddingHorizontal: espacements.m,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderTopColor: couleurs.lisere,
    cursor: 'pointer',
  },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    height: 48,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.rond,
    paddingHorizontal: espacements.m,
  },
  champ: { flex: 1, color: couleurs.texte, height: '100%' },
  effacer: { cursor: 'pointer' },
  filtres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.s,
    paddingTop: espacements.ml,
    paddingBottom: espacements.m,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    height: 38,
    paddingHorizontal: espacements.m,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    cursor: 'pointer',
  },
  chipNb: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    // Chiffres à chasse fixe : les compteurs ne doivent pas faire sautiller les
    // puces quand ils passent de 9 à 10.
    fontVariant: ['tabular-nums'],
  },
  liste: { paddingBottom: espacements.section },
  aucun: { color: couleurs.texteDoux, textAlign: 'center', marginTop: espacements.xxl },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: espacements.xxl },
  videRond: {
    width: 88,
    height: 88,
    borderRadius: rayons.rond,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videSous: {
    color: couleurs.texteDoux,
    textAlign: 'center',
    marginTop: espacements.s,
    marginBottom: espacements.l,
    maxWidth: 380,
  },
  videBtn: {
    paddingHorizontal: espacements.xl,
    height: 48,
    justifyContent: 'center',
    borderRadius: rayons.rond,
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
});
