// =============================================================================
//  Calcul du « prochain épisode à regarder » (logique pure)
//  ---------------------------------------------------------------------------
//  C'est LA fonction centrale d'une application de suivi : ne pas se demander
//  « où j'en étais ? ». Jusqu'ici, l'accueil affichait « Série · en cours » —
//  ce qui n'apprend rien à personne.
//
//  Aucun appel réseau : le détail TMDb donne déjà le nombre d'épisodes de
//  chaque saison, et la base sait lesquels sont vus. Il suffit de croiser.
// =============================================================================

import { SommaireSaison } from '@/types';

/** Un épisode identifié par sa position dans la série. */
export interface PositionEpisode {
  saison: number;
  numero: number;
}

/**
 * Premier épisode NON vu, en parcourant les saisons puis les numéros dans
 * l'ordre. Renvoie `null` si tout est vu (la série est à jour).
 *
 * Le parcours est volontairement ordonné et non « le dernier vu + 1 » : si
 * quelqu'un a sauté un épisode, ou en a coché un au hasard, on le ramène au
 * premier trou plutôt que de l'envoyer au bout de la série. C'est aussi ce qui
 * rend le résultat correct après un import, où les épisodes arrivent en vrac.
 *
 * @param saisons  Sommaire des saisons (déjà purgé des épisodes spéciaux).
 * @param vus      Épisodes vus, sous forme de clés « saison:numero ».
 */
export function prochainAVoir(saisons: SommaireSaison[], vus: Set<string>): PositionEpisode | null {
  // L'ordre de TMDb n'est pas garanti : on trie plutôt que de le supposer.
  const ordonnees = [...saisons].sort((a, b) => a.numero - b.numero);
  for (const saison of ordonnees) {
    for (let numero = 1; numero <= saison.nbEpisodes; numero++) {
      if (!vus.has(cle(saison.numero, numero))) {
        return { saison: saison.numero, numero };
      }
    }
  }
  return null;
}

/** Clé d'un épisode dans l'ensemble des épisodes vus. */
export function cle(saison: number, numero: number): string {
  return `${saison}:${numero}`;
}
