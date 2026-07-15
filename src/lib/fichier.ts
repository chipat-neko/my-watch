// =============================================================================
//  Lecture de fichier (mobile)
//  ---------------------------------------------------------------------------
//  Lit un fichier choisi (import CSV ou archive .zip) via expo-file-system.
//  Sur le web, c'est `fichier.web.ts` qui est utilisé (fetch sur le blob).
// =============================================================================

import * as FileSystem from 'expo-file-system';

export const lireFichierTexte = (uri: string): Promise<string> => FileSystem.readAsStringAsync(uri);

/**
 * Lit un fichier BINAIRE (une archive .zip).
 *
 * `expo-file-system` ne sait pas rendre d'octets bruts : il passe par du base64,
 * qu'il faut décoder. Lire un zip comme du texte le corromprait — les octets
 * non imprimables seraient remplacés.
 */
export async function lireFichierBinaire(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  // `atob` est fourni par Hermes et par le web ; il rend une chaîne dont chaque
  // caractère porte un octet.
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return octets;
}
