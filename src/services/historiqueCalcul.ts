// =============================================================================
//  Journal de visionnage (logique pure)
//  ---------------------------------------------------------------------------
//  Regroupe les épisodes vus par JOUR. La date de visionnage est enregistrée
//  depuis le début (`EpisodeVu.vuLe`) sans avoir jamais été affichée nulle part.
//
//  Piège principal : `vuLe` est une date ISO en UTC. Découper la chaîne
//  (`slice(0, 10)`) donnerait le jour UTC, pas le jour de l'utilisateur : un
//  épisode coché à 23 h à Paris serait rangé au lendemain. On passe donc par la
//  date LOCALE.
// =============================================================================

/** Un épisode du journal. */
export interface EntreeHistorique {
  episodeId: number;
  serieId: number;
  saison: number;
  numero: number;
  /** Date ISO complète du visionnage. */
  vuLe: string;
  note: number | null;
}

/** Un jour du journal, et ce qui y a été vu. */
export interface JourHistorique {
  /** Clé locale AAAA-MM-JJ. */
  jour: string;
  entrees: EntreeHistorique[];
}

/**
 * Jour LOCAL d'une date ISO, au format AAAA-MM-JJ.
 *
 * `new Date(iso)` interprète le fuseau, puis on lit les composantes locales :
 * un épisode coché le 3 à 23 h à Paris (soit le 3 à 22 h UTC) reste au 3.
 */
export function jourLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * Regroupe les épisodes par jour, du plus récent au plus ancien, et trie chaque
 * journée dans l'ordre de visionnage (le plus récent d'abord).
 *
 * Les dates invalides sont écartées plutôt que rangées sous un jour vide : un
 * import bancal ne doit pas créer une section fantôme en tête de journal.
 */
export function grouperParJour(entrees: EntreeHistorique[]): JourHistorique[] {
  const parJour = new Map<string, EntreeHistorique[]>();

  for (const e of entrees) {
    const jour = jourLocal(e.vuLe);
    if (!jour) continue;
    const liste = parJour.get(jour);
    if (liste) liste.push(e);
    else parJour.set(jour, [e]);
  }

  return [...parJour.entries()]
    .map(([jour, liste]) => ({
      jour,
      entrees: liste.sort((a, b) => b.vuLe.localeCompare(a.vuLe)),
    }))
    .sort((a, b) => b.jour.localeCompare(a.jour));
}

/**
 * Libellé lisible d'un jour : « Aujourd'hui », « Hier », puis la date.
 *
 * @param jour        Clé locale AAAA-MM-JJ.
 * @param maintenant  Injecté pour rester testable (et ne pas dépendre de l'heure
 *                    à laquelle tournent les tests).
 */
export function libelleJour(jour: string, maintenant: Date = new Date()): string {
  const auj = jourLocal(maintenant.toISOString());
  const hier = new Date(maintenant);
  hier.setDate(hier.getDate() - 1);

  if (jour === auj) return "Aujourd'hui";
  if (jour === jourLocal(hier.toISOString())) return 'Hier';

  // `T00:00:00` sans Z : interprété en heure locale, donc pas de décalage d'un
  // jour au moment de l'affichage.
  return new Date(`${jour}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
