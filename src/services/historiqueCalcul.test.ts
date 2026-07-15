// =============================================================================
//  Tests : journal de visionnage
//  ---------------------------------------------------------------------------
//  Le piège de ce module est le fuseau horaire : `vuLe` est en UTC, l'affichage
//  est local. Les tests ci-dessous vérifient qu'un épisode reste bien rangé au
//  jour où l'utilisateur l'a vu.
// =============================================================================

import { EntreeHistorique, grouperParJour, jourLocal, libelleJour } from './historiqueCalcul';

const vu = (episodeId: number, vuLe: string): EntreeHistorique => ({
  episodeId,
  serieId: 1396,
  saison: 1,
  numero: episodeId,
  vuLe,
  note: null,
});

describe('jourLocal', () => {
  it('renvoie le jour au format AAAA-MM-JJ', () => {
    // Construit la date attendue via l'API pour rester juste quel que soit le
    // fuseau de la machine qui exécute les tests.
    const d = new Date('2026-03-15T12:00:00.000Z');
    const attendu = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(jourLocal('2026-03-15T12:00:00.000Z')).toBe(attendu);
  });

  it('utilise le jour LOCAL et non le jour UTC', () => {
    // Le cœur du piège : selon le fuseau, cet instant tombe le 3 ou le 4. Ce
    // qui compte, c'est qu'on suive la date locale de l'utilisateur.
    const iso = '2026-03-03T23:30:00.000Z';
    const d = new Date(iso);
    expect(jourLocal(iso)).toBe(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  });

  it('renvoie une chaîne vide sur une date invalide', () => {
    expect(jourLocal('pas-une-date')).toBe('');
  });
});

describe('grouperParJour', () => {
  it('regroupe les épisodes vus le même jour', () => {
    const jours = grouperParJour([
      vu(1, '2026-03-15T10:00:00.000Z'),
      vu(2, '2026-03-15T14:00:00.000Z'),
    ]);
    expect(jours).toHaveLength(1);
    expect(jours[0].entrees).toHaveLength(2);
  });

  it('classe les jours du plus récent au plus ancien', () => {
    const jours = grouperParJour([
      vu(1, '2026-03-10T10:00:00.000Z'),
      vu(2, '2026-03-15T10:00:00.000Z'),
      vu(3, '2026-03-12T10:00:00.000Z'),
    ]);
    expect(jours.map((j) => j.entrees[0].episodeId)).toEqual([2, 3, 1]);
  });

  it('classe les épisodes d’une même journée du plus récent au plus ancien', () => {
    const jours = grouperParJour([
      vu(1, '2026-03-15T09:00:00.000Z'),
      vu(2, '2026-03-15T20:00:00.000Z'),
    ]);
    expect(jours[0].entrees.map((e) => e.episodeId)).toEqual([2, 1]);
  });

  it('écarte les dates invalides : un import bancal ne doit pas créer un jour fantôme', () => {
    const jours = grouperParJour([vu(1, 'n’importe quoi'), vu(2, '2026-03-15T10:00:00.000Z')]);
    expect(jours).toHaveLength(1);
    expect(jours[0].entrees[0].episodeId).toBe(2);
  });

  it('renvoie une liste vide pour un historique vide', () => {
    expect(grouperParJour([])).toEqual([]);
  });
});

describe('libelleJour', () => {
  const maintenant = new Date('2026-03-15T12:00:00.000Z');
  const cle = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  it('dit « Aujourd’hui » pour le jour même', () => {
    expect(libelleJour(cle(maintenant), maintenant)).toBe("Aujourd'hui");
  });

  it('dit « Hier » pour la veille', () => {
    const hier = new Date(maintenant);
    hier.setDate(hier.getDate() - 1);
    expect(libelleJour(cle(hier), maintenant)).toBe('Hier');
  });

  it('donne la date complète au-delà', () => {
    const avant = new Date(maintenant);
    avant.setDate(avant.getDate() - 5);
    const libelle = libelleJour(cle(avant), maintenant);
    expect(libelle).toContain('mars');
    expect(libelle).toContain('2026');
  });
});
