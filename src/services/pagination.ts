// =============================================================================
//  Pagination (logique pure)
//  ---------------------------------------------------------------------------
//  Le défilement infini a deux pièges classiques, tous deux visibles à l'écran :
//
//   1. LES DOUBLONS. TMDb réordonne ses résultats par popularité entre deux
//      requêtes : un titre de la page 1 peut réapparaître page 2. Sans
//      déduplication, la même affiche s'affiche deux fois — et React lève un
//      avertissement de clé dupliquée.
//   2. LA BOUCLE INFINIE. Si l'on continue de demander des pages après la fin
//      du catalogue, la liste appelle sans fin. Une page vide doit arrêter tout.
// =============================================================================

import { Titre } from '@/types';

/** Clé d'unicité d'un titre : l'identifiant TMDb seul ne suffit pas, un film et
 *  une série peuvent le partager. */
export function cleTitre(t: Titre): string {
  return `${t.type}-${t.id}`;
}

/**
 * Ajoute une page à une liste existante, sans jamais dupliquer.
 * L'ordre d'arrivée est conservé : c'est celui que TMDb juge pertinent.
 */
export function fusionnerPage(courants: Titre[], nouveaux: Titre[]): Titre[] {
  const vus = new Set(courants.map(cleTitre));
  const ajouts = nouveaux.filter((t) => {
    const c = cleTitre(t);
    if (vus.has(c)) return false;
    vus.add(c);
    return true;
  });
  return ajouts.length === 0 ? courants : [...courants, ...ajouts];
}

/**
 * Reste-t-il des pages à charger ?
 *
 * TMDb sert 20 résultats par page et plafonne à 500 pages. Une page incomplète
 * signale la fin du catalogue : continuer à demander ne renverrait plus rien.
 */
export function encoreDesPages(pageRecue: Titre[], pageActuelle: number): boolean {
  if (pageRecue.length === 0) return false;
  if (pageRecue.length < 20) return false;
  return pageActuelle < 500;
}
