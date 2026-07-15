// =============================================================================
//  Temps passé à regarder (logique pure)
//  ---------------------------------------------------------------------------
//  Le handoff demande une carte « Temps passé à regarder ». C'est le chiffre le
//  plus partagé d'une app de suivi — et le plus facile à rendre faux.
//
//  Honnêteté du calcul : TMDb ne donne PAS la durée réelle de chaque épisode
//  vu, seulement une durée TYPE par série (`episode_run_time`). Le total est
//  donc une ESTIMATION, et l'interface doit le dire (« environ »). Prétendre à
//  la minute près serait un mensonge.
// =============================================================================

/** Ce qu'il faut savoir d'un titre pour estimer le temps passé dessus. */
export interface DureeTitre {
  /** Durée en minutes : du film, ou d'un épisode type pour une série. */
  duree: number;
  /** Nombre d'épisodes vus (1 pour un film vu, 0 s'il ne l'est pas). */
  unitesVues: number;
}

/**
 * Durée type d'un épisode quand TMDb ne la donne pas.
 *
 * 42 minutes : le format d'une heure avec publicités, majoritaire dans les
 * catalogues de séries. Mieux vaut une estimation transparente que d'exclure
 * silencieusement la série du total, ce qui donnerait un chiffre faux sans
 * que personne ne comprenne pourquoi.
 */
export const DUREE_EPISODE_DEFAUT = 42;

/** Total en minutes. */
export function minutesTotales(titres: DureeTitre[]): number {
  let total = 0;
  for (const t of titres) {
    if (t.duree > 0 && t.unitesVues > 0) total += t.duree * t.unitesVues;
  }
  return total;
}

/**
 * Formate une durée en minutes pour l'affichage.
 * Renvoie les deux morceaux séparément : l'interface met le nombre en avant et
 * l'unité en retrait, ce qu'une chaîne unique interdirait.
 */
export function formaterDuree(minutes: number): { valeur: string; unite: string } {
  if (minutes < 60) return { valeur: String(Math.round(minutes)), unite: 'min' };

  const heures = minutes / 60;
  // Sous une journée, la demi-heure est encore une information.
  if (heures < 24) return { valeur: String(Math.round(heures * 10) / 10), unite: 'h' };
  // Jusqu'à trois jours, l'heure reste l'unité la plus parlante.
  if (heures < 72) return { valeur: String(Math.round(heures)), unite: 'h' };

  return { valeur: String(Math.round((heures / 24) * 10) / 10), unite: 'jours' };
}

/**
 * Phrase de contexte sous le chiffre : donne une échelle humaine à un total qui,
 * sinon, ne veut rien dire.
 */
export function equivalence(minutes: number): string {
  const heures = minutes / 60;
  if (heures < 1) return 'Tu commences tout juste.';
  if (heures < 24) return `Soit ${Math.round(heures)} h devant un écran.`;
  const jours = Math.floor(heures / 24);
  return `Soit ${jours} jour${jours > 1 ? 's' : ''} complet${jours > 1 ? 's' : ''}, non-stop.`;
}
