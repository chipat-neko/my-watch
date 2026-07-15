// =============================================================================
//  Écran : Accueil (« À suivre »)
//  ---------------------------------------------------------------------------
//  Le cœur du suivi : un hero « prochain épisode », une liste « Reprendre »
//  (séries en cours, avec leur avancement), un rail « Ta watchlist » (à voir) et
//  un rail « Vu récemment ».
//
//  Composition (leçons du benchmark Netflix / Plex / Trakt) :
//   - Le HERO et les RAILS sont full-bleed : ils ignorent la borne de largeur.
//     Un rail qui s'arrête pile au bord semble fini ; un rail dont le dernier
//     poster sort du cadre dit « il y en a plus ».
//   - Le hero n'a PAS de coins arrondis sur grand écran : le coin arrondi dit
//     « carte », le bord franc dit « cinéma ».
//   - L'image du hero teinte toute la page (FondAmbiance) au lieu d'être posée
//     sur un aplat.
// =============================================================================

import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CartePoster } from '@/components/CartePoster';
import { Fil } from '@/components/accueil/Fil';
import { Mosaique } from '@/components/accueil/Mosaique';
import { FondAmbiance } from '@/components/FondAmbiance';
import { Progression } from '@/components/Progression';
import { GrilleSquelettes, LignesSquelettes, Squelette } from '@/components/Squelette';
import { chargerBibliotheque } from '@/services/bibliotheque';
import { avanceesDesSeries, AvanceeSerie } from '@/services/progression';
import { avanceeApresMarquage } from '@/services/progressionCalcul';
import { PositionEpisode } from '@/services/prochainAVoir';
import { marquerPositionVue } from '@/services/suivi';
import { prochainsEpisodes } from '@/services/agenda';
import { ProchainEpisode } from '@/lib/tmdb';
import { urlAffiche, urlFond } from '@/theme/constantes';
import { EntreeBibliotheque, EtatPressable, Titre } from '@/types';
import { useVariante } from '@/hooks/useVariante';
import {
  couleurs,
  densiteDe,
  espacements,
  fondus,
  largeurRail,
  maxLargeur,
  paddingEcran,
  rayons,
  seuilLarge,
  typo,
} from '@/theme/theme';

/**
 * Ce que le hero met en avant : soit un épisode à reprendre (on peut le
 * regarder maintenant), soit un épisode à venir (on l'attend).
 */
interface VedetteHero {
  genre: 'reprendre' | 'a_venir';
  serieId: number;
  serieTitre: string;
  cheminAffiche: string | null;
  cheminFond: string | null;
  saison: number;
  numero: number;
  nom: string;
  /** Renseigné pour « a_venir ». */
  dateDiffusion?: string;
  /** Renseigné pour « reprendre ». */
  avancee?: AvanceeSerie;
}

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
  const { width: fenetre } = useWindowDimensions();

  const grandEcran = fenetre >= seuilLarge;
  // La largeur RÉELLEMENT disponible : la barre latérale occupe déjà sa place.
  const largeurUtile = fenetre - (grandEcran ? largeurRail : 0);
  const d = densiteDe(largeurUtile);
  const t = typo(d);
  const padding = paddingEcran(largeurUtile);

  const [entrees, setEntrees] = useState<EntreeBibliotheque[]>([]);
  const [prochains, setProchains] = useState<ProchainEpisode[]>([]);
  const [avancees, setAvancees] = useState<Map<number, AvanceeSerie>>(new Map());
  const [premierChargement, setPremierChargement] = useState(true);
  // Désarme le stagger après le premier rendu : rejouer l'animation d'entrée à
  // chaque retour d'onglet est du clignotement, pas du raffinement.
  const staggerArme = useRef(true);

  useFocusEffect(
    useCallback(() => {
      let actif = true;
      (async () => {
        try {
          const [biblio, eps] = await Promise.all([
            chargerBibliotheque(),
            prochainsEpisodes().catch(() => [] as ProchainEpisode[]),
          ]);
          if (!actif) return;
          setEntrees(biblio);
          setProchains(eps);

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

  function ouvrir(tmdbId: number, type: string) {
    router.push({ pathname: '/titre/[id]', params: { id: String(tmdbId), type } });
  }

  /**
   * Marque vu le prochain épisode d'une série, depuis l'accueil.
   *
   * L'avancement est mis à jour de façon OPTIMISTE : la barre progresse et la
   * ligne annonce l'épisode suivant immédiatement, sans attendre les deux
   * allers-retours (TMDb pour résoudre l'identifiant, Firestore pour écrire).
   * En cas d'échec, on recharge la vérité depuis le serveur.
   */
  async function marquerProchainVu(entree: EntreeBibliotheque, position: PositionEpisode) {
    const avant = avancees;
    const courante = avant.get(entree.tmdbId);
    if (!courante) return;

    const optimiste = new Map(avant);
    optimiste.set(entree.tmdbId, avanceeApresMarquage(courante, position));
    setAvancees(optimiste);

    try {
      const ok = await marquerPositionVue(entree.tmdbId, position, {
        titre: entree.titre,
        cheminAffiche: entree.cheminAffiche,
      });
      if (!ok) throw new Error('Épisode introuvable sur TMDb');
    } catch {
      setAvancees(avant);
      return;
    }
    // Recale sur la vérité du serveur (le statut a pu changer, la série passer
    // « à jour »…), sans bloquer le retour visuel qui a déjà eu lieu.
    avanceesDesSeries(entrees)
      .then(setAvancees)
      .catch(() => {});
  }

  const enCours = entrees.filter((e) => e.statut === 'en_cours');
  const aVoir = entrees.filter((e) => e.statut === 'a_voir');
  // Réparation du trou historique de cet écran : quand rien n'était « en cours »
  // ni « à voir » — par exemple après avoir tout terminé — AUCUNE section ne
  // s'affichait, et l'état vide ne se déclenchait pas non plus (`entrees` n'est
  // pas vide). L'écran restait donc littéralement blanc sous son titre.
  const termines = entrees
    .filter((e) => e.statut === 'termine')
    .sort((a, b) => (b.vuLe ?? b.ajouteLe).localeCompare(a.vuLe ?? a.ajouteLe));

  const titreEcran = variante === 'social' ? 'Fil d’actu' : 'À suivre';

  /**
   * Le hero met en avant, par ordre de priorité :
   *  1. l'épisode à REPRENDRE — ce qu'on peut regarder tout de suite ;
   *  2. à défaut, le prochain épisode à DIFFUSER — ce qu'on attend.
   *
   * L'inverse serait absurde : une série terminée n'a aucun épisode à venir, si
   * bien qu'une bibliothèque entièrement rattrapée n'avait pas de hero du tout
   * et laissait un écran presque nu. Et surtout, « regarde ça maintenant » est
   * plus utile que « ça sort dans trois semaines ».
   */
  const aReprendre = enCours
    .map((e) => ({ entree: e, avancee: avancees.get(e.tmdbId) }))
    .find((x) => x.avancee?.prochain);

  const hero: VedetteHero | null = aReprendre?.avancee?.prochain
    ? {
        genre: 'reprendre',
        serieId: aReprendre.entree.tmdbId,
        serieTitre: aReprendre.entree.titre,
        cheminAffiche: aReprendre.entree.cheminAffiche,
        cheminFond: aReprendre.avancee.cheminFond,
        saison: aReprendre.avancee.prochain.saison,
        numero: aReprendre.avancee.prochain.numero,
        nom: '',
        avancee: aReprendre.avancee,
      }
    : prochains[0]
      ? {
          genre: 'a_venir',
          serieId: prochains[0].serieId,
          serieTitre: prochains[0].serieTitre,
          cheminAffiche: prochains[0].cheminAffiche,
          cheminFond: prochains[0].cheminFond,
          saison: prochains[0].saison,
          numero: prochains[0].numero,
          nom: prochains[0].nom,
          dateDiffusion: prochains[0].dateDiffusion,
        }
      : null;

  // Hauteur du hero : 420-560 sur desktop (en deçà de 420 c'est une bannière
  // publicitaire, au-delà de 560 le contenu suivant disparaît sous la ligne de
  // flottaison) ; 62 % de la largeur sur mobile.
  const hauteurHero = grandEcran
    ? Math.round(Math.min(560, Math.max(420, largeurUtile * 0.32)))
    : Math.round(largeurUtile * 0.62);

  const largeurRailPoster = d === 'desktop' ? 168 : 116;
  // Au-delà de ~1100px utiles, une ligne unique devient une bande vide : on
  // passe à deux colonnes.
  const colonnesReprendre = largeurUtile >= 1100 ? 2 : 1;

  // --- Premier chargement : squelettes aux dimensions réelles ----------------
  if (premierChargement) {
    return (
      <SafeAreaView style={styles.ecran} edges={['top']}>
        <View style={{ padding }}>
          <Squelette largeur="45%" hauteur={t.h1.fontSize} rayon={rayons.s} />
          <Squelette
            largeur="100%"
            hauteur={hauteurHero}
            rayon={grandEcran ? 0 : rayons.hero}
            style={{ marginTop: espacements.l }}
          />
          <View style={{ marginTop: espacements.xl }}>
            <LignesSquelettes nombre={3} />
          </View>
          <View style={{ marginTop: espacements.xl }}>
            <GrilleSquelettes
              colonnes={Math.max(2, Math.floor(largeurUtile / (largeurRailPoster + 20)))}
              largeur={largeurRailPoster}
              lignes={1}
              gap={espacements.m}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Aucune série suivie du tout ------------------------------------------
  if (entrees.length === 0) {
    return (
      <EtatVide
        titre="Ta liste est vide"
        sous="Ajoute des séries et des films depuis l’onglet Découvrir : ils apparaîtront ici avec leur avancement."
        icone="tv-outline"
        libelleAction="Découvrir"
        onAction={() => router.push('/decouvrir')}
        accent={accent}
        encre={encre}
        enTete={titreEcran}
        padding={padding}
        densite={d}
      />
    );
  }

  // --- Des séries, mais rien à suivre (tout terminé / abandonné) -------------
  // C'est le cas qui laissait l'écran blanc. Il mérite son propre message : dire
  // « ta liste est vide » à quelqu'un qui a 40 séries terminées serait faux.
  const riensASuivre = enCours.length === 0 && aVoir.length === 0 && !hero;
  if (riensASuivre && termines.length > 0) {
    return (
      <EtatVide
        titre="Tu es à jour"
        sous={`${termines.length} ${termines.length > 1 ? 'titres terminés' : 'titre terminé'}, et rien en cours. Trouve ta prochaine série dans Découvrir.`}
        icone="checkmark-done-outline"
        libelleAction="Trouver une série"
        onAction={() => router.push('/decouvrir')}
        accent={accent}
        encre={encre}
        enTete={titreEcran}
        padding={padding}
        densite={d}
      />
    );
  }

  // --- Apparence « Grille » : une mosaïque, sans hero ni sections ------------
  // Le choix d'apparence doit changer la STRUCTURE de l'écran, pas seulement sa
  // couleur : ici, on renonce au récit (hero, titres de section, libellés) au
  // profit de la densité. Tout est dans l'affiche.
  if (variante === 'grid') {
    return (
      <Mosaique
        enCours={enCours}
        aVoir={aVoir}
        termines={termines}
        avancees={avancees}
        accent={accent}
        densite={d}
        padding={padding}
        largeurUtile={largeurUtile}
        titreEcran={titreEcran}
        staggerArme={staggerArme.current}
        onOuvrir={ouvrir}
      />
    );
  }

  // --- Apparence « Social » : un fil vertical de grandes cartes --------------
  if (variante === 'social') {
    return (
      <Fil
        enCours={enCours}
        aVoir={aVoir}
        avancees={avancees}
        accent={accent}
        encre={encre}
        densite={d}
        padding={padding}
        titreEcran={titreEcran}
        staggerArme={staggerArme.current}
        onOuvrir={ouvrir}
        onMarquerVu={marquerProchainVu}
      />
    );
  }

  // --- Apparence « Classique » : hero éditorial + sections -------------------
  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        {/* L'image du hero teinte toute la page : l'écran cesse d'être un formulaire. */}
        <FondAmbiance
          chemin={hero?.cheminFond ?? hero?.cheminAffiche ?? null}
          hauteur={hauteurHero + 200}
        />

        <View style={[styles.enTeteLigne, { paddingHorizontal: padding }]}>
          <Text style={[t.h1, styles.enTete]}>{titreEcran}</Text>
          {/* Le calendrier n'est plus un onglet (la barre plafonne à cinq) : il
              vit ici, à côté du hero qui annonce déjà le prochain épisode. */}
          <Pressable
            onPress={() => router.push('/calendrier')}
            accessibilityRole="button"
            accessibilityLabel="Voir le calendrier des prochains épisodes"
            style={({ hovered }: EtatPressable) => [
              styles.btnCalendrier,
              hovered && { backgroundColor: couleurs.surface3, borderColor: accent },
            ]}
          >
            <Ionicons name="calendar-outline" size={16} color={accent} />
            <Text style={[t.label, { color: couleurs.texteDoux }]}>À venir</Text>
          </Pressable>
        </View>

        {hero ? (
          <Hero
            vedette={hero}
            hauteur={hauteurHero}
            grandEcran={grandEcran}
            padding={padding}
            accent={accent}
            encre={encre}
            densite={d}
            onPress={() => ouvrir(hero.serieId, 'serie')}
          />
        ) : null}

        <View style={styles.bornes}>
          {/* Reprendre : la seule section où l'avancement a un sens. */}
          {enCours.length > 0 ? (
            <Section
              titre="Reprendre"
              compteur={`${enCours.length} en cours`}
              accent={accent}
              padding={padding}
              densite={d}
            >
              {/* Grille sur grand écran : une LISTE de lignes étirée sur 1400px
                  pour un poster de 52px et deux lignes de texte, c'est une barre
                  de progression d'un mètre de long. Deux colonnes donnent des
                  lignes à une largeur lisible et remplissent l'écran. */}
              <View style={[styles.grilleReprendre, { paddingHorizontal: padding }]}>
                {enCours.map((e, i) => (
                  <Animated.View
                    key={e.id}
                    style={colonnesReprendre === 2 ? styles.demiColonne : undefined}
                    entering={
                      staggerArme.current
                        ? FadeInDown.duration(280).delay(Math.min(i, 8) * 40)
                        : undefined
                    }
                  >
                    <LigneReprendre
                      entree={e}
                      avancee={avancees.get(e.tmdbId)}
                      accent={accent}
                      encre={encre}
                      densite={d}
                      onPress={() => ouvrir(e.tmdbId, e.type)}
                      onMarquerVu={(position) => marquerProchainVu(e, position)}
                    />
                  </Animated.View>
                ))}
              </View>
            </Section>
          ) : null}

          {aVoir.length > 0 ? (
            <Section titre="Ta watchlist" accent={accent} padding={padding} densite={d}>
              <RailPosters
                donnees={aVoir}
                largeur={largeurRailPoster}
                padding={padding}
                accent={accent}
                onOuvrir={ouvrir}
              />
            </Section>
          ) : null}

          {termines.length > 0 ? (
            <Section titre="Vu récemment" accent={accent} padding={padding} densite={d}>
              <RailPosters
                donnees={termines.slice(0, 20)}
                largeur={largeurRailPoster}
                padding={padding}
                accent={accent}
                vu
                onOuvrir={ouvrir}
              />
            </Section>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Hero ------------------------------------------------------------------

function Hero({
  vedette,
  hauteur,
  grandEcran,
  padding,
  accent,
  encre,
  densite,
  onPress,
}: {
  vedette: VedetteHero;
  hauteur: number;
  grandEcran: boolean;
  padding: number;
  accent: string;
  encre: string;
  densite: 'mobile' | 'desktop';
  onPress: () => void;
}) {
  const t = typo(densite);
  const fond = urlFond(vedette.cheminFond, 'w1280') ?? urlAffiche(vedette.cheminAffiche, 'w500');
  const reprendre = vedette.genre === 'reprendre';

  const date = vedette.dateDiffusion
    ? new Date(`${vedette.dateDiffusion}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${reprendre ? 'Reprendre' : 'Prochain épisode'} : ${vedette.serieTitre}, saison ${vedette.saison} épisode ${vedette.numero}`}
      style={[
        styles.hero,
        {
          height: hauteur,
          // Le bord franc dit « cinéma », le coin arrondi dit « carte ».
          borderRadius: grandEcran ? 0 : rayons.hero,
          marginHorizontal: grandEcran ? 0 : padding,
        },
      ]}
    >
      {fond ? (
        <Image
          source={{ uri: fond }}
          style={StyleSheet.absoluteFill}
          // Les backdrops TMDb ont l'action dans le tiers haut.
          contentPosition="top"
          contentFit="cover"
          transition={400}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : null}

      {/* Scrim vertical : révèle le bas de l'image plutôt que de délaver l'ensemble. */}
      <LinearGradient
        colors={[...fondus.versBas]}
        locations={[...fondus.positionsVersBas]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Scrim horizontal : assied le texte à gauche, garde l'image vive à droite. */}
      <LinearGradient
        colors={[...fondus.versDroite]}
        locations={[...fondus.positionsVersDroite]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.85, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.heroBas, { padding: grandEcran ? padding : espacements.ml }]}>
        {/* L'overline en capitales espacées sous un grand titre : le détail le
            moins cher de la composition éditoriale. */}
        <Text style={[t.overline, { color: accent }]}>
          {reprendre ? 'À REPRENDRE' : `PROCHAIN ÉPISODE · ${date?.toUpperCase() ?? ''}`}
        </Text>
        <Text
          style={[densite === 'desktop' ? t.display : t.h1, styles.heroTitre]}
          numberOfLines={2}
        >
          {vedette.serieTitre}
        </Text>
        <Text style={[t.bodyStrong, { color: couleurs.texteCorps }]} numberOfLines={1}>
          S{vedette.saison} E{vedette.numero}
          {vedette.nom ? ` · ${vedette.nom}` : ''}
        </Text>

        {vedette.avancee ? (
          <View style={styles.heroProgression}>
            <Progression
              vus={vedette.avancee.vus}
              total={vedette.avancee.total}
              accent={accent}
              libelle
            />
          </View>
        ) : null}

        <View style={[styles.heroBtn, { backgroundColor: accent, shadowColor: accent }]}>
          <Ionicons name={reprendre ? 'play' : 'calendar-outline'} size={15} color={encre} />
          <Text style={[t.label, { color: encre }]}>
            {reprendre ? 'Reprendre la série' : 'Voir la série'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// --- Sections ---------------------------------------------------------------

function Section({
  titre,
  compteur,
  accent,
  padding,
  densite,
  children,
}: {
  titre: string;
  compteur?: string;
  accent: string;
  padding: number;
  densite: 'mobile' | 'desktop';
  children: React.ReactNode;
}) {
  const t = typo(densite);
  return (
    <View style={{ marginTop: densite === 'desktop' ? espacements.section : espacements.xl }}>
      <View style={[styles.sectionEnTete, { paddingHorizontal: padding }]}>
        <Text style={[t.h2, { color: couleurs.texte }]}>{titre}</Text>
        {/* Le compteur est collé au titre, et non renvoyé à l'autre bout de
            l'écran : à 1400px de distance, plus rien ne les relie. */}
        {compteur ? (
          <View style={[styles.compteur, { borderColor: `${accent}59` }]}>
            <Text style={[t.caption, { color: accent }]}>{compteur}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Rail horizontal d'affiches. Full-bleed : il déborde volontairement à droite. */
function RailPosters({
  donnees,
  largeur,
  padding,
  accent,
  vu = false,
  onOuvrir,
}: {
  donnees: EntreeBibliotheque[];
  largeur: number;
  padding: number;
  accent: string;
  vu?: boolean;
  onOuvrir: (id: number, type: string) => void;
}) {
  return (
    <FlatList
      data={donnees}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Le padding vertical évite que la carte AGRANDIE au survol soit coupée
      // par l'overflow du ScrollView (piège réel de react-native-web).
      contentContainerStyle={{
        paddingHorizontal: padding,
        paddingVertical: espacements.sm,
        gap: espacements.m,
      }}
      snapToInterval={largeur + espacements.m}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <CartePoster
          titre={versTitre(item)}
          largeur={largeur}
          accent={accent}
          vu={vu}
          onPress={() => onOuvrir(item.tmdbId, item.type)}
        />
      )}
    />
  );
}

/**
 * Une ligne « Reprendre » : affiche, titre, ÉPISODE À REGARDER, avancement, et
 * un bouton pour le marquer vu sans quitter l'accueil.
 *
 * C'est le geste qui définit une application de suivi : la ligne affichait
 * « Série · en cours », ce qui n'apprend rien. Elle dit maintenant « S2 E5 » et
 * permet d'avancer d'un seul appui.
 */
function LigneReprendre({
  entree,
  avancee,
  accent,
  encre,
  densite,
  onPress,
  onMarquerVu,
}: {
  entree: EntreeBibliotheque;
  avancee?: AvanceeSerie;
  accent: string;
  encre: string;
  densite: 'mobile' | 'desktop';
  onPress: () => void;
  onMarquerVu: (position: PositionEpisode) => Promise<void>;
}) {
  const t = typo(densite);
  const uri = urlAffiche(entree.cheminAffiche, 'w185');
  const [occupe, setOccupe] = useState(false);
  const prochain = avancee?.prochain ?? null;

  async function marquer() {
    if (!prochain || occupe) return;
    setOccupe(true);
    try {
      await onMarquerVu(prochain);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <Pressable
      style={({ hovered }: EtatPressable) => [
        styles.ligne,
        hovered && { backgroundColor: couleurs.surface3, borderColor: couleurs.bordure2 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        avancee ? `${entree.titre}, ${avancee.vus} épisodes vus sur ${avancee.total}` : entree.titre
      }
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.ligneAffiche}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
          accessible={false}
        />
      ) : (
        <View style={styles.ligneAffiche} />
      )}
      <View style={styles.ligneInfos}>
        <Text style={[t.h3, { color: couleurs.texte }]} numberOfLines={1}>
          {entree.titre}
        </Text>

        {prochain ? (
          <Text style={[t.overline, { color: accent, marginTop: 3 }]}>
            À REGARDER · S{prochain.saison} E{prochain.numero}
          </Text>
        ) : avancee ? (
          <Text style={[t.overline, { color: couleurs.texteFaible, marginTop: 3 }]}>À JOUR</Text>
        ) : null}

        {avancee ? (
          <View style={{ marginTop: espacements.s }}>
            <Progression vus={avancee.vus} total={avancee.total} accent={accent} libelle />
          </View>
        ) : (
          <Text style={[t.caption, { color: couleurs.texteFaible, marginTop: 2 }]}>
            Série · en cours
          </Text>
        )}
      </View>

      {prochain ? (
        <Pressable
          onPress={marquer}
          disabled={occupe}
          accessibilityRole="button"
          accessibilityLabel={`Marquer S${prochain.saison} E${prochain.numero} comme vu`}
          // Étend la zone tactile au-delà du visuel : 36px de visuel, 44 de cible.
          hitSlop={8}
          style={({ hovered, pressed }: EtatPressable) => [
            styles.btnVu,
            { borderColor: accent },
            hovered && { backgroundColor: accent },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          {({ hovered }: EtatPressable) => (
            <Ionicons
              name={occupe ? 'hourglass-outline' : 'checkmark'}
              size={19}
              color={hovered ? encre : accent}
            />
          )}
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={couleurs.texteFaible} />
      )}
    </Pressable>
  );
}

// --- État vide --------------------------------------------------------------

function EtatVide({
  titre,
  sous,
  icone,
  libelleAction,
  onAction,
  accent,
  encre,
  enTete,
  padding,
  densite,
}: {
  titre: string;
  sous: string;
  icone: keyof typeof Ionicons.glyphMap;
  libelleAction: string;
  onAction: () => void;
  accent: string;
  encre: string;
  enTete: string;
  padding: number;
  densite: 'mobile' | 'desktop';
}) {
  const t = typo(densite);
  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <Text style={[t.h1, styles.enTete, { paddingHorizontal: padding }]}>{enTete}</Text>
      <View style={styles.vide}>
        <View style={[styles.videRond, { borderColor: accent, backgroundColor: `${accent}14` }]}>
          <Ionicons name={icone} size={44} color={accent} />
        </View>
        <Text style={[t.h2, { color: couleurs.texte, marginTop: espacements.l }]}>{titre}</Text>
        <Text style={[t.body, styles.videSous]}>{sous}</Text>
        <Pressable
          style={({ pressed }: EtatPressable) => [
            styles.videBtn,
            { backgroundColor: accent, shadowColor: accent },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onAction}
          accessibilityRole="button"
        >
          <Text style={[t.label, { color: encre }]}>{libelleAction}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.page },
  contenu: { paddingBottom: espacements.section },
  // Seul le contenu structuré est borné : le hero et les rails, eux, sont full-bleed.
  bornes: { width: '100%', maxWidth: maxLargeur, alignSelf: 'center' },
  enTeteLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacements.m,
    paddingTop: espacements.sm,
    marginBottom: espacements.l,
  },
  enTete: { color: couleurs.texte },
  btnCalendrier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    height: 38,
    paddingHorizontal: espacements.m,
    borderRadius: rayons.rond,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure2,
    borderTopColor: couleurs.lisere,
    cursor: 'pointer',
  },
  hero: {
    overflow: 'hidden',
    backgroundColor: couleurs.surface,
    justifyContent: 'flex-end',
  },
  heroBas: { maxWidth: 620 },
  heroTitre: { color: couleurs.texte, marginTop: espacements.xs },
  heroProgression: { maxWidth: 260, marginTop: espacements.sm },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.s,
    alignSelf: 'flex-start',
    marginTop: espacements.m,
    paddingHorizontal: espacements.ml,
    height: 44,
    borderRadius: rayons.rond,
    // Une seule source de lumière colorée par écran : elle signale l'action.
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  compteur: {
    borderWidth: 1,
    borderRadius: rayons.rond,
    paddingHorizontal: espacements.s,
    paddingVertical: 3,
  },
  grilleReprendre: { flexDirection: 'row', flexWrap: 'wrap', gap: espacements.sm },
  /**
   * `maxWidth` est indispensable : avec `flexGrow` seul, une série unique
   * s'étirerait sur toute la largeur — c'est-à-dire une barre de progression de
   * 1400 px pour une affiche de 52 px.
   */
  demiColonne: { flexBasis: '48%', flexGrow: 1, maxWidth: '49%' },
  sectionEnTete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    // Serré : le titre et son contenu forment UN groupe. C'est le rapport entre
    // cet espace (16) et celui qui sépare deux sections (56) qui crée la
    // structure — à distances égales, tout flotte et rien n'est groupé.
    marginBottom: espacements.m,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.m,
    marginBottom: espacements.sm,
    padding: espacements.sm,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    // Le liseré clair EN HAUT simule une lumière zénithale : en mode sombre,
    // c'est lui qui porte l'élévation, pas l'ombre (invisible sur fond noir).
    borderTopColor: couleurs.lisere,
    borderRadius: rayons.l,
  },
  ligneAffiche: {
    width: 60,
    height: 90,
    borderRadius: rayons.s,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.lisere,
  },
  ligneInfos: { flex: 1 },
  btnVu: {
    width: 36,
    height: 36,
    borderRadius: rayons.rond,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  vide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacements.xl },
  videRond: {
    width: 96,
    height: 96,
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
