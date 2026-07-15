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
  /** Surface élevée : carte survolée, champ focus, popover. */
  surface3: '#1B2630',
  /** Surface la plus élevée : feuille, modale. */
  surface4: '#202C36',
  /**
   * Liseré supérieur clair. EN MODE SOMBRE, L'ÉLÉVATION NE VIENT PAS DES OMBRES
   * (une ombre noire sur un fond noir est invisible) MAIS DE LA LUMIÈRE : une
   * bordure haute claire simule une source lumineuse zénithale et « pose » la
   * surface. C'est le détail le moins cher et le plus visible du thème.
   */
  lisere: 'rgba(255,255,255,0.06)',
  /** Liseré d'une surface élevée (plus proche de la lumière). */
  lisereHaut: 'rgba(255,255,255,0.10)',
  /** Piste d'une barre de progression. */
  piste: '#22303A',
  /** Texte principal. */
  texte: '#FFFFFF',
  /** Texte de corps. */
  texteCorps: '#D3DDE3',
  /** Texte secondaire / atténué. */
  texteDoux: '#7C909C',
  /** Texte faible (méta de 3ᵉ rang, placeholders). */
  texteFaible: '#5F7280',
  /** Onglet inactif (barre de navigation). */
  ongletInactif: '#8AA0AD',
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
  /** Accent bleu (statistiques). */
  statBleu: '#7AA2FF',
  /** Accent or (statistiques). */
  statOr: '#FFB454',
} as const;

/**
 * Fondus vers le fond de page.
 *
 * DEUX RÈGLES, apprises à la dure :
 *  1. NE JAMAIS fondre vers `#000` : sur `#0B0E11`, le noir pur crée une couture
 *     grise visible. On fond vers `rgba(11,14,17,α)`, la teinte du fond.
 *  2. JAMAIS 2 stops : un fondu alpha linéaire se lit comme une bande. Minimum
 *     4-5 stops en courbe.
 */
export const fondus = {
  /** Voile vertical d'un backdrop vers le fond (bas de l'image). */
  versBas: [
    'rgba(11,14,17,0)',
    'rgba(11,14,17,0.35)',
    'rgba(11,14,17,0.75)',
    'rgba(11,14,17,0.94)',
    '#0B0E11',
  ] as const,
  positionsVersBas: [0, 0.42, 0.68, 0.86, 1] as const,
  /** Voile horizontal (assied le texte du hero à gauche, garde l'image vive à droite). */
  versDroite: ['rgba(11,14,17,0.88)', 'rgba(11,14,17,0.25)', 'rgba(11,14,17,0)'] as const,
  positionsVersDroite: [0, 0.55, 1] as const,
  /** Scrim de lisibilité sur le tiers bas d'une affiche. */
  affiche: ['rgba(11,14,17,0)', 'rgba(11,14,17,0.55)', 'rgba(11,14,17,0.92)'] as const,
  positionsAffiche: [0, 0.55, 1] as const,
  /** Dégradé de page global : plus jamais d'aplat. */
  page: ['#101822', '#0B0E11'] as const,
  positionsPage: [0, 0.55] as const,
  /** Dégradé « éclairé par le haut » d'une carte. */
  carte: ['#18222B', '#141D24'] as const,
} as const;

/**
 * Conteneurs de largeur. UN SEUL conteneur pour tout est une erreur : 1100 est
 * bon pour du texte et mauvais pour des posters. D'où trois largeurs.
 */
export const conteneurs = {
  /**
   * Texte long : synopsis, formulaires, réglages. ~75 caractères par ligne à
   * 16px, la mesure optimale de lecture. NE JAMAIS élargir : au-delà, l'œil perd
   * la ligne au retour chariot.
   */
  lecture: 720,
  /** Écrans à colonne unique : Calendrier, Profil, Communauté. */
  standard: 1280,
  /** Grilles de posters : Découvrir, Accueil. */
  grille: 1440,
} as const;

/**
 * Largeur maximale du contenu (alias de `conteneurs.grille`).
 *
 * Sur un écran de 1900px, une borne à 1100 laissait 42 % de l'écran vide : ce
 * n'est pas de la respiration, c'est une app mobile scotchée au milieu d'un
 * moniteur. À 1440, la marge de ~230px est une respiration voulue.
 *
 * Le hero et les rails horizontaux, eux, IGNORENT cette borne (full-bleed) :
 * un rail qui s'arrête pile au bord semble fini, un rail qui déborde dit
 * « il y en a plus ».
 */
export const maxLargeur = conteneurs.grille;

/** Largeur de la barre latérale sur grand écran (handoff web : 248). */
export const largeurRail = 248;

/** Seuil de bascule vers la barre latérale (Material Adaptive). */
export const seuilLarge = 1024;

/**
 * Espacements, base 4. Le 14 de l'ancienne échelle cassait la grille, et il n'y
 * avait rien au-dessus de 28 : l'aération desktop était littéralement
 * inexprimable.
 */
export const espacements = {
  xxs: 2,
  xs: 4,
  s: 8,
  sm: 12,
  m: 16,
  ml: 20,
  l: 24,
  xl: 32,
  xxl: 40,
  section: 56,
  hero: 72,
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
 * @expo-google-fonts/manrope).
 *
 * ⚠️ React Native ne mappe PAS `fontWeight` vers une police custom : un
 * `fontWeight: '600'` sans `fontFamily` retombe silencieusement sur la police
 * système (et, sur le web, sur un faux-gras baveux). N'utiliser QUE `fontFamily`.
 */
export const familles = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/**
 * Rupture mobile/desktop de l'échelle typographique.
 *
 * 900 et non 768 : une tablette en portrait se lit à la même distance qu'un
 * téléphone, elle doit garder l'échelle mobile.
 */
export const ruptureDesktop = 900;

export type Densite = 'mobile' | 'desktop';

export const densiteDe = (largeurFenetre: number): Densite =>
  largeurFenetre >= ruptureDesktop ? 'desktop' : 'mobile';

interface StyleTexte {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

type Roles =
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'overline';

/**
 * Échelle typographique responsive.
 *
 * Le corps bouge peu (15→16, +7 %), le sommet bouge beaucoup (28→44, +57 %).
 * C'est ça, une échelle responsive : la distance de lecture passe de ~32 cm sur
 * mobile à ~60 cm sur desktop, donc à taille angulaire égale un titre doit
 * grandir bien plus que le corps. Une interpolation linéaire uniforme est
 * exactement ce qui produit un rendu plat.
 *
 * Le rapport titre d'écran / titre de section est de 1,83 sur desktop : c'est
 * cet écart, plus que n'importe quelle couleur, qui crée le point focal.
 */
const ECHELLE: Record<Densite, Record<Roles, StyleTexte>> = {
  mobile: {
    display: { fontFamily: familles.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
    h1: { fontFamily: familles.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
    h2: { fontFamily: familles.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.4 },
    h3: { fontFamily: familles.semibold, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
    body: { fontFamily: familles.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
    bodyStrong: { fontFamily: familles.medium, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
    label: { fontFamily: familles.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
    caption: { fontFamily: familles.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
    overline: { fontFamily: familles.extrabold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  },
  desktop: {
    display: { fontFamily: familles.extrabold, fontSize: 56, lineHeight: 58, letterSpacing: -1.8 },
    h1: { fontFamily: familles.extrabold, fontSize: 44, lineHeight: 48, letterSpacing: -1.4 },
    h2: { fontFamily: familles.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.6 },
    h3: { fontFamily: familles.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
    body: { fontFamily: familles.regular, fontSize: 16, lineHeight: 26, letterSpacing: 0 },
    bodyStrong: { fontFamily: familles.medium, fontSize: 16, lineHeight: 26, letterSpacing: 0 },
    label: { fontFamily: familles.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.2 },
    caption: { fontFamily: familles.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
    overline: { fontFamily: familles.extrabold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4 },
  },
};

/** Styles de texte pour une densité donnée : `typo(d).h1`. */
export const typo = (d: Densite) => ECHELLE[d];

/**
 * Padding latéral d'écran, selon la largeur de fenêtre.
 * Mobile 20 · desktop 40 · très grand écran 64.
 */
export function paddingEcran(largeurFenetre: number): number {
  if (largeurFenetre < ruptureDesktop) return espacements.ml;
  return largeurFenetre >= 1600 ? 64 : espacements.xxl;
}

/** Tailles de police (déprécié : préférer `typo(densite)`). */
export const polices = {
  petite: 12,
  normale: 14,
  moyenne: 16,
  titre: 18,
  grandTitre: 26,
} as const;
