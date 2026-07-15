// =============================================================================
//  Tests : logique sociale
// =============================================================================

import {
  Activite,
  autreMembre,
  grouperActivites,
  idPaire,
  libelleActivite,
  pseudoNormalise,
  pseudoValide,
} from './socialCalcul';

const act = (p: Partial<Activite>): Activite => ({
  id: Math.random().toString(),
  auteur: 'u1',
  pseudo: 'Alice',
  type: 'episode',
  tmdbId: 1396,
  serieTitre: 'Breaking Bad',
  cheminAffiche: null,
  quand: '2026-03-15T10:00:00.000Z',
  ...p,
});

describe('idPaire', () => {
  it('donne le même identifiant quel que soit l’ordre', () => {
    // C'est ce qui empêche deux demandes croisées entre les mêmes personnes :
    // Firestore refusera la seconde création, sans qu'aucune règle n'intervienne.
    expect(idPaire('bbb', 'aaa')).toBe(idPaire('aaa', 'bbb'));
  });

  it('trie les identifiants', () => {
    expect(idPaire('zoe', 'alice')).toBe('alice_zoe');
  });

  it('distingue deux paires différentes', () => {
    expect(idPaire('a', 'b')).not.toBe(idPaire('a', 'c'));
  });
});

describe('autreMembre', () => {
  const amitie = {
    id: 'a_b',
    membres: ['a', 'b'],
    demandeur: 'a',
    statut: 'acceptee' as const,
    cree: '',
  };

  it('renvoie l’autre personne', () => {
    expect(autreMembre(amitie, 'a')).toBe('b');
    expect(autreMembre(amitie, 'b')).toBe('a');
  });

  it('renvoie une chaîne vide si l’on n’est pas membre', () => {
    // Sans la vérification d'appartenance, un tiers recevrait le premier membre
    // et croirait à un lien qui n'existe pas.
    expect(autreMembre(amitie, 'c')).toBe('');
  });
});

describe('pseudoValide', () => {
  it('accepte un pseudo courant', () => {
    expect(pseudoValide('Noah').ok).toBe(true);
  });

  it('accepte les accents, chiffres et séparateurs usuels', () => {
    expect(pseudoValide('Amélie_92').ok).toBe(true);
    expect(pseudoValide('jean-luc.p').ok).toBe(true);
  });

  it('refuse en dessous de 3 caractères', () => {
    expect(pseudoValide('ab').ok).toBe(false);
  });

  it('refuse au-delà de 20 caractères — la même borne que les règles serveur', () => {
    expect(pseudoValide('a'.repeat(21)).ok).toBe(false);
  });

  it('refuse les caractères exotiques', () => {
    expect(pseudoValide('bob<script>').ok).toBe(false);
  });

  it('ignore les espaces autour', () => {
    expect(pseudoValide('  Noah  ').ok).toBe(true);
  });
});

describe('pseudoNormalise', () => {
  it('met en minuscules et retire les espaces autour', () => {
    expect(pseudoNormalise('  NoAh ')).toBe('noah');
  });
});

describe('libelleActivite', () => {
  it('décrit un épisode vu', () => {
    expect(libelleActivite(act({ saison: 2, numero: 5 }))).toBe('a regardé S2 E5');
  });

  it('convertit la note sur 10 en note sur 5', () => {
    expect(libelleActivite(act({ type: 'note', note: 9 }))).toBe('a noté 4.5/5');
  });

  it('décrit une série terminée', () => {
    expect(libelleActivite(act({ type: 'termine' }))).toBe('a terminé');
  });
});

describe('grouperActivites', () => {
  it('regroupe les épisodes consécutifs d’une même série', () => {
    // Sans cela, rattraper une saison inonde le fil de vingt lignes identiques.
    const g = grouperActivites([
      act({ saison: 1, numero: 3 }),
      act({ saison: 1, numero: 2 }),
      act({ saison: 1, numero: 1 }),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].combien).toBe(3);
    expect(g[0].tete.numero).toBe(3);
  });

  it('ne regroupe pas deux séries différentes', () => {
    const g = grouperActivites([act({ tmdbId: 1 }), act({ tmdbId: 2 })]);
    expect(g).toHaveLength(2);
  });

  it('ne regroupe pas deux personnes différentes', () => {
    const g = grouperActivites([act({ auteur: 'u1' }), act({ auteur: 'u2' })]);
    expect(g).toHaveLength(2);
  });

  it('ne regroupe que les entrées ADJACENTES : le fil garde son ordre', () => {
    const g = grouperActivites([act({ tmdbId: 1 }), act({ tmdbId: 2 }), act({ tmdbId: 1 })]);
    expect(g).toHaveLength(3);
  });

  it('ne regroupe pas une note avec des épisodes', () => {
    const g = grouperActivites([act({ type: 'note', note: 8 }), act({ type: 'episode' })]);
    expect(g).toHaveLength(2);
  });

  it('gère un fil vide', () => {
    expect(grouperActivites([])).toEqual([]);
  });
});
