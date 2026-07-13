// =============================================================================
//  Thème visuel de My Watch
//  ---------------------------------------------------------------------------
//  Palette sombre, moderne et colorée (esprit "application de suivi de séries").
//  Centraliser les couleurs, espacements et rayons ici garantit une interface
//  cohérente et facile à retoucher : on change une valeur, toute l'app suit.
// =============================================================================

/** Palette de couleurs de l'application. */
export const couleurs = {
  /** Fond principal très sombre. */
  fond: '#0E0E1A',
  /** Fond des cartes / surfaces surélevées. */
  surface: '#1A1A2E',
  /** Surface secondaire (ex : champ de recherche). */
  surface2: '#24243B',
  /** Couleur d'accent principale (violet). */
  accent: '#7C5CFC',
  /** Accent secondaire (rose) pour les éléments "coup de cœur". */
  accentRose: '#FF5C8A',
  /** Couleur de succès (épisode vu, action validée). */
  succes: '#33D69F',
  /** Texte principal. */
  texte: '#FFFFFF',
  /** Texte secondaire / atténué. */
  texteDoux: '#9A9AB2',
  /** Bordures discrètes. */
  bordure: '#2E2E48',
  /** Couleur des étoiles / notes. */
  note: '#FFC107',
} as const;

/** Espacements standard (en points) pour marges et paddings. */
export const espacements = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;

/** Rayons d'arrondi. */
export const rayons = {
  s: 8,
  m: 12,
  l: 20,
  rond: 999,
} as const;

/** Tailles de police. */
export const polices = {
  petite: 12,
  normale: 14,
  moyenne: 16,
  titre: 20,
  grandTitre: 28,
} as const;
