// =============================================================================
//  Ouverture d'un lien externe (web)
//  ---------------------------------------------------------------------------
//  `Linking.openURL` de React Native remplace la PAGE COURANTE sur le web. Pour
//  la connexion Trakt, c'était rédhibitoire : la page qui affiche le code
//  d'appairage disparaissait à l'instant même où il fallait le lire.
//
//  On ouvre donc un nouvel onglet.
// =============================================================================

/**
 * Ouvre un lien dans un NOUVEL onglet.
 *
 * ⚠️ À n'appeler que depuis un geste de l'utilisateur (un `onPress` direct). Les
 * navigateurs bloquent `window.open` dès qu'il suit une opération asynchrone :
 * la fenêtre est alors silencieusement refusée. C'est pourquoi l'écran Trakt
 * affiche un BOUTON plutôt que d'ouvrir Trakt tout seul après avoir demandé le
 * code — l'appel serait arrivé trop tard.
 *
 * `noopener` : sans lui, la page ouverte pourrait manipuler la nôtre via
 * `window.opener`.
 */
export async function ouvrirLien(url: string): Promise<void> {
  const fenetre = window.open(url, '_blank', 'noopener,noreferrer');
  // Fenêtre refusée (bloqueur) : on ne remplace SURTOUT pas la page courante,
  // ce serait reproduire le défaut que l'on corrige. L'appelant affiche déjà
  // l'adresse en clair, elle reste recopiable à la main.
  if (!fenetre) throw new Error('Le navigateur a bloqué l’ouverture de l’onglet.');
}

/**
 * Copie un texte dans le presse-papier.
 *
 * `navigator.clipboard` exige un contexte sécurisé (HTTPS ou localhost) : en
 * HTTP simple il est absent, d'où la vérification plutôt qu'un appel direct.
 *
 * @returns false si la copie a échoué — l'appelant doit alors laisser le texte
 *          visible et recopiable, plutôt que d'annoncer une copie fantôme.
 */
export async function copierTexte(texte: string): Promise<boolean> {
  try {
    if (!navigator?.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
