// =============================================================================
//  Types partagés de l'application My Watch
//  ---------------------------------------------------------------------------
//  Ce fichier centralise toutes les structures de données manipulées dans
//  l'app : les titres (films/séries) renvoyés par TMDb, les épisodes, et les
//  entrées de la bibliothèque personnelle de l'utilisateur (stockées dans
//  Firestore). Tout est commenté en français pour faciliter la maintenance.
// =============================================================================

/** Type d'un média : soit un film, soit une série télévisée. */
export type TypeMedia = 'film' | 'serie';

/**
 * État d'un `Pressable`.
 *
 * `hovered` est bien fourni à l'exécution par react-native-web, mais il est
 * absent des typings de React Native (qui ne connaît que `pressed`). Ce type
 * évite d'avoir à écrire `any` sur chaque callback de style.
 */
export interface EtatPressable {
  pressed: boolean;
  hovered?: boolean;
}

/**
 * Statut de suivi d'un titre dans la bibliothèque de l'utilisateur.
 * - "a_voir"    : ajouté à la watchlist, pas encore commencé
 * - "en_cours"  : série en cours de visionnage
 * - "termine"   : film vu / série terminée
 * - "abandonne" : arrêté en cours de route
 */
export type StatutSuivi = 'a_voir' | 'en_cours' | 'termine' | 'abandonne';

/**
 * Un titre tel que renvoyé par l'API TMDb, normalisé pour l'app.
 * On utilise une forme unifiée pour les films ET les séries afin de
 * simplifier l'affichage dans les listes et les cartes.
 */
export interface Titre {
  /** Identifiant TMDb du titre. */
  id: number;
  /** Film ou série. */
  type: TypeMedia;
  /** Titre affiché (localisé en français si dispo). */
  titre: string;
  /** Titre original (langue d'origine). */
  titreOriginal: string;
  /** Résumé / synopsis. */
  synopsis: string;
  /** Chemin relatif de l'affiche TMDb (ex : "/abc.jpg"), ou null. */
  cheminAffiche: string | null;
  /** Chemin relatif de l'image de fond (backdrop), ou null. */
  cheminFond: string | null;
  /** Note moyenne TMDb sur 10. */
  note: number;
  /** Date de sortie (film) ou de première diffusion (série), format ISO. */
  dateSortie: string | null;
  /** Identifiants des genres TMDb. */
  genres: number[];
  /**
   * Nombre de saisons (séries uniquement, renseigné par le détail TMDb).
   * Absent pour les films et pour les résultats de recherche/tendances.
   */
  nombreSaisons?: number;
  /**
   * Nombre total d'épisodes diffusés (séries uniquement, renseigné par le
   * détail TMDb). Sert de dénominateur à la barre de progression.
   */
  nombreEpisodes?: number;
  /**
   * Sommaire des saisons (séries uniquement, renseigné par le détail TMDb).
   * Les épisodes spéciaux (saison 0) sont exclus : ils ne comptent pas dans la
   * progression normale d'une série.
   *
   * Permet de calculer le « prochain épisode à regarder » SANS aucun appel
   * réseau supplémentaire : on connaît le nombre d'épisodes de chaque saison,
   * et on sait lesquels sont vus.
   */
  saisons?: SommaireSaison[];
  /**
   * Durée en minutes (renseignée par le détail TMDb) : durée du film, ou durée
   * type d'un épisode pour une série. Sert au calcul du temps de visionnage.
   */
  duree?: number;
}

/** Une saison, telle que résumée par le détail TMDb d'une série. */
export interface SommaireSaison {
  numero: number;
  nbEpisodes: number;
}

/** Un épisode d'une série. */
export interface Episode {
  /** Identifiant TMDb de l'épisode. */
  id: number;
  /** Numéro de saison. */
  saison: number;
  /** Numéro d'épisode dans la saison. */
  numero: number;
  /** Nom de l'épisode. */
  nom: string;
  /** Résumé de l'épisode. */
  synopsis: string;
  /** Date de diffusion, format ISO, ou null si inconnue. */
  dateDiffusion: string | null;
  /** Durée en minutes, ou null. */
  duree: number | null;
}

/**
 * Une entrée de la bibliothèque personnelle de l'utilisateur.
 * Persistée dans Firestore : users/{uid}/bibliotheque.
 */
export interface EntreeBibliotheque {
  /** Identifiant du document Firestore (déterministe : `${type}_${tmdbId}`). */
  id: string;
  /** Identifiant de l'utilisateur propriétaire (auth Firebase). */
  utilisateurId: string;
  /** Identifiant TMDb du titre suivi. */
  tmdbId: number;
  /** Film ou série. */
  type: TypeMedia;
  /** Copie du titre (évite un appel TMDb pour afficher la liste). */
  titre: string;
  /** Copie du chemin d'affiche pour l'affichage hors-ligne. */
  cheminAffiche: string | null;
  /** Statut de suivi courant. */
  statut: StatutSuivi;
  /** Note personnelle sur 10, ou null si non notée. */
  notePerso: number | null;
  /** Provenance de l'entrée (saisie manuelle, import…). Voir SourceEntree. */
  source: SourceEntree;
  /** Date d'ajout à la liste, format ISO. */
  ajouteLe: string;
  /**
   * Date de visionnage, format ISO, ou null si non applicable/inconnue.
   * Renseignée à l'import (date d'historique) ou automatiquement à la
   * complétion (statut "termine") par un trigger côté base.
   */
  vuLe: string | null;
}

/**
 * Provenance d'une entrée : permet de distinguer ce que l'utilisateur a
 * saisi lui-même de ce qui a été importé depuis un autre service.
 */
export type SourceEntree = 'manuel' | 'import_tvtime' | 'import_netflix' | 'import_trakt';

/**
 * Marque un épisode comme vu. Persisté dans la table "episodes_vus".
 * (Le couple utilisateur + episodeId est unique.)
 */
export interface EpisodeVu {
  id: string;
  utilisateurId: string;
  /** Série concernée (id TMDb de la série). */
  serieId: number;
  /** Identifiant TMDb de l'épisode vu. */
  episodeId: number;
  saison: number;
  numero: number;
  /** Note personnelle de l'épisode sur 10, ou null si non noté. */
  note: number | null;
  /** Date à laquelle l'utilisateur a marqué l'épisode comme vu. */
  vuLe: string;
}

/**
 * Ligne issue d'un fichier importé (CSV TV Time ou Netflix), avant
 * résolution vers un titre TMDb. Sert d'étape intermédiaire à l'import.
 */
export interface LigneImport {
  /** Texte brut du titre tel qu'il apparaît dans le fichier. */
  titreBrut: string;
  /** Type déduit si possible (sinon null, on tentera une recherche TMDb). */
  type: TypeMedia | null;
  /** Date associée dans le fichier, si présente. */
  date: string | null;
  /** Origine du fichier. */
  source: Exclude<SourceEntree, 'manuel'>;
}
