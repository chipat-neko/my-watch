// =============================================================================
//  Cache (mémoire + disque)
//  ---------------------------------------------------------------------------
//  L'application relisait TOUT à chaque affichage : l'Accueil chargeait la
//  bibliothèque deux fois (une pour lui, une pour l'agenda), lisait l'intégralité
//  des épisodes vus, puis interrogeait TMDb une fois par série suivie. Ma liste
//  et le Profil faisaient de même. Avec 50 séries, une simple navigation entre
//  trois écrans coûtait des centaines de lectures et une centaine d'appels
//  réseau — d'où le quota qui fond et l'impression de lenteur.
//
//  Deux niveaux :
//   - MÉMOIRE : instantané, perdu à la fermeture. Sert aux allers-retours entre
//     écrans, qui sont l'essentiel du gaspillage.
//   - DISQUE (AsyncStorage) : survit au redémarrage. Réservé aux données
//     coûteuses ET stables — les détails TMDb.
//
//  La politique de péremption vit dans `cacheCalcul.ts` (pure, testée).
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DUREES, EntreeCache, estValide } from '@/services/cacheCalcul';

export { DUREES };

/** Cache mémoire du processus. */
const memoire = new Map<string, EntreeCache<unknown>>();

/** Préfixe des clés sur disque, pour ne jamais heurter les autres réglages. */
const PREFIXE = 'cache:';

/**
 * Renvoie la valeur en cache, ou la calcule.
 *
 * @param cle        Identifiant de la donnée.
 * @param duree      Durée de vie.
 * @param calculer   Comment obtenir la valeur si elle manque.
 * @param surDisque  Persister au-delà du redémarrage.
 */
export async function enCache<T>(
  cle: string,
  duree: number,
  calculer: () => Promise<T>,
  surDisque = false
): Promise<T> {
  const maintenant = Date.now();

  const enMemoire = memoire.get(cle) as EntreeCache<T> | undefined;
  if (estValide(enMemoire ?? null, duree, maintenant)) return enMemoire!.valeur;

  if (surDisque) {
    try {
      const brut = await AsyncStorage.getItem(PREFIXE + cle);
      if (brut) {
        const entree = JSON.parse(brut) as EntreeCache<T>;
        if (estValide(entree, duree, maintenant)) {
          // Remonte en mémoire : les lectures suivantes seront immédiates.
          memoire.set(cle, entree);
          return entree.valeur;
        }
      }
    } catch {
      // Cache illisible (format changé, stockage plein) : on recalcule. Un cache
      // ne doit JAMAIS être une cause de panne.
    }
  }

  const valeur = await calculer();
  const entree: EntreeCache<T> = { valeur, depose: maintenant };
  memoire.set(cle, entree);

  if (surDisque) {
    // Sans `await` : la persistance ne doit pas retarder l'affichage.
    AsyncStorage.setItem(PREFIXE + cle, JSON.stringify(entree)).catch(() => {});
  }
  return valeur;
}

/** Oublie une entrée précise (après une écriture). */
export function invalider(cle: string): void {
  memoire.delete(cle);
  AsyncStorage.removeItem(PREFIXE + cle).catch(() => {});
}

/**
 * Oublie toutes les entrées dont la clé commence par `prefixe`.
 *
 * Ne touche QUE la mémoire : les données sur disque sont les détails TMDb, que
 * rien de ce que fait l'utilisateur ne périme.
 */
export function invaliderPrefixe(prefixe: string): void {
  for (const cle of [...memoire.keys()]) {
    if (cle.startsWith(prefixe)) memoire.delete(cle);
  }
}

/** Vide tout (déconnexion : les données du compte suivant ne sont pas les nôtres). */
export async function viderCache(): Promise<void> {
  memoire.clear();
  try {
    const cles = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(cles.filter((c) => c.startsWith(PREFIXE)));
  } catch {
    // Rien à faire : le cache mémoire est vidé, c'est le principal.
  }
}
