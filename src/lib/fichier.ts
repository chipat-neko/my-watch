// =============================================================================
//  Lecture de fichier texte (mobile)
//  ---------------------------------------------------------------------------
//  Lit le contenu texte d'un fichier choisi (import CSV) via expo-file-system.
//  Sur le web, c'est `fichier.web.ts` qui est utilisé (fetch sur le blob).
// =============================================================================

import * as FileSystem from 'expo-file-system';

export const lireFichierTexte = (uri: string): Promise<string> => FileSystem.readAsStringAsync(uri);
