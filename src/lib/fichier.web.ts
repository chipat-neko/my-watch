// =============================================================================
//  Lecture de fichier texte (web)
//  ---------------------------------------------------------------------------
//  Sur le navigateur, l'URI renvoyée par le sélecteur de document est un blob
//  (ou une data-URL) lisible directement via fetch.
// =============================================================================

export const lireFichierTexte = async (uri: string): Promise<string> => {
  const reponse = await fetch(uri);
  return reponse.text();
};
