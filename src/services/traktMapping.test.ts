// =============================================================================
//  Tests unitaires du mapping Trakt (logique pure de traktMapping.ts)
// =============================================================================

import {
  mapperWatched,
  mapperNotes,
  appliquerNotes,
  TraktWatchedShow,
  TraktWatchedMovie,
  TraktRating,
  cleTraktValide,
} from './traktMapping';

describe('mapperWatched', () => {
  const shows: TraktWatchedShow[] = [
    { show: { title: 'Breaking Bad', ids: { tmdb: 1396 } } },
    { show: { title: 'Sans TMDb', ids: { tmdb: null } } }, // ignoré
  ];
  const movies: TraktWatchedMovie[] = [{ movie: { title: 'Fight Club', ids: { tmdb: 550 } } }];

  it('mappe séries -> en_cours et films -> termine, avec leur id TMDb', () => {
    const r = mapperWatched(shows, movies);
    expect(r).toEqual([
      { tmdbId: 1396, type: 'serie', titre: 'Breaking Bad', statut: 'en_cours', note: null },
      { tmdbId: 550, type: 'film', titre: 'Fight Club', statut: 'termine', note: null },
    ]);
  });

  it('ignore les entrées sans id TMDb', () => {
    expect(mapperWatched(shows, [])).toHaveLength(1);
  });
});

describe('mapperNotes', () => {
  it('indexe les notes de titres et ignore saison/épisode', () => {
    const ratings: TraktRating[] = [
      { rating: 9, type: 'movie', movie: { title: 'Fight Club', ids: { tmdb: 550 } } },
      { rating: 8, type: 'show', show: { title: 'Breaking Bad', ids: { tmdb: 1396 } } },
      { rating: 7, type: 'episode', show: { title: 'x', ids: { tmdb: 999 } } }, // ignoré
      { rating: 6, type: 'movie', movie: { title: 'x', ids: { tmdb: null } } }, // ignoré
    ];
    const notes = mapperNotes(ratings);
    expect(notes.get('film-550')).toBe(9);
    expect(notes.get('serie-1396')).toBe(8);
    expect(notes.size).toBe(2);
  });
});

describe('appliquerNotes', () => {
  it('associe la note au bon titre par type + tmdbId', () => {
    const titres = mapperWatched(
      [{ show: { title: 'Breaking Bad', ids: { tmdb: 1396 } } }],
      [{ movie: { title: 'Fight Club', ids: { tmdb: 550 } } }]
    );
    const notes = new Map([
      ['film-550', 9],
      ['serie-1396', 8],
    ]);
    const avecNotes = appliquerNotes(titres, notes);
    expect(avecNotes.find((t) => t.tmdbId === 1396)?.note).toBe(8);
    expect(avecNotes.find((t) => t.tmdbId === 550)?.note).toBe(9);
  });

  it('laisse note à null si non trouvée', () => {
    const titres = mapperWatched([{ show: { title: 'X', ids: { tmdb: 1 } } }], []);
    expect(appliquerNotes(titres, new Map())[0].note).toBeNull();
  });
});

// =============================================================================
//  Validité des clés Trakt
//  ---------------------------------------------------------------------------
//  Ce test existe à cause d'un défaut réel : la configuration était jugée
//  présente dès que la variable n'était pas vide. Or le modèle `.env` contient
//  `colle_ici_ton_client_id_trakt`, qui n'est pas vide. L'application se croyait
//  configurée, masquait le message d'aide, et échouait en 403 sans rien dire.
// =============================================================================

describe('cleTraktValide', () => {
  const vraie = 'a'.repeat(64);

  it('accepte une empreinte hexadécimale de 64 caractères', () => {
    expect(cleTraktValide(vraie)).toBe(true);
    expect(cleTraktValide('0123456789abcdef'.repeat(4))).toBe(true);
  });

  it('accepte les majuscules et ignore les espaces autour', () => {
    expect(cleTraktValide('  ' + 'ABCDEF0123456789'.repeat(4) + '  ')).toBe(true);
  });

  it('REFUSE la valeur d’exemple du fichier .env', () => {
    // Le défaut d'origine, en une ligne.
    expect(cleTraktValide('colle_ici_ton_client_id_trakt')).toBe(false);
  });

  it('refuse une chaîne vide', () => {
    expect(cleTraktValide('')).toBe(false);
  });

  it('refuse une clé trop courte ou trop longue', () => {
    expect(cleTraktValide('a'.repeat(63))).toBe(false);
    expect(cleTraktValide('a'.repeat(65))).toBe(false);
  });

  it('refuse des caractères non hexadécimaux', () => {
    expect(cleTraktValide('z'.repeat(64))).toBe(false);
  });
});
