// =============================================================================
//  Lecture de fichier (web)
//  ---------------------------------------------------------------------------
//  Sur le navigateur, l'URI renvoyée par le sélecteur de document est un blob
//  (ou une data-URL) lisible directement via fetch.
// =============================================================================

export const lireFichierTexte = async (uri: string): Promise<string> => {
  const reponse = await fetch(uri);
  return reponse.text();
};

/**
 * Lit un fichier BINAIRE (une archive .zip).
 *
 * Le navigateur sait rendre les octets bruts directement : pas de détour par
 * base64, contrairement au natif.
 */
export async function lireFichierBinaire(uri: string): Promise<Uint8Array> {
  const reponse = await fetch(uri);
  return new Uint8Array(await reponse.arrayBuffer());
}
