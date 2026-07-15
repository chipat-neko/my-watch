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
  // Une VRAIE clé, telle que Trakt en délivre aujourd'hui : 43 caractères en
  // base64url. Vérifiée contre l'API : elle répond 200.
  const reelle = 'uT7erKbucvXm2aQ9pLzR4sN8dW1fJ6hK0yB3gT5vC7e';

  it('accepte une clé Trakt telle qu’elles sont délivrées aujourd’hui (43 caractères)', () => {
    expect(cleTraktValide(reelle)).toBe(true);
  });

  it('accepte aussi l’ancien format (64 hexadécimaux)', () => {
    // Trakt a changé de format une fois : rien ne dit que les anciennes clés
    // ont cessé de fonctionner.
    expect(cleTraktValide('a1b2c3d4e5f6'.repeat(5) + 'abcd')).toBe(true);
  });

  it('ignore les espaces autour', () => {
    expect(cleTraktValide('  ' + reelle + '  ')).toBe(true);
  });

  it('REFUSE la valeur d’exemple du fichier .env', () => {
    // Le défaut d'origine, en une ligne : cette valeur n'est pas vide, donc
    // l'application se croyait configurée.
    expect(cleTraktValide('colle_ici_ton_client_id_trakt')).toBe(false);
    expect(cleTraktValide('colle_ici_ton_client_secret_trakt')).toBe(false);
  });

  it('refuse une chaîne vide ou trop courte pour être un jeton', () => {
    expect(cleTraktValide('')).toBe(false);
    expect(cleTraktValide('abc')).toBe(false);
    expect(cleTraktValide('a'.repeat(31))).toBe(false);
  });

  it('refuse ce qui contient un espace ou un accent : un jeton n’en a pas', () => {
    expect(cleTraktValide('cle avec espace ' + 'a'.repeat(30))).toBe(false);
    expect(cleTraktValide('clé_accentuée_' + 'a'.repeat(30))).toBe(false);
  });

  it('ne présume PAS d’une longueur exacte : Trakt a déjà changé la sienne', () => {
    // C'est ce test qui empêche de re-figer un format et de rejeter, demain,
    // des clés parfaitement valides.
    expect(cleTraktValide('b'.repeat(43))).toBe(true);
    expect(cleTraktValide('b'.repeat(64))).toBe(true);
    expect(cleTraktValide('b'.repeat(100))).toBe(true);
  });
});
