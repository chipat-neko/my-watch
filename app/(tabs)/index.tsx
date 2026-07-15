// =============================================================================
//  Écran : Accueil (« À suivre »)
//  ---------------------------------------------------------------------------
//  Le cœur du suivi : une grande carte « prochain épisode », une liste
//  « Reprendre » (séries en cours) et un rail « Ta watchlist » (à voir).
//  Tout est branché sur la bibliothèque Firestore + les prochains épisodes TMDb.
// =============================================================================

import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CartePoster } from '@/components/CartePoster';
import { Chargement } from '@/components/Chargement';
import { chargerBibliotheque } from '@/services/bibliotheque';
import { prochainsEpisodes } from '@/services/agenda';
import { ProchainEpisode } from '@/lib/tmdb';
import { urlAffiche, urlFond } from '@/theme/constantes';
import { EntreeBibliotheque, Titre } from '@/types';
import { useVariante } from '@/hooks/useVariante';
import { couleurs, espacements, familles, maxLargeur, polices, rayons } from '@/theme/theme';

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
    note: 0,
    dateSortie: null,
    genres: [],
  };
}

export default function EcranAccueil() {
  const router = useRouter();
  const { variante, accent, encre } = useVariante();
  const [entrees, setEntrees] = useState<EntreeBibliotheque[]>([]);
  const [prochains, setProchains] = useState<ProchainEpisode[]>([]);
  const [chargement, setChargement] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        setChargement(true);
        try {
          const [biblio, eps] = await Promise.all([
            chargerBibliotheque(),
            prochainsEpisodes().catch(() => [] as ProchainEpisode[]),
          ]);
          if (actif) {
            setEntrees(biblio);
            setProchains(eps);
          }
        } finally {
          if (actif) setChargement(false);
        }
      })();
      return () => {
        actif = false;
      };
    }, [])
  );

  function ouvrir(tmdbId: number, type: string) {
    router.push({ pathname: '/titre/[id]', params: { id: String(tmdbId), type } });
  }

  if (chargement) return <Chargement message="Chargement de ta liste…" />;

  const enCours = entrees.filter((e) => e.statut === 'en_cours');
  const aVoir = entrees.filter((e) => e.statut === 'a_voir');
  const hero = prochains[0] ?? null;
  const titreEcran = variante === 'social' ? 'Fil d’actu' : 'À suivre';

  // État vide : aucune série suivie.
  if (entrees.length === 0) {
    return (
      <SafeAreaView style={styles.ecran} edges={['top']}>
        <Text style={styles.enTete}>{titreEcran}</Text>
        <View style={styles.vide}>
          <Ionicons name="tv-outline" size={52} color={accent} />
          <Text style={styles.videTitre}>Ta liste est vide</Text>
          <Text style={styles.videSous}>
            Ajoute des séries et des films depuis l’onglet Découvrir.
          </Text>
          <Pressable
            style={[styles.videBtn, { backgroundColor: accent }]}
            onPress={() => router.push('/decouvrir')}
            accessibilityRole="button"
          >
            <Text style={[styles.videBtnTexte, { color: encre }]}>Découvrir</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        <Text style={styles.enTete}>{titreEcran}</Text>

        {/* Hero : prochain épisode à venir */}
        {hero ? (
          <Pressable
            style={styles.hero}
            onPress={() => ouvrir(hero.serieId, 'serie')}
            accessibilityRole="button"
            accessibilityLabel={`Prochain épisode : ${hero.serieTitre}`}
          >
            <Image
              source={
                urlFond(hero.cheminAffiche) ? { uri: urlFond(hero.cheminAffiche)! } : undefined
              }
              style={styles.heroFond}
            />
            <View style={styles.heroVoile} />
            <View style={[styles.heroPastille, { backgroundColor: accent }]}>
              <Text style={[styles.heroPastilleTexte, { color: encre }]}>PROCHAIN ÉPISODE</Text>
            </View>
            <View style={styles.heroBas}>
              <Text style={styles.heroTitre} numberOfLines={1}>
                {hero.serieTitre}
              </Text>
              <Text style={styles.heroMeta}>
                S{hero.saison} E{hero.numero}
                {hero.nom ? ` · ${hero.nom}` : ''}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* Reprendre (séries en cours) */}
        {enCours.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionEnTete}>
              <Text style={styles.titreRang}>Reprendre</Text>
              <Text style={[styles.sectionCompteur, { color: accent }]}>
                {enCours.length} en cours
              </Text>
            </View>
            {enCours.map((e) => (
              <Pressable
                key={e.id}
                style={styles.ligne}
                onPress={() => ouvrir(e.tmdbId, e.type)}
                accessibilityRole="button"
                accessibilityLabel={e.titre}
              >
                {urlAffiche(e.cheminAffiche, 'w185') ? (
                  <Image
                    source={{ uri: urlAffiche(e.cheminAffiche, 'w185')! }}
                    style={styles.ligneAffiche}
                  />
                ) : (
                  <View style={styles.ligneAffiche} />
                )}
                <View style={styles.ligneInfos}>
                  <Text style={styles.ligneTitre} numberOfLines={1}>
                    {e.titre}
                  </Text>
                  <Text style={styles.ligneSous}>Série · en cours</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={couleurs.texteDoux} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Ta watchlist (à voir) */}
        {aVoir.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Ta watchlist</Text>
            <FlatList
              data={aVoir}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              renderItem={({ item }) => (
                <CartePoster
                  titre={versTitre(item)}
                  largeur={112}
                  onPress={() => ouvrir(item.tmdbId, item.type)}
                />
              )}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  // Borne la largeur du contenu et le centre (sinon il s'étire sur grand écran).
  contenu: {
    paddingBottom: espacements.xl,
    width: '100%',
    maxWidth: maxLargeur,
    alignSelf: 'center',
  },
  enTete: {
    color: couleurs.texte,
    fontSize: polices.grandTitre,
    fontFamily: familles.extrabold,
    paddingHorizontal: espacements.l,
    paddingTop: espacements.m,
    marginBottom: espacements.m,
  },
  // Hero
  hero: {
    height: 200,
    marginHorizontal: espacements.l,
    borderRadius: rayons.hero,
    overflow: 'hidden',
    backgroundColor: couleurs.surface,
    justifyContent: 'flex-end',
  },
  heroFond: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroVoile: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,14,17,0.45)' },
  heroPastille: {
    position: 'absolute',
    top: espacements.m,
    left: espacements.m,
    paddingHorizontal: espacements.s,
    paddingVertical: 4,
    borderRadius: rayons.rond,
  },
  heroPastilleTexte: { fontSize: 10, fontFamily: familles.extrabold, letterSpacing: 0.5 },
  heroBas: { padding: espacements.m },
  heroTitre: { color: couleurs.texte, fontSize: 22, fontFamily: familles.extrabold },
  heroMeta: {
    color: couleurs.texteCorps,
    fontSize: polices.normale,
    fontFamily: familles.semibold,
    marginTop: 2,
  },
  // Sections
  section: { marginTop: espacements.xl },
  sectionEnTete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.l,
    marginBottom: espacements.m,
  },
  sectionTitre: {
    color: couleurs.texte,
    fontSize: polices.titre,
    fontFamily: familles.extrabold,
    paddingHorizontal: espacements.l,
    marginBottom: espacements.m,
  },
  titreRang: { color: couleurs.texte, fontSize: polices.titre, fontFamily: familles.extrabold },
  sectionCompteur: { fontSize: polices.normale, fontFamily: familles.bold },
  // Ligne "reprendre"
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    marginHorizontal: espacements.l,
    marginBottom: espacements.s,
    padding: espacements.s,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.m,
  },
  ligneAffiche: {
    width: 46,
    height: 66,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
  },
  ligneInfos: { flex: 1 },
  ligneTitre: { color: couleurs.texte, fontSize: polices.moyenne, fontFamily: familles.bold },
  ligneSous: {
    color: couleurs.texteDoux,
    fontSize: polices.petite,
    fontFamily: familles.medium,
    marginTop: 2,
  },
  rail: { paddingHorizontal: espacements.l, gap: espacements.m },
  // État vide
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacements.xl },
  videTitre: {
    color: couleurs.texte,
    fontSize: polices.titre,
    fontFamily: familles.bold,
    marginTop: espacements.m,
  },
  videSous: {
    color: couleurs.texteDoux,
    fontSize: polices.normale,
    fontFamily: familles.medium,
    textAlign: 'center',
    marginTop: espacements.s,
    marginBottom: espacements.l,
    maxWidth: 300,
  },
  videBtn: {
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.m,
    borderRadius: rayons.rond,
  },
  videBtnTexte: { fontSize: polices.moyenne, fontFamily: familles.bold },
});
