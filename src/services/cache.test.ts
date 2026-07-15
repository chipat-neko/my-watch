// =============================================================================
//  Tests : le cache évite-t-il RÉELLEMENT les appels ?
//  ---------------------------------------------------------------------------
//  Un cache dont on ne mesure pas l'effet n'est qu'une intention. Ces tests
//  comptent les appels à la fonction de calcul : c'est exactement ce que
//  l'application économise en lectures Firestore et en requêtes TMDb.
// =============================================================================

import { enCache, invalider, invaliderPrefixe, viderCache } from './cache';

// AsyncStorage n'existe pas dans l'environnement de test : un faux suffit, la
// persistance disque n'est pas ce que l'on vérifie ici.
jest.mock('@react-native-async-storage/async-storage', () => {
  const donnees = new Map<string, string>();
  return {
    getItem: jest.fn(async (c: string) => donnees.get(c) ?? null),
    setItem: jest.fn(async (c: string, v: string) => void donnees.set(c, v)),
    removeItem: jest.fn(async (c: string) => void donnees.delete(c)),
    getAllKeys: jest.fn(async () => [...donnees.keys()]),
    multiRemove: jest.fn(async (cles: string[]) => cles.forEach((c) => donnees.delete(c))),
  };
});

beforeEach(async () => {
  await viderCache();
});

describe('enCache', () => {
  it('n’appelle la source QU’UNE FOIS pour plusieurs lectures', async () => {
    // C'est tout l'enjeu : l'Accueil, Ma liste et le Profil demandaient chacun
    // la même bibliothèque, et chaque demande coûtait une lecture par document.
    const source = jest.fn(async () => 'valeur');

    expect(await enCache('k', 1000, source)).toBe('valeur');
    expect(await enCache('k', 1000, source)).toBe('valeur');
    expect(await enCache('k', 1000, source)).toBe('valeur');

    expect(source).toHaveBeenCalledTimes(1);
  });

  it('rappelle la source une fois la durée écoulée', async () => {
    const source = jest.fn(async () => 'valeur');
    await enCache('k', 1, source);
    // Laisse le temps passer au-delà de la durée de vie.
    await new Promise((r) => setTimeout(r, 5));
    await enCache('k', 1, source);
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('sépare les clés : deux données ne se mélangent pas', async () => {
    const a = jest.fn(async () => 'a');
    const b = jest.fn(async () => 'b');
    expect(await enCache('a', 1000, a)).toBe('a');
    expect(await enCache('b', 1000, b)).toBe('b');
    expect(await enCache('a', 1000, a)).toBe('a');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('recalcule plutôt que d’échouer si le cache disque est illisible', async () => {
    const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValueOnce('{ ceci n’est pas du JSON');

    // Un cache ne doit JAMAIS être une cause de panne.
    const source = jest.fn(async () => 'valeur');
    expect(await enCache('abime', 1000, source, true)).toBe('valeur');
    expect(source).toHaveBeenCalledTimes(1);
  });

  it('persiste sur disque quand on le demande', async () => {
    const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');
    await enCache('tmdb:details:serie:1396', 1000, async () => ({ nom: 'Breaking Bad' }), true);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

describe('invalider', () => {
  it('force la relecture après une écriture', async () => {
    // Un cache que l'on ne purge pas est pire que pas de cache : il montre un
    // état qui n'existe plus.
    const source = jest.fn(async () => 'valeur');
    await enCache('k', 10_000, source);
    invalider('k');
    await enCache('k', 10_000, source);
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('ne touche pas les autres clés', async () => {
    const a = jest.fn(async () => 'a');
    const b = jest.fn(async () => 'b');
    await enCache('a', 10_000, a);
    await enCache('b', 10_000, b);
    invalider('a');
    await enCache('a', 10_000, a);
    await enCache('b', 10_000, b);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
  });
});

describe('invaliderPrefixe', () => {
  it('purge toutes les clés d’un même préfixe', async () => {
    const a = jest.fn(async () => 'a');
    const b = jest.fn(async () => 'b');
    const autre = jest.fn(async () => 'x');
    await enCache('biblio:u1', 10_000, a);
    await enCache('biblio:u2', 10_000, b);
    await enCache('tmdb:1', 10_000, autre);

    invaliderPrefixe('biblio:');

    await enCache('biblio:u1', 10_000, a);
    await enCache('tmdb:1', 10_000, autre);
    expect(a).toHaveBeenCalledTimes(2);
    expect(autre).toHaveBeenCalledTimes(1);
  });
});

describe('viderCache', () => {
  it('oublie tout : les données du compte suivant ne sont pas les nôtres', async () => {
    const source = jest.fn(async () => 'valeur');
    await enCache('biblio:u1', 10_000, source);
    await viderCache();
    await enCache('biblio:u1', 10_000, source);
    expect(source).toHaveBeenCalledTimes(2);
  });
});
