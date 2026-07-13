// =============================================================================
//  Service d'import
//  ---------------------------------------------------------------------------
//  Permet de récupérer un historique existant depuis un fichier CSV, au lieu
//  de tout ressaisir à la main. Deux formats sont pris en charge :
//
//   1. Export "Activité de visionnage" de Netflix
//      (netflix.com/viewingactivity -> bouton "Télécharger tout").
//      Colonnes typiques : Title, Date
//      Le "Title" ressemble à :  "Nom de la série: Saison 1: Nom de l'épisode"
//      ou simplement "Nom du film".
//
//   2. Export RGPD de TV Time (utile AVANT la fermeture du 15/07/2026 !).
//      Le fichier contient une colonne de nom de série/film et une date.
//
//  Le pipeline est en deux temps :
//   a) analyser le CSV -> liste de "LigneImport" (titres bruts). Cette logique
//      PURE vit dans `csv.ts` (facile à tester).
//   b) résoudre chaque titre via TMDb, puis l'ajouter à la bibliothèque (ici).
//  On sépare les deux pour pouvoir afficher un aperçu à l'utilisateur avant
//  de réellement importer.
// =============================================================================

import { LigneImport } from '@/types';
import { rechercher } from '@/lib/tmdb';
import { ajouterTitre } from '@/services/bibliotheque';
import { parserDateImport } from '@/services/csv';
import { avecReessais, enParallele } from '@/services/async';

// Réexport pour conserver l'API historique du service d'import (utilisée par
// l'écran d'import), tout en gardant la logique de parsing dans `csv.ts`.
export { analyserCsv } from '@/services/csv';

/** Résultat de l'import : combien de titres importés et lesquels ont échoué. */
export interface ResultatImport {
  importes: number;
  echecs: string[];
}

/** Nombre de résolutions TMDb menées en parallèle pendant l'import. */
const CONCURRENCE = 5;

/**
 * Résout chaque ligne d'import vers un titre TMDb (par recherche) puis
 * l'ajoute à la bibliothèque. On importe avec le statut "termine" car un
 * historique correspond à des contenus déjà regardés.
 *
 * Les lignes sont traitées par petits lots parallèles (voir `CONCURRENCE`) pour
 * accélérer un gros import sans saturer TMDb, chaque résolution étant protégée
 * par des ré-essais. La date d'historique du fichier est conservée comme date
 * d'ajout quand elle est exploitable.
 *
 * @param lignes      Les lignes issues de `analyserCsv`.
 * @param onProgress  Callback optionnel appelé après chaque ligne traitée (pour
 *                    une barre de progression) : (traitees, total).
 */
export async function importer(
  lignes: LigneImport[],
  onProgress?: (traitees: number, total: number) => void
): Promise<ResultatImport> {
  const resultat: ResultatImport = { importes: 0, echecs: [] };
  let traitees = 0;

  // Résout une ligne vers un titre TMDb (avec ré-essais) puis l'ajoute.
  async function traiterLigne(ligne: LigneImport): Promise<void> {
    try {
      const candidats = await avecReessais(() => rechercher(ligne.titreBrut));
      // On prend le meilleur candidat, en respectant le type si on le connaît.
      const meilleur =
        candidats.find((c) => (ligne.type ? c.type === ligne.type : true)) ?? candidats[0];

      if (meilleur) {
        await ajouterTitre(meilleur, 'termine', ligne.source, parserDateImport(ligne.date));
        resultat.importes++;
      } else {
        resultat.echecs.push(ligne.titreBrut);
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
