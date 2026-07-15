// =============================================================================
//  Thème visuel de My Watch — tokens du handoff "TV Time"
//  ---------------------------------------------------------------------------
//  Palette sombre PARTAGÉE par les 3 variantes (classic / grid / social).
//  La couleur d'ACCENT (turquoise / bleu / rose) n'est PAS ici : elle est
//  fournie dynamiquement par `useVariante().accent` selon le choix utilisateur.
// =============================================================================

/** Palette de couleurs (communes aux 3 variantes). */
export const couleurs = {
  /** Fond de page (le plus sombre). */
  page: '#0B0E11',
  /** Fond des écrans. */
  fond: '#0E1318',
  /** Surface des cartes. */
  surface: '#141D24',
  /** Bordure des cartes. */
  bordure: '#1E2A33',
  /** Surface secondaire (puces, champs de saisie). */
  surface2: '#18222B',
  /** Bordure secondaire. */
  bordure2: '#24313B',
  /** Piste d'une barre de progression. */
  piste: '#22303A',
  /** Texte principal. */
  texte: '#FFFFFF',
  /** Texte de corps. */
  texteCorps: '#D3DDE3',
  /** Texte secondaire / atténué. */
  texteDoux: '#7C909C',
  /** Texte faible. */
  texteFaible: '#5F7280',
  /** Onglet inactif (barre de navigation). */
  ongletInactif: '#5B6D78',
  /** Couleur des étoiles notées. */
  note: '#FFCF40',
  /** Étoile vide. */
  etoileVide: '#3A4A54',
  /** Succès / épisode vu (turquoise). */
  succes: '#34E0C4',
  /** Accent par défaut (classic) — pour le dynamique, préférer useVariante().accent. */
  accent: '#34E0C4',
  /** Accent rose (repris pour certains éléments "coup de cœur"). */
  accentRose: '#FF5D7D',
} as const;

/**
 * Largeur maximale du contenu. Sans elle, sur web/tablette le contenu s'étire
 * sur toute la largeur de l'écran (colonnes projetées aux extrémités). Sur
 * mobile (< 1100px) cette limite n'a aucun effet.
 */
export const maxLargeur = 1100;

/** Espacements standard (padding écran 20, gaps 10-14). */
export const espacements = {
  xs: 4,
  s: 8,
  m: 14,
  l: 20,
  xl: 28,
} as const;

/** Rayons d'arrondi (cartes 14-18, hero 24, pills 999). */
export const rayons = {
  s: 10,
  m: 14,
  l: 18,
  hero: 24,
  rond: 999,
} as const;

/**
 * Familles de police Manrope (chargées dans app/_layout.tsx via
 * @expo-google-fonts/manrope). React Native ne mappe pas automatiquement
 * `fontWeight` vers une police custom : on choisit explicitement la famille.
 */
export const familles = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/** Tailles de police. */
export const polices = {
  petite: 12,
  normale: 14,
  moyenne: 16,
  titre: 18,
  grandTitre: 26,
} as const;
