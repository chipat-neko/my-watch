// =============================================================================
//  Tests : pagination du défilement infini
// =============================================================================

import { encoreDesPages, fusionnerPage } from './pagination';
import { Titre } from '@/types';

const titre = (id: number, type: 'film' | 'serie' = 'serie'): Titre => ({
  id,
  type,
  titre: `Titre ${id}`,
  titreOriginal: `Titre ${id}`,
  synopsis: '',
  cheminAffiche: null,
  cheminFond: null,
  note: 0,
  dateSortie: null,
  genres: [],
});

const page = (n: number) => Array.from({ length: 20 }, (_, i) => titre(n * 100 + i));

describe('fusionnerPage', () => {
  it('ajoute les nouveaux titres à la suite', () => {
    const r = fusionnerPage([titre(1)], [titre(2), titre(3)]);
    expect(r.map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('écarte les doublons : TMDb reordonne ses resultats entre deux requêtes', () => {
    // Cas réel : un titre de la page 1 remonte en page 2. Sans ce filtre, la
    // même affiche apparaît deux fois et React signale une clé dupliquée.
    const r = fusionnerPage([titre(1), titre(2)], [titre(2), titre(3)]);
    expect(r.map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('distingue un film et une série de même identifiant', () => {
    const r = fusionnerPage([titre(42, 'film')], [titre(42, 'serie')]);
    expect(r).toHaveLength(2);
  });

  it('dédoublonne aussi à l’intérieur de la page reçue', () => {
    const r = fusionnerPage([], [titre(1), titre(1), titre(2)]);
    expect(r.map((t) => t.id)).toEqual([1, 2]);
  });

  it('renvoie la liste d’origine (même référence) si rien de neuf : évite un rendu inutile', () => {
    const courants = [titre(1)];
    expect(fusionnerPage(courants, [titre(1)])).toBe(courants);
  });

  it('gère une liste de départ vide', () => {
    expect(fusionnerPage([], [titre(1)])).toHaveLength(1);
  });
});

describe('encoreDesPages', () => {
  it('continue tant que les pages sont pleines', () => {
    expect(encoreDesPages(page(1), 1)).toBe(true);
  });

  it('s’arrête sur une page vide : sinon la liste appelle sans fin', () => {
    expect(encoreDesPages([], 5)).toBe(false);
  });

  it('s’arrête sur une page incomplète : c’est la fin du catalogue', () => {
    expect(encoreDesPages([titre(1), titre(2)], 5)).toBe(false);
  });

  it('respecte le plafond de 500 pages de TMDb', () => {
    expect(encoreDesPages(page(1), 500)).toBe(false);
    expect(encoreDesPages(page(1), 499)).toBe(true);
  });
});
