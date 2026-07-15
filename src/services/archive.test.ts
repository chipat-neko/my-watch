// =============================================================================
//  Tests : lecture d'une archive d'export (.zip)
//  ---------------------------------------------------------------------------
//  TV Time livre `gdpr-data.zip`. L'application n'acceptait que des .csv : il
//  fallait extraire l'archive à la main et déposer chaque fichier un par un.
//  Ces tests construisent une archive réaliste et vérifient qu'on la lit.
// =============================================================================

import JSZip from 'jszip';
import { estArchive, lireArchive } from './archive';

/** Construit une archive semblable à un export TV Time. */
async function archiveTest(): Promise<Uint8Array> {
  const zip = new JSZip();
  const dossier = zip.folder('gdpr-data')!;

  dossier.file(
    'seen_episode.csv',
    [
      'series_name,season_number,episode_number,watched_at',
      'Breaking Bad,1,1,2024-01-05',
      'Breaking Bad,1,2,2024-01-06',
      'Breaking Bad,1,3,2024-01-07',
      'Game of Thrones,1,1,2024-02-01',
    ].join('\n')
  );
  dossier.file('watchlist.csv', ['series_name,created_at', 'Severance,2024-05-01'].join('\n'));
  dossier.file('follows.csv', ['series_name,created_at', 'Silo,2024-04-01'].join('\n'));
  // Fichiers sans intérêt pour l'import : ils ne doivent pas être proposés.
  dossier.file('entete-seule.csv', 'series_name,created_at');
  dossier.file('lisez-moi.txt', 'Export RGPD TV Time');
  zip.folder('__MACOSX')!.file('._seen_episode.csv', 'metadonnees macOS');

  return zip.generateAsync({ type: 'uint8array' });
}

describe('estArchive', () => {
  it('reconnaît un .zip', () => {
    expect(estArchive('gdpr-data.zip')).toBe(true);
    expect(estArchive('GDPR-DATA.ZIP')).toBe(true);
  });

  it('ne confond pas avec un CSV', () => {
    expect(estArchive('NetflixViewingHistory.csv')).toBe(false);
  });
});

describe('lireArchive', () => {
  it('trouve les CSV exploitables de l’archive', async () => {
    const fichiers = await lireArchive(await archiveTest());
    expect(fichiers.map((f) => f.nom).sort()).toEqual([
      'follows.csv',
      'seen_episode.csv',
      'watchlist.csv',
    ]);
  });

  it('écarte le .txt, l’en-tête seule et les métadonnées macOS', async () => {
    const fichiers = await lireArchive(await archiveTest());
    const noms = fichiers.map((f) => f.nom);
    expect(noms).not.toContain('lisez-moi.txt');
    // Un CSV sans ligne de données n'a rien à proposer.
    expect(noms).not.toContain('entete-seule.csv');
    // macOS glisse un dossier de métadonnées dans les archives : ce ne sont pas
    // des données, et leurs noms singent ceux des vrais fichiers.
    expect(noms).not.toContain('._seen_episode.csv');
  });

  it('devine la nature de chaque fichier d’après son nom', async () => {
    const fichiers = await lireArchive(await archiveTest());
    const nature = (n: string) => fichiers.find((f) => f.nom === n)?.nature;
    expect(nature('seen_episode.csv')).toBe('episodes');
    expect(nature('watchlist.csv')).toBe('watchlist');
    expect(nature('follows.csv')).toBe('suivi');
  });

  it('conserve les épisodes vus, saison et numéro compris', async () => {
    const fichiers = await lireArchive(await archiveTest());
    const eps = fichiers.find((f) => f.nature === 'episodes');
    const bb = eps?.lignes.find((l) => l.titreBrut === 'Breaking Bad');
    expect(bb?.episodes).toHaveLength(3);
    expect(bb?.episodes?.[0]).toEqual({ saison: 1, numero: 1, date: '2024-01-05' });
  });

  it('retire le chemin du dossier : le NOM porte le sens chez TV Time', async () => {
    const fichiers = await lireArchive(await archiveTest());
    // « gdpr-data/seen_episode.csv » ne se reconnaîtrait pas par son nom.
    expect(fichiers.every((f) => !f.nom.includes('/'))).toBe(true);
  });

  it('classe les fichiers identifiés avant les autres', async () => {
    const zip = new JSZip();
    zip.file('mystere.csv', ['nom,date', 'Dark,2024-01-01'].join('\n'));
    zip.file(
      'seen_episode.csv',
      ['series_name,season_number,episode_number', 'Breaking Bad,1,1'].join('\n')
    );
    const fichiers = await lireArchive(await zip.generateAsync({ type: 'uint8array' }));
    // Ce qu'on sait lire d'abord : c'est ce que l'on veut importer en premier.
    expect(fichiers[0].nature).not.toBe('inconnu');
  });

  it('renvoie une liste vide pour une archive sans CSV', async () => {
    const zip = new JSZip();
    zip.file('lisez-moi.txt', 'rien ici');
    expect(await lireArchive(await zip.generateAsync({ type: 'uint8array' }))).toEqual([]);
  });
});
