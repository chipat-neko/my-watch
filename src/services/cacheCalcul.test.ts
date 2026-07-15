// =============================================================================
//  Tests : politique de péremption du cache
//  ---------------------------------------------------------------------------
//  Un cache mal réglé est pire que pas de cache : il montre un état qui n'existe
//  plus. Ces tests verrouillent les bornes.
// =============================================================================

import { DUREES, estValide } from './cacheCalcul';

const entree = (depose: number) => ({ valeur: 'x', depose });

describe('estValide', () => {
  const T = 1_000_000;

  it('accepte une entrée fraîche', () => {
    expect(estValide(entree(T), 1000, T + 500)).toBe(true);
  });

  it('accepte une entrée déposée à l’instant', () => {
    expect(estValide(entree(T), 1000, T)).toBe(true);
  });

  it('refuse une entrée périmée', () => {
    expect(estValide(entree(T), 1000, T + 1001)).toBe(false);
  });

  it('refuse pile à l’échéance : mieux vaut relire une fois de trop', () => {
    expect(estValide(entree(T), 1000, T + 1000)).toBe(false);
  });

  it('refuse une entrée absente', () => {
    expect(estValide(null, 1000, T)).toBe(false);
  });

  it('refuse une entrée « déposée dans le futur »', () => {
    // Arrive quand l'horloge recule (fuseau, synchronisation réseau). Sans cette
    // garde, l'entrée resterait valable pour toujours.
    expect(estValide(entree(T + 5000), 1000, T)).toBe(false);
  });
});

describe('DUREES', () => {
  it('garde les détails TMDb 24 h : une série ne gagne pas une saison dans la journée', () => {
    expect(DUREES.detailsTmdb).toBe(86_400_000);
  });

  it('garde la bibliothèque 30 s : assez pour une navigation, trop peu pour masquer une modification', () => {
    expect(DUREES.bibliotheque).toBe(30_000);
  });

  it('garde les données du compte bien moins longtemps que celles de TMDb', () => {
    // Les unes changent à chaque geste, les autres presque jamais.
    expect(DUREES.bibliotheque).toBeLessThan(DUREES.detailsTmdb);
  });
});
