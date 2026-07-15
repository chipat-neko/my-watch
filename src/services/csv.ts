// =============================================================================
//  Analyse CSV (fonctions pures)
//  ---------------------------------------------------------------------------
//  Toute la logique de parsing d'un export CSV (Netflix / TV Time) vit ici,
//  SANS aucune dépendance à React Native, au réseau ou à Firebase. Ces fonctions
//  sont donc pures et faciles à tester unitairement (voir csv.test.ts).
//
//  La résolution des titres via TMDb et l'écriture en base restent, elles, dans
//  `import.ts`, qui s'appuie sur ce module.
// =============================================================================

import { LigneImport, TypeMedia } from '@/types';

/**
 * Analyse une seule ligne CSV en tenant compte des champs entre guillemets
 * (un champ peut contenir une virgule s'il est entre "double quotes").
 */
export function analyserLigneCsv(ligne: string): string[] {
  const champs: string[] = [];
  let courant = '';
  let entreGuillemets = false;

  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      // Deux guillemets consécutifs = un guillemet littéral.
      if (entreGuillemets && ligne[i + 1] === '"') {
        courant += '"';
        i++;
      } else {
        entreGuillemets = !entreGuillemets;
      }
    } else if (c === ',' && !entreGuillemets) {
      champs.push(courant);
      courant = '';
    } else {
      courant += c;
    }
  }
  champs.push(courant);
  return champs.map((ch) => ch.trim());
}

/**
 * Motif à HAUTE PRÉCISION identifiant le découpage épisodique d'une série dans
 * un export Netflix. Netflix nomme les épisodes ainsi :
 *   "Nom de la série: Saison 1: Titre de l'épisode"
 *   "Nom de la série: Limited Series: Titre de l'épisode"
 *
 * On ne reconnaît QUE des motifs sans ambiguïté avec de vrais titres de films :
 * on EXCLUT volontairement "Chapter", "Volume" et "Part", très fréquents dans
 * des titres de films ("John Wick: Chapter 2", "Kill Bill: Volume 1",
 * "Harry Potter... : Part 1"). Quitte à rater quelques mini-séries exotiques,
 * on préfère ne jamais tronquer un film à tort.
 */
const MOTIF_SERIE =
  /:\s*(saison\s+\d+|season\s+\d+|série limitée|serie limitee|limited series|mini-?série|mini-?serie|mini-?series)\b/i;

/**
 * Déduit le nom et le type d'un titre à partir de son libellé brut CSV.
 * - Si le motif épisodique série est détecté -> type "serie", et on ne garde
 *   que la partie AVANT ce séparateur (le nom de la série).
 * - Sinon -> on conserve le titre ENTIER (les films dont le nom contient « : »,
 *   comme "Mission: Impossible", sont ainsi préservés) et on laisse le type à
 *   null : TMDb tranchera lors de la recherche.
 */
export function extraireTitre(brut: string): { nom: string; type: TypeMedia | null } {
  const correspondance = brut.match(MOTIF_SERIE);
  if (correspondance && correspondance.index !== undefined) {
    return { nom: brut.slice(0, correspondance.index).trim(), type: 'serie' };
  }
  return { nom: brut.trim(), type: null };
}

/** Trouve l'index d'une colonne dont l'intitulé contient l'un des mots donnés. */
function trouverColonne(entete: string[], mots: string[]): number {
  return entete.findIndex((h) => mots.some((m) => h.includes(m)));
}

/**
 * Ce qu'un fichier importé raconte réellement.
 *
 * C'est la distinction qui manquait : un historique Netflix liste ce qui a été
 * REGARDÉ, une watchlist liste ce qu'on VEUT voir, et un export d'épisodes dit
 * OÙ L'ON EN EST. Les confondre revenait à tout marquer « terminé ».
 */
export type NatureFichier =
  | 'historique' // Ce qui a été vu (Netflix).
  | 'episodes' // Épisodes vus, avec saison et numéro (TV Time).
  | 'watchlist' // Ce qu'on veut voir.
  | 'suivi' // Séries suivies, en cours.
  | 'inconnu'; // On ne peut pas trancher : c'est à l'utilisateur de dire.

/** Résultat de l'analyse d'un fichier. */
export interface AnalyseFichier {
  nature: NatureFichier;
  lignes: LigneImport[];
}

/**
 * Devine la nature d'un fichier d'après son nom et ses colonnes.
 *
 * Les exports RGPD de TV Time contiennent plusieurs fichiers dont les noms
 * portent le sens : `seen_episode`, `watchlist`, `follows`… On s'appuie d'abord
 * sur le nom, puis sur les colonnes. En cas de doute : `inconnu`, et l'écran
 * demandera — mieux vaut une question qu'une donnée fausse.
 */
export function devinerNature(nomFichier: string, entete: string[]): NatureFichier {
  const nom = nomFichier.toLowerCase();

  if (/watchlist|to.?watch|a.?voir/.test(nom)) return 'watchlist';
  if (/seen.?episode|episode.?seen|watched.?episode|tracking/.test(nom)) return 'episodes';
  if (/follow|suivi|tracking.?show/.test(nom)) return 'suivi';
  if (/viewing|history|historique|activity/.test(nom)) return 'historique';

  // À défaut du nom : des colonnes de saison ET d'épisode ne peuvent décrire
  // qu'un suivi épisode par épisode.
  const aSaison = trouverColonne(entete, ['season', 'saison']) >= 0;
  const aEpisode = trouverColonne(entete, ['episode_number', 'episode number', 'numero']) >= 0;
  if (aSaison && aEpisode) return 'episodes';

  return 'inconnu';
}

/**
 * Transforme le contenu texte d'un CSV en lignes d'import normalisées, et dit ce
 * que le fichier raconte.
 *
 * @param contenu     Le texte du CSV.
 * @param nomFichier  Son nom : chez TV Time, c'est lui qui porte le sens.
 */
export function analyserFichier(contenu: string, nomFichier = ''): AnalyseFichier {
  const lignes = contenu.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lignes.length < 2) return { nature: 'inconnu', lignes: [] };

  const entete = analyserLigneCsv(lignes[0]).map((h) => h.toLowerCase());

  // La colonne du titre : on cherche d'abord les intitulés les plus précis, car
  // « name » seul pourrait désigner le nom de l'ÉPISODE et non celui de la série.
  let idxTitre = trouverColonne(entete, ['series_name', 'show_name', 'series name', 'show name']);
  if (idxTitre < 0) idxTitre = trouverColonne(entete, ['movie_name', 'movie name', 'film']);
  if (idxTitre < 0) idxTitre = trouverColonne(entete, ['title', 'titre']);
  if (idxTitre < 0) idxTitre = trouverColonne(entete, ['name', 'nom']);

  const idxDate = trouverColonne(entete, ['watched', 'created', 'updated', 'date']);
  const idxSaison = trouverColonne(entete, ['season_number', 'season number', 'season', 'saison']);
  const idxEpisode = trouverColonne(entete, ['episode_number', 'episode number', 'numero']);

  const nature = devinerNature(nomFichier, entete);

  // Netflix : le nom du fichier quand on l'a, sinon sa signature de colonnes —
  // exactement « Title » et « Date », et jamais de saison, celle-ci étant
  // enfouie dans le titre. Un export TV Time, lui, nomme ses colonnes autrement.
  const signatureNetflix =
    entete.some((h) => h.includes('title')) && entete.some((h) => h.includes('date'));
  const source: LigneImport['source'] =
    /viewing|netflix/i.test(nomFichier) || (signatureNetflix && idxSaison < 0)
      ? 'import_netflix'
      : 'import_tvtime';

  // Regroupe par titre : un export d'épisodes répète la série à chaque ligne.
  const parTitre = new Map<string, LigneImport>();

  for (let i = 1; i < lignes.length; i++) {
    const champs = analyserLigneCsv(lignes[i]);
    const brut = idxTitre >= 0 ? (champs[idxTitre] ?? '') : (champs[0] ?? '');
    if (!brut) continue;

    // Déduit le nom (et le type si évident) sans casser les titres à « : ».
    const { nom, type } = extraireTitre(brut);
    if (!nom) continue;

    const cle = nom.toLowerCase();
    const date = idxDate >= 0 ? (champs[idxDate] ?? null) : null;

    let ligne = parTitre.get(cle);
    if (!ligne) {
      ligne = {
        titreBrut: nom,
        // Des colonnes de saison et d'épisode ne laissent aucun doute sur le type.
        type: idxSaison >= 0 && idxEpisode >= 0 ? 'serie' : type,
        date,
        source,
      };
      parTitre.set(cle, ligne);
    }

    // Conserve chaque épisode : c'est ce qui permettra de reconstituer
    // l'avancement réel plutôt que de tout marquer « terminé ».
    if (idxSaison >= 0 && idxEpisode >= 0) {
      const saison = Number(champs[idxSaison]);
      const numero = Number(champs[idxEpisode]);
      if (Number.isFinite(saison) && Number.isFinite(numero) && numero > 0) {
        (ligne.episodes ??= []).push({ saison, numero, date });
      }
    }
  }

  return { nature, lignes: [...parTitre.values()] };
}

/**
 * Compatibilité : ne renvoie que les lignes.
 * @deprecated Préférer `analyserFichier`, qui dit aussi ce que le fichier raconte.
 */
export function analyserCsv(contenu: string): LigneImport[] {
  return analyserFichier(contenu).lignes;
}

/**
 * Convertit la date brute d'un CSV en date ISO (AAAA-MM-JJ), ou null si le
 * format n'est pas reconnu de façon fiable. Gère l'ISO et le format « JJ/MM/AAAA »
 * (orientation FR de l'app). En cas de doute, on renvoie null plutôt qu'une date
 * fausse : l'ajout retombera alors sur l'horodatage courant.
 */
export function parserDateImport(brut: string | null): string | null {
  if (!brut) return null;
  const t = brut.trim();
  // Déjà au format ISO (AAAA-MM-JJ…) : on garde la partie date.
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  // Format Netflix FR « JJ/MM/AAAA » (ou « JJ/MM/AA »).
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const jour = m[1].padStart(2, '0');
    const mois = m[2].padStart(2, '0');
    const annee = m[3].length === 2 ? `20${m[3]}` : m[3];
    if (Number(mois) >= 1 && Number(mois) <= 12 && Number(jour) >= 1 && Number(jour) <= 31) {
      return `${annee}-${mois}-${jour}`;
    }
  }
  return null;
}
