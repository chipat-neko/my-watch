// =============================================================================
//  Tests : fusion des avancements de séries
//  ---------------------------------------------------------------------------
//  `fusionnerAvancees` croise deux sources qui ne sont d'accord sur rien : les
//  épisodes vus (Firestore, alimenté aussi par des imports) et le nombre total
//  d'épisodes (TMDb). Les cas limites ci-dessous sont tous réalistes.
// =============================================================================

import { fusionnerAvancees } from './progressionCalcul';

describe('fusionnerAvancees', () => {
  it('calcule vus/total pour une série suivie', () => {
    const avancees = fusionnerAvancees(new Map([[1396, 12]]), new Map([[1396, 62]]));
    expect(avancees.get(1396)).toEqual({ vus: 12, total: 62 });
  });

  it('renvoie 0 vus pour une série dont aucun épisode n’est marqué', () => {
    const avancees = fusionnerAvancees(new Map(), new Map([[1396, 62]]));
    expect(avancees.get(1396)).toEqual({ vus: 0, total: 62 });
  });

  it('borne les épisodes vus au total : un import peut compter des spéciaux absents de TMDb', () => {
    const avancees = fusionnerAvancees(new Map([[1396, 70]]), new Map([[1396, 62]]));
    // Sans la borne, la barre de progression déborderait de son conteneur.
    expect(avancees.get(1396)).toEqual({ vus: 62, total: 62 });
  });

  it('ignore une série sans épisode diffusé (éviterait une division par zéro)', () => {
    const avancees = fusionnerAvancees(new Map([[999, 0]]), new Map([[999, 0]]));
    expect(avancees.has(999)).toBe(false);
  });

  it('ignore une série dont le total est inconnu (appel TMDb en échec)', () => {
    // La série est dans les comptes mais pas dans les totaux : pas de barre.
    const avancees = fusionnerAvancees(new Map([[1396, 12]]), new Map());
    expect(avancees.size).toBe(0);
  });

  it('traite plusieurs séries indépendamment', () => {
    const avancees = fusionnerAvancees(
      new Map([
        [1396, 62],
        [1399, 3],
      ]),
      new Map([
        [1396, 62],
        [1399, 73],
      ])
    );
    expect(avancees.get(1396)).toEqual({ vus: 62, total: 62 });
    expect(avancees.get(1399)).toEqual({ vus: 3, total: 73 });
  });
});
