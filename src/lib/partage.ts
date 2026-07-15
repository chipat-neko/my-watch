// =============================================================================
//  Partage (natif)
//  ---------------------------------------------------------------------------
//  Ouvre la feuille de partage du système. Une variante web existe dans
//  `partage.web.ts` : le navigateur n'a pas de feuille de partage garantie, il
//  faut y retomber sur le presse-papier.
// =============================================================================

import { Share } from 'react-native';

/** Résultat d'un partage, pour que l'appelant sache quoi dire à l'utilisateur. */
export type ResultatPartage = 'partage' | 'copie' | 'annule' | 'echec';

/**
 * Partage un lien vers un titre.
 *
 * @param titre  Nom affiché du titre.
 * @param url    Lien web vers la fiche.
 */
export async function partagerLien(titre: string, url: string): Promise<ResultatPartage> {
  try {
    const r = await Share.share({
      message: `${titre} — à voir sur My Watch\n${url}`,
      // iOS sépare `url` de `message` ; Android ignore `url` et ne lit que
      // `message`, d'où le lien répété dans les deux.
      url,
      title: titre,
    });
    return r.action === Share.dismissedAction ? 'annule' : 'partage';
  } catch {
    return 'echec';
  }
}
