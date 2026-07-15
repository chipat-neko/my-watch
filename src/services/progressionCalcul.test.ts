// =============================================================================
//  Tests : fusion des avancements de séries
//  ---------------------------------------------------------------------------
//  `fusionnerAvancees` croise deux sources qui ne sont d'accord sur rien : les
//  épisodes vus (Firestore, alimenté aussi par des imports) et la structure de
//  la série (TMDb). Les cas limites ci-dessous sont tous réalistes.
// =============================================================================

import { avanceeApresMarquage, fusionnerAvancees, InfosSerie } from './progressionCalcul';
import { PositionEpisode } from './prochainAVoir';

const pos = (...couples: [number, number][]): PositionEpisode[] =>
  couples.map(([saison, numero]) => ({ saison, numero }));

const infos = (nombreEpisodes: number, ...saisons: [number, number][]): InfosSerie => ({
  nombreEpisodes,
  saisons: saisons.map(([numero, nbEpisodes]) => ({ numero, nbEpisodes })),
  cheminFond: '/fond.jpg',
});

describe('fusionnerAvancees', () => {
  it('calcule vus/total et le prochain épisode', () => {
    const a = fusionnerAvancees(
      new Map([[1396, pos([1, 1], [1, 2])]]),
      new Map([[1396, infos(62, [1, 7], [2, 13])]])
    );
    expect(a.get(1396)).toMatchObject({ vus: 2, total: 62, prochain: { saison: 1, numero: 3 } });
  });

  it('renvoie 0 vus et le premier épisode pour une série jamais commencée', () => {
    const a = fusionnerAvancees(new Map(), new Map([[1396, infos(62, [1, 7])]]));
    expect(a.get(1396)).toMatchObject({ vus: 0, total: 62, prochain: { saison: 1, numero: 1 } });
  });

  it('signale une série à jour par un prochain épisode nul', () => {
    const a = fusionnerAvancees(
      new Map([[1396, pos([1, 1], [1, 2])]]),
      new Map([[1396, infos(2, [1, 2])]])
    );
    expect(a.get(1396)).toMatchObject({ vus: 2, total: 2, prochain: null });
  });

  it('dédoublonne les positions vues (un import peut livrer deux fois le même épisode)', () => {
    const a = fusionnerAvancees(
      new Map([[1396, pos([1, 1], [1, 1], [1, 2])]]),
      new Map([[1396, infos(10, [1, 10])]])
    );
    // Compter les documents plutôt que les positions distinctes ferait avancer
    // la barre sans qu'aucun épisode nouveau n'ait été vu.
    expect(a.get(1396)?.vus).toBe(2);
  });

  it('borne les épisodes vus au total : un import peut compter des spéciaux absents de TMDb', () => {
    const a = fusionnerAvancees(
      new Map([[1396, pos([1, 1], [1, 2], [0, 1])]]),
      new Map([[1396, infos(2, [1, 2])]])
    );
    // Sans la borne, la barre de progression déborderait de son conteneur.
    expect(a.get(1396)?.vus).toBe(2);
  });

  it('ignore une série sans épisode diffusé (éviterait une division par zéro)', () => {
    const a = fusionnerAvancees(new Map(), new Map([[999, infos(0)]]));
    expect(a.has(999)).toBe(false);
  });

  it('ignore une série dont la structure est inconnue (appel TMDb en échec)', () => {
    const a = fusionnerAvancees(new Map([[1396, pos([1, 1])]]), new Map());
    expect(a.size).toBe(0);
  });

  it('traite plusieurs séries indépendamment', () => {
    const a = fusionnerAvancees(
      new Map([
        [1396, pos([1, 1])],
        [1399, pos([1, 1], [1, 2], [1, 3])],
      ]),
      new Map([
        [1396, infos(62, [1, 7])],
        [1399, infos(73, [1, 10])],
      ])
    );
    expect(a.get(1396)?.prochain).toEqual({ saison: 1, numero: 2 });
    expect(a.get(1399)?.prochain).toEqual({ saison: 1, numero: 4 });
  });
});

describe('avanceeApresMarquage', () => {
  const depart = () =>
    fusionnerAvancees(
      new Map([[1396, pos([1, 1])]]),
      new Map([[1396, infos(4, [1, 2], [2, 2])]])
    ).get(1396)!;

  it('avance le compteur et désigne l’épisode suivant, sans réseau', () => {
    const apres = avanceeApresMarquage(depart(), { saison: 1, numero: 2 });
    expect(apres.vus).toBe(2);
    expect(apres.prochain).toEqual({ saison: 2, numero: 1 });
  });

  it('passe la série « à jour » quand le dernier épisode est marqué', () => {
    let a = depart();
    for (const p of [
      { saison: 1, numero: 2 },
      { saison: 2, numero: 1 },
      { saison: 2, numero: 2 },
    ]) {
      a = avanceeApresMarquage(a, p);
    }
    expect(a.vus).toBe(4);
    expect(a.prochain).toBeNull();
  });

  it('est idempotent : re-marquer un épisode déjà vu ne fait pas avancer la barre', () => {
    const apres = avanceeApresMarquage(depart(), { saison: 1, numero: 1 });
    expect(apres.vus).toBe(1);
    expect(apres.prochain).toEqual({ saison: 1, numero: 2 });
  });

  it('ne modifie pas l’avancée d’origine (la restauration après échec doit être fiable)', () => {
    const avant = depart();
    avanceeApresMarquage(avant, { saison: 1, numero: 2 });
    // L'écran conserve `avant` pour revenir en arrière si l'écriture échoue :
    // une mutation en place rendrait cette restauration impossible.
    expect(avant.vus).toBe(1);
    expect(avant.prochain).toEqual({ saison: 1, numero: 2 });
  });
});
