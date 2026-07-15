// =============================================================================
//  Partage (web)
//  ---------------------------------------------------------------------------
//  `Share` de React Native n'existe pas sur le web. On utilise l'API de partage
//  du navigateur quand elle est là (mobile, Safari), et on retombe sur le
//  presse-papier partout ailleurs — un ordinateur de bureau n'a pas de feuille
//  de partage.
// =============================================================================

export type ResultatPartage = 'partage' | 'copie' | 'annule' | 'echec';

/**
 * Partage un lien vers un titre.
 *
 * Renvoie `copie` quand le lien a fini dans le presse-papier : l'appelant doit
 * le dire, sinon l'utilisateur clique et ne voit rien se passer.
 */
export async function partagerLien(titre: string, url: string): Promise<ResultatPartage> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;

  if (nav?.share) {
    try {
      await nav.share({ title: titre, text: `${titre} — à voir sur My Watch`, url });
      return 'partage';
    } catch (e) {
      // L'utilisateur a fermé la feuille : ce n'est pas une erreur.
      if ((e as Error)?.name === 'AbortError') return 'annule';
      // Sinon on tente quand même le presse-papier plutôt que d'abandonner.
    }
  }

  try {
    // `clipboard` exige un contexte sécurisé (HTTPS ou localhost) : en HTTP
    // simple, il est absent, d'où la vérification.
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      return 'copie';
    }
  } catch {
    // Permission refusée.
  }
  return 'echec';
}
