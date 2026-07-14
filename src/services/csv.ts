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

/**
 * Transforme le contenu texte d'un CSV en lignes d'import normalisées.
 * Détecte automatiquement s'il s'agit d'un export Netflix ou TV Time
 * en regardant les intitulés de colonnes de l'en-tête.
 */
export function analyserCsv(contenu: string): LigneImport[] {
  const lignes = contenu.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lignes.length < 2) return [];

  const entete = analyserLigneCsv(lignes[0]).map((h) => h.toLowerCase());

  // Repère les colonnes "titre" et "date", quels que soient leurs noms exacts.
  const idxTitre = entete.findIndex(
    (h) => h.includes('title') || h.includes('titre') || h.includes('name') || h.includes('nom')
  );
  const idxDate = entete.findIndex((h) => h.includes('date'));

  // Heuristique de détection de la source.
  const source: LigneImport['source'] =
    entete.some((h) => h.includes('title')) && entete.some((h) => h.includes('date'))
      ? 'import_netflix'
      : 'import_tvtime';

  const resultat: LigneImport[] = [];
  const dejaVus = new Set<string>(); // évite les doublons (séries répétées par épisode)

  for (let i = 1; i < lignes.length; i++) {
    const champs = analyserLigneCsv(lignes[i]);
    const brut = idxTitre >= 0 ? (champs[idxTitre] ?? '') : (champs[0] ?? '');
    if (!brut) continue;

    // Déduit le nom (et le type si évident) sans casser les titres à « : ».
    const { nom, type } = extraireTitre(brut);
    if (!nom || dejaVus.has(nom.toLowerCase())) continue;
    dejaVus.add(nom.toLowerCase());

    resultat.push({
      titreBrut: nom,
      type,
      date: idxDate >= 0 ? (champs[idxDate] ?? null) : null,
      source,
    });
  }
  return resultat;
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
