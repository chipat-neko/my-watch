// =============================================================================
//  Tests unitaires du parsing CSV (logique pure de src/services/csv.ts)
//  ---------------------------------------------------------------------------
//  Ces tests couvrent les cas délicats de l'import d'historique : champs entre
//  guillemets, distinction film/série (titres à « : »), détection de la source
//  et normalisation des dates. Aucune dépendance réseau ou React Native.
// =============================================================================

import {
  analyserLigneCsv,
  extraireTitre,
  analyserCsv,
  analyserFichier,
  devinerNature,
  parserDateImport,
} from './csv';

describe('analyserLigneCsv', () => {
  it('découpe les champs simples séparés par des virgules', () => {
    expect(analyserLigneCsv('Titre,Date')).toEqual(['Titre', 'Date']);
  });

  it('préserve une virgule à l’intérieur d’un champ entre guillemets', () => {
    expect(analyserLigneCsv('"Nom, avec virgule",2024-01-01')).toEqual([
      'Nom, avec virgule',
      '2024-01-01',
    ]);
  });

  it('gère les guillemets échappés (deux guillemets = un littéral)', () => {
    expect(analyserLigneCsv('"Il a dit ""oui""",2024-01-01')).toEqual([
      'Il a dit "oui"',
      '2024-01-01',
    ]);
  });
});

describe('extraireTitre', () => {
  // Les films dont le nom contient « : » NE doivent PAS être tronqués (bug P0).
  it.each([
    'Mission: Impossible',
    'John Wick: Chapter 2',
    'Kill Bill: Volume 1',
    'Harry Potter and the Deathly Hallows: Part 1',
    'Star Wars: Episode IV',
  ])('préserve le film "%s" entier et laisse le type indéterminé', (titre) => {
    expect(extraireTitre(titre)).toEqual({ nom: titre, type: null });
  });

  it('conserve un titre simple sans « : »', () => {
    expect(extraireTitre('Old')).toEqual({ nom: 'Old', type: null });
  });

  // Les séries Netflix (motif épisodique) doivent être réduites au nom + type série.
  it.each([
    ['Stranger Things: Saison 1: Chapitre un', 'Stranger Things'],
    ['Breaking Bad: Season 5: Felina', 'Breaking Bad'],
    ["The Queen's Gambit: Limited Series: Openings", "The Queen's Gambit"],
    ['Le Jeu de la dame: Série limitée: Ouvertures', 'Le Jeu de la dame'],
    ['Arcane: Mini-série: Bienvenue', 'Arcane'],
  ])('détecte la série dans "%s" -> %s', (brut, nom) => {
    expect(extraireTitre(brut)).toEqual({ nom, type: 'serie' });
  });
});

describe('analyserCsv', () => {
  it('renvoie une liste vide pour un contenu sans données', () => {
    expect(analyserCsv('')).toEqual([]);
    expect(analyserCsv('Title,Date')).toEqual([]); // en-tête seul
  });

  it('parse un export Netflix et déduplique les épisodes d’une même série', () => {
    const csv = [
      'Title,Date',
      '"Stranger Things: Saison 1: Chapitre un",01/07/2024',
      '"Stranger Things: Saison 1: Chapitre deux",02/07/2024',
      '"Mission: Impossible",15/06/2024',
    ].join('\n');

    const lignes = analyserCsv(csv);

    // La série n'apparaît qu'une fois, le film est préservé entier.
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toMatchObject({
      titreBrut: 'Stranger Things',
      type: 'serie',
      source: 'import_netflix',
    });
    expect(lignes[1]).toMatchObject({
      titreBrut: 'Mission: Impossible',
      type: null,
      source: 'import_netflix',
    });
    // La date brute du fichier est conservée pour l'étape d'import.
    expect(lignes[0].date).toBe('01/07/2024');
  });

  it('classe un fichier sans colonne "title" comme import TV Time', () => {
    const csv = ['nom,vu_le', 'Dark,2023-05-01'].join('\n');
    const lignes = analyserCsv(csv);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ titreBrut: 'Dark', source: 'import_tvtime' });
  });

  it('ignore les lignes vides', () => {
    const csv = ['Title,Date', '', 'Old,2024-01-01', '   '].join('\n');
    expect(analyserCsv(csv)).toHaveLength(1);
  });
});

describe('parserDateImport', () => {
  it.each([
    [null, null],
    ['', null],
    ['2024-07-15', '2024-07-15'],
    ['2024-07-15T10:30:00Z', '2024-07-15'],
    ['01/07/2024', '2024-07-01'], // JJ/MM/AAAA (FR)
    ['9/3/24', '2024-03-09'], // JJ/MM/AA -> 20xx
    ['13/07/2024', '2024-07-13'], // jour 13, non ambigu
    ['07/13/2024', null], // MM/JJ US -> mois 13 invalide -> null (pas de date fausse)
    ['32/01/2024', null], // jour invalide
    ['pas une date', null],
  ])('parserDateImport(%p) === %p', (entree, attendu) => {
    expect(parserDateImport(entree)).toBe(attendu);
  });
});

// =============================================================================
//  Nature du fichier et épisodes
//  ---------------------------------------------------------------------------
//  C'est ici que vivait le bug le plus grave de l'import : TOUT arrivait avec le
//  statut « terminé », y compris une watchlist ou une série à peine commencée.
//  Ces tests verrouillent la distinction.
// =============================================================================

describe('devinerNature', () => {
  it('reconnaît une watchlist à son nom', () => {
    expect(devinerNature('watchlist.csv', ['series_name'])).toBe('watchlist');
  });

  it('reconnaît un fichier d’épisodes vus à son nom', () => {
    expect(devinerNature('seen_episode.csv', ['series_name'])).toBe('episodes');
  });

  it('reconnaît des séries suivies à leur nom', () => {
    expect(devinerNature('follows.csv', ['series_name'])).toBe('suivi');
  });

  it('reconnaît un historique Netflix à son nom', () => {
    expect(devinerNature('NetflixViewingHistory.csv', ['title', 'date'])).toBe('historique');
  });

  it('déduit « épisodes » des colonnes quand le nom ne dit rien', () => {
    // Des colonnes de saison ET d'épisode ne peuvent décrire qu'un suivi
    // épisode par épisode.
    expect(devinerNature('export.csv', ['series_name', 'season_number', 'episode_number'])).toBe(
      'episodes'
    );
  });

  it('renvoie « inconnu » plutôt que de deviner', () => {
    // Le cœur de la correction : mieux vaut demander que supposer « terminé ».
    expect(devinerNature('donnees.csv', ['nom'])).toBe('inconnu');
  });
});

describe('analyserFichier — épisodes TV Time', () => {
  const csv = [
    'series_name,season_number,episode_number,watched_at',
    'Breaking Bad,1,1,2024-01-05',
    'Breaking Bad,1,2,2024-01-06',
    'Breaking Bad,2,1,2024-02-01',
    'Game of Thrones,1,1,2024-03-01',
  ].join('\n');

  it('regroupe les épisodes par série au lieu de répéter le titre', () => {
    const { lignes } = analyserFichier(csv, 'seen_episode.csv');
    expect(lignes).toHaveLength(2);
    expect(lignes[0].titreBrut).toBe('Breaking Bad');
  });

  it('conserve chaque épisode avec sa saison et son numéro', () => {
    // C'est ce qui permet de reconstituer l'avancement RÉEL plutôt que de
    // déclarer la série terminée.
    const { lignes } = analyserFichier(csv, 'seen_episode.csv');
    expect(lignes[0].episodes).toEqual([
      { saison: 1, numero: 1, date: '2024-01-05' },
      { saison: 1, numero: 2, date: '2024-01-06' },
      { saison: 2, numero: 1, date: '2024-02-01' },
    ]);
  });

  it('force le type « serie » : des colonnes de saison ne laissent aucun doute', () => {
    const { lignes } = analyserFichier(csv, 'seen_episode.csv');
    expect(lignes[0].type).toBe('serie');
  });

  it('annonce la nature « episodes »', () => {
    expect(analyserFichier(csv, 'seen_episode.csv').nature).toBe('episodes');
  });

  it('préfère « series_name » à « name » pour le titre', () => {
    // « name » pourrait désigner le nom de l'ÉPISODE : le prendre nommerait la
    // série d'après son premier épisode.
    const avecNom = [
      'series_name,name,season_number,episode_number',
      'Breaking Bad,Chute libre,1,1',
    ].join('\n');
    expect(analyserFichier(avecNom, 'seen_episode.csv').lignes[0].titreBrut).toBe('Breaking Bad');
  });

  it('ignore un épisode dont le numéro n’est pas un nombre', () => {
    const bancal = ['series_name,season_number,episode_number', 'Breaking Bad,1,inconnu'].join(
      '\n'
    );
    expect(analyserFichier(bancal, 'seen_episode.csv').lignes[0].episodes).toBeUndefined();
  });
});

describe('analyserFichier — watchlist', () => {
  it('n’attache aucun épisode à une watchlist', () => {
    const csv = ['series_name,created_at', 'Severance,2024-05-01'].join('\n');
    const { nature, lignes } = analyserFichier(csv, 'watchlist.csv');
    expect(nature).toBe('watchlist');
    expect(lignes[0].episodes).toBeUndefined();
  });
});

describe('analyserFichier — Netflix reste reconnu', () => {
  it('conserve la source Netflix sans nom de fichier', () => {
    const csv = ['Title,Date', '"Mission: Impossible",15/06/2024'].join('\n');
    expect(analyserFichier(csv).lignes[0].source).toBe('import_netflix');
  });
});
