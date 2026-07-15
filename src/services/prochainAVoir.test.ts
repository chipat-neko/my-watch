// =============================================================================
//  Tests : prochain épisode à regarder, marquage par lot
//  ---------------------------------------------------------------------------
//  Cette logique décide de ce que l'utilisateur va regarder : elle doit tenir
//  face aux données réelles, qui sont désordonnées (imports en vrac, épisodes
//  sautés, saisons partielles).
// =============================================================================

import { cle, prochainAVoir } from './prochainAVoir';

const S = (numero: number, nbEpisodes: number) => ({ numero, nbEpisodes });
const vusDe = (...positions: [number, number][]) => new Set(positions.map(([s, n]) => cle(s, n)));

describe('prochainAVoir', () => {
  it('renvoie le tout premier épisode quand rien n’est vu', () => {
    expect(prochainAVoir([S(1, 10), S(2, 8)], new Set())).toEqual({ saison: 1, numero: 1 });
  });

  it('renvoie l’épisode suivant le dernier vu', () => {
    const vus = vusDe([1, 1], [1, 2], [1, 3]);
    expect(prochainAVoir([S(1, 10)], vus)).toEqual({ saison: 1, numero: 4 });
  });

  it('enjambe la fin d’une saison vers la suivante', () => {
    const vus = vusDe([1, 1], [1, 2]);
    expect(prochainAVoir([S(1, 2), S(2, 6)], vus)).toEqual({ saison: 2, numero: 1 });
  });

  it('ramène au premier TROU plutôt qu’à la suite du dernier vu', () => {
    // Cas réel : un épisode saute (ou un import arrive en vrac). Envoyer la
    // personne à la fin de la série serait pire que de ne rien afficher.
    const vus = vusDe([1, 1], [1, 3], [1, 4]);
    expect(prochainAVoir([S(1, 5)], vus)).toEqual({ saison: 1, numero: 2 });
  });

  it('renvoie null quand toute la série est vue', () => {
    const vus = vusDe([1, 1], [1, 2], [2, 1]);
    expect(prochainAVoir([S(1, 2), S(2, 1)], vus)).toBeNull();
  });

  it('trie les saisons : l’ordre de TMDb n’est pas garanti', () => {
    const vus = vusDe([1, 1]);
    expect(prochainAVoir([S(2, 5), S(1, 3)], vus)).toEqual({ saison: 1, numero: 2 });
  });

  it('ignore une saison vide sans planter', () => {
    expect(prochainAVoir([S(1, 0), S(2, 3)], new Set())).toEqual({ saison: 2, numero: 1 });
  });

  it('renvoie null si la série n’a aucune saison connue', () => {
    expect(prochainAVoir([], new Set())).toBeNull();
  });
});
