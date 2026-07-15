// =============================================================================
//  Tests : temps passé à regarder
// =============================================================================

import { equivalence, formaterDuree, minutesTotales } from './tempsCalcul';

describe('minutesTotales', () => {
  it('multiplie la durée par le nombre d’unités vues', () => {
    expect(minutesTotales([{ duree: 42, unitesVues: 10 }])).toBe(420);
  });

  it('additionne films et séries', () => {
    expect(
      minutesTotales([
        { duree: 120, unitesVues: 1 }, // un film
        { duree: 22, unitesVues: 5 }, // cinq épisodes courts
      ])
    ).toBe(230);
  });

  it('ignore un titre non commencé', () => {
    expect(minutesTotales([{ duree: 42, unitesVues: 0 }])).toBe(0);
  });

  it('ignore une durée inconnue plutôt que de compter zéro minute', () => {
    expect(minutesTotales([{ duree: 0, unitesVues: 10 }])).toBe(0);
  });

  it('vaut zéro sur une bibliothèque vide', () => {
    expect(minutesTotales([])).toBe(0);
  });
});

describe('formaterDuree', () => {
  it('reste en minutes sous une heure', () => {
    expect(formaterDuree(45)).toEqual({ valeur: '45', unite: 'min' });
  });

  it('passe en heures avec une décimale', () => {
    expect(formaterDuree(90)).toEqual({ valeur: '1.5', unite: 'h' });
  });

  it('abandonne la décimale au-delà d’une journée : la demi-heure n’informe plus', () => {
    // 50 h pile.
    expect(formaterDuree(3000)).toEqual({ valeur: '50', unite: 'h' });
  });

  it('passe en jours au-delà de trois jours', () => {
    // 5 jours pile.
    expect(formaterDuree(7200)).toEqual({ valeur: '5', unite: 'jours' });
  });

  it('reste en heures jusqu’à trois jours : « 71 h » parle plus que « 2,9 jours »', () => {
    expect(formaterDuree(60 * 71)).toEqual({ valeur: '71', unite: 'h' });
  });

  it('gère zéro sans afficher NaN', () => {
    expect(formaterDuree(0)).toEqual({ valeur: '0', unite: 'min' });
  });
});

describe('equivalence', () => {
  it('encourage quand le total est négligeable', () => {
    expect(equivalence(30)).toContain('commences');
  });

  it('parle en heures sous une journée', () => {
    expect(equivalence(600)).toContain('10 h');
  });

  it('accorde le pluriel des jours', () => {
    expect(equivalence(60 * 24)).toContain('1 jour complet');
    expect(equivalence(60 * 48)).toContain('2 jours complets');
  });
});
