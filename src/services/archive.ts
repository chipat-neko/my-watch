// =============================================================================
//  Lecture d'une archive d'export (.zip)
//  ---------------------------------------------------------------------------
//  TV Time ne livre pas un CSV : il livre `gdpr-data.zip`, une archive contenant
//  plusieurs fichiers (épisodes vus, watchlist, séries suivies…).
//
//  L'application n'acceptant que des .csv, il fallait extraire l'archive à la
//  main puis importer chaque fichier un par un — et, chaque fichier étant importé
//  avec le même statut « terminé », le résultat était faux. On lit donc l'archive
//  directement.
// =============================================================================

import JSZip from 'jszip';
import { analyserFichier, AnalyseFichier } from '@/services/csv';

/** Un fichier de l'archive, analysé. */
export interface FichierArchive extends AnalyseFichier {
  nom: string;
}

/** Vrai si le nom de fichier désigne une archive. */
export function estArchive(nom: string): boolean {
  return /\.zip$/i.test(nom.trim());
}

/**
 * Lit une archive et analyse chaque CSV qu'elle contient.
 *
 * @param donnees  Le contenu binaire de l'archive.
 * @returns Les fichiers exploitables, du plus riche au plus pauvre : un export
 *          TV Time contient des fichiers annexes (profil, réglages) sans intérêt
 *          ici, et les présenter dans le désordre noierait l'essentiel.
 */
export async function lireArchive(donnees: ArrayBuffer | Uint8Array): Promise<FichierArchive[]> {
  const zip = await JSZip.loadAsync(donnees);
  const fichiers: FichierArchive[] = [];

  for (const chemin of Object.keys(zip.files)) {
    const entree = zip.files[chemin];
    // Les archives portent des dossiers, et macOS y glisse un `__MACOSX` de
    // métadonnées : ni l'un ni l'autre ne contient de données.
    if (entree.dir) continue;
    if (/__MACOSX|\.DS_Store/i.test(chemin)) continue;
    if (!/\.csv$/i.test(chemin)) continue;

    const texte = await entree.async('string');
    // Le NOM porte le sens chez TV Time (`seen_episode`, `watchlist`…) : on le
    // transmet, sans le chemin du dossier qui l'englobe.
    const nom = chemin.split('/').pop() ?? chemin;
    const analyse = analyserFichier(texte, nom);

    // Un CSV sans ligne exploitable n'a rien à faire dans la liste.
    if (analyse.lignes.length === 0) continue;
    fichiers.push({ nom, ...analyse });
  }

  // Les fichiers dont on connaît la nature d'abord, puis les plus fournis : ce
  // sont ceux que l'on veut importer en premier.
  const rang = (f: FichierArchive) => (f.nature === 'inconnu' ? 1 : 0);
  return fichiers.sort((a, b) => rang(a) - rang(b) || b.lignes.length - a.lignes.length);
}
