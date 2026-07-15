// =============================================================================
//  Service d'import
//  ---------------------------------------------------------------------------
//  Récupère un historique existant depuis un fichier, au lieu de tout ressaisir.
//  Deux formats sont pris en charge :
//
//   1. Export « Activité de visionnage » de Netflix
//      (netflix.com/viewingactivity -> « Télécharger tout »).
//      Colonnes typiques : Title, Date. Le titre ressemble à
//      « Nom de la série: Saison 1: Nom de l'épisode », ou juste « Nom du film ».
//
//   2. Export RGPD de TV Time — une ARCHIVE .zip contenant plusieurs CSV
//      (épisodes vus, watchlist, séries suivies…). Voir `archive.ts`.
//
//  ⚠️ LE STATUT NE SE DEVINE PAS TOUJOURS. Cette fonction importait TOUT avec le
//  statut « terminé », au motif qu'« un historique correspond à des contenus déjà
//  regardés ». C'est vrai d'un historique Netflix ; c'est faux d'un export
//  TV Time, qui contient aussi la watchlist et les séries EN COURS. Résultat :
//  des séries à peine commencées étaient déclarées terminées.
//
//  Le statut est donc maintenant fourni par l'appelant, et l'écran d'import le
//  demande quand le fichier ne permet pas de trancher.
// =============================================================================

import { LigneImport, StatutSuivi } from '@/types';
import { rechercher } from '@/lib/tmdb';
import { ajouterTitre, marquerEpisodeVu } from '@/services/bibliotheque';
import { episodesSaison } from '@/lib/tmdb';
import { parserDateImport } from '@/services/csv';
import { avecReessais, enParallele } from '@/services/async';

// Réexport pour conserver l'API historique du service d'import (utilisée par
// l'écran d'import), tout en gardant la logique de parsing dans `csv.ts`.
export { analyserCsv, analyserFichier, devinerNature } from '@/services/csv';
export type { AnalyseFichier, NatureFichier } from '@/services/csv';

/** Résultat de l'import : combien de titres importés et lesquels ont échoué. */
export interface ResultatImport {
  importes: number;
  /** Épisodes marqués vus (export TV Time). */
  episodes: number;
  echecs: string[];
}

/** Nombre de résolutions TMDb menées en parallèle pendant l'import. */
const CONCURRENCE = 5;

/**
 * Résout chaque ligne vers un titre TMDb (par recherche) puis l'ajoute à la
 * bibliothèque avec le statut demandé.
 *
 * Quand le fichier contient des épisodes (export TV Time), ils sont marqués vus
 * un par un : c'est ce qui reconstitue l'avancement réel. Le statut de la série
 * devient alors « en cours », quoi qu'ait demandé l'appelant — une série dont on
 * connaît les épisodes vus n'a pas besoin qu'on devine où elle en est.
 *
 * Les lignes sont traitées par petits lots parallèles (voir `CONCURRENCE`) pour
 * accélérer un gros import sans saturer TMDb, chaque résolution étant protégée
 * par des ré-essais. La date d'historique du fichier est conservée comme date
 * d'ajout quand elle est exploitable.
 *
 * @param lignes      Les lignes issues de `analyserFichier`.
 * @param statut      Le statut à appliquer aux titres sans épisodes.
 * @param onProgress  Appelé après chaque ligne traitée : (traitees, total).
 */
export async function importer(
  lignes: LigneImport[],
  statut: StatutSuivi = 'termine',
  onProgress?: (traitees: number, total: number) => void
): Promise<ResultatImport> {
  const resultat: ResultatImport = { importes: 0, episodes: 0, echecs: [] };
  let traitees = 0;

  async function traiterLigne(ligne: LigneImport): Promise<void> {
    try {
      const candidats = await avecReessais(() => rechercher(ligne.titreBrut));
      // On prend le meilleur candidat, en respectant le type si on le connaît.
      const meilleur =
        candidats.find((c) => (ligne.type ? c.type === ligne.type : true)) ?? candidats[0];

      if (!meilleur) {
        resultat.echecs.push(ligne.titreBrut);
        return;
      }

      const avecEpisodes = (ligne.episodes?.length ?? 0) > 0 && meilleur.type === 'serie';
      // Une série dont on connaît les épisodes vus est « en cours » : c'est le
      // marquage des épisodes qui dira où elle en est, pas une supposition.
      await ajouterTitre(
        meilleur,
        avecEpisodes ? 'en_cours' : statut,
        ligne.source,
        parserDateImport(ligne.date)
      );
      resultat.importes++;

      if (avecEpisodes) {
        resultat.episodes += await marquerEpisodesDeLigne(meilleur.id, ligne);
      }
    } catch {
      resultat.echecs.push(ligne.titreBrut);
    } finally {
      traitees++;
      onProgress?.(traitees, lignes.length);
    }
  }

  // Fenêtre glissante : au plus CONCURRENCE lignes traitées en parallèle.
  await enParallele(lignes, CONCURRENCE, traiterLigne);

  return resultat;
}

/**
 * Marque vus les épisodes listés pour une série.
 *
 * Le fichier donne des POSITIONS (saison, numéro) ; la base a besoin des
 * identifiants TMDb. On charge donc chaque saison concernée une fois, puis on
 * fait correspondre — plutôt qu'un appel par épisode, qui multiplierait les
 * requêtes par vingt sur une saison complète.
 *
 * @returns le nombre d'épisodes réellement marqués.
 */
async function marquerEpisodesDeLigne(serieId: number, ligne: LigneImport): Promise<number> {
  const parSaison = new Map<number, { numero: number; date: string | null }[]>();
  for (const e of ligne.episodes ?? []) {
    const liste = parSaison.get(e.saison);
    if (liste) liste.push({ numero: e.numero, date: e.date });
    else parSaison.set(e.saison, [{ numero: e.numero, date: e.date }]);
  }

  let marques = 0;
  for (const [saison, liste] of parSaison) {
    try {
      const episodes = await avecReessais(() => episodesSaison(serieId, saison));
      const parNumero = new Map(episodes.map((e) => [e.numero, e]));

      await enParallele(liste, 5, async (v) => {
        const ep = parNumero.get(v.numero);
        if (!ep) return;
        await marquerEpisodeVu(serieId, ep.id, saison, v.numero);
        marques++;
      });
    } catch {
      // Saison introuvable ou réseau : les autres saisons restent importées.
    }
  }
  return marques;
}
