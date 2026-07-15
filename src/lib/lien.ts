// =============================================================================
//  Ouverture d'un lien externe (natif)
//  ---------------------------------------------------------------------------
//  Sur mobile, le lien part dans le navigateur du système : l'application reste
//  en arrière-plan et on y revient d'un geste. Rien à faire de particulier.
//
//  La variante web (`lien.web.ts`) doit, elle, forcer un nouvel onglet.
// =============================================================================

import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';

/** Ouvre un lien à l'extérieur de l'application. */
export async function ouvrirLien(url: string): Promise<void> {
  await Linking.openURL(url);
}

/**
 * Copie un texte dans le presse-papier.
 *
 * @returns false si la copie a échoué — l'appelant doit alors laisser le texte
 *          visible et recopiable, plutôt que d'annoncer une copie qui n'a pas eu
 *          lieu.
 */
export async function copierTexte(texte: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(texte);
    return true;
  } catch {
    return false;
  }
}
