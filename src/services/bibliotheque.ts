// =============================================================================
//  Service "Bibliothèque"
//  ---------------------------------------------------------------------------
//  Regroupe toutes les opérations sur la liste personnelle de l'utilisateur
//  (ajouter/retirer un titre, changer son statut, noter) et sur les épisodes
//  marqués comme vus. Ces fonctions parlent directement à Supabase.
//
//  Remarque : la RLS (voir supabase/schema.sql) garantit côté serveur que
//  l'utilisateur n'accède qu'à ses propres données. On n'a donc pas besoin de
//  filtrer manuellement par utilisateur_id à la lecture.
// =============================================================================

import { supabase } from '@/lib/supabase';
import { EntreeBibliotheque, EpisodeVu, StatutSuivi, Titre, SourceEntree } from '@/types';

/**
 * Identifiant de l'utilisateur connecté, lu depuis la session LOCALE
 * (aucun appel réseau, contrairement à `getUser`). Suffisant pour écrire des
 * lignes protégées par RLS, qui revalide `auth.uid()` côté serveur.
 */
async function idUtilisateur(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Utilisateur non connecté.');
  return id;
}

// --- Conversion : ligne Supabase (snake_case) -> objet app (camelCase) -------
function versEntree(ligne: any): EntreeBibliotheque {
  return {
    id: ligne.id,
    utilisateurId: ligne.utilisateur_id,
    tmdbId: ligne.tmdb_id,
    type: ligne.type,
    titre: ligne.titre,
    cheminAffiche: ligne.chemin_affiche,
    statut: ligne.statut,
    notePerso: ligne.note_perso,
    source: ligne.source,
    ajouteLe: ligne.ajoute_le,
    vuLe: ligne.vu_le ?? null,
  };
}

/** Récupère toute la bibliothèque de l'utilisateur connecté. */
export async function chargerBibliotheque(): Promise<EntreeBibliotheque[]> {
  const { data, error } = await supabase
    .from('bibliotheque')
    .select('*')
    .order('ajoute_le', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(versEntree);
}

/**
 * Récupère l'entrée de bibliothèque correspondant à un titre précis,
 * ou null si l'utilisateur ne le suit pas encore.
 */
export async function entreePour(tmdbId: number, type: string): Promise<EntreeBibliotheque | null> {
  const { data, error } = await supabase
    .from('bibliotheque')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .eq('type', type)
    .maybeSingle();
  if (error) throw error;
  return data ? versEntree(data) : null;
}

/**
 * Ajoute un titre à la bibliothèque (ou ne fait rien s'il y est déjà).
 * @param titre     Le titre TMDb à suivre.
 * @param statut    Statut initial (par défaut "à voir").
 * @param source    Provenance de l'ajout (manuel par défaut).
 * @param vuLe      Date de visionnage à forcer (ISO), ex : date d'historique
 *                  lors d'un import. Si omise, le trigger côté base l'horodate
 *                  automatiquement quand le statut passe à "termine".
 */
export async function ajouterTitre(
  titre: Titre,
  statut: StatutSuivi = 'a_voir',
  source: SourceEntree = 'manuel',
  vuLe?: string | null
): Promise<void> {
  const utilisateurId = await idUtilisateur();

  // upsert : insère, ou ignore si la contrainte d'unicité existe déjà.
  const { error } = await supabase.from('bibliotheque').upsert(
    {
      utilisateur_id: utilisateurId,
      tmdb_id: titre.id,
      type: titre.type,
      titre: titre.titre,
      chemin_affiche: titre.cheminAffiche,
      statut,
      source,
      // Date de visionnage connue (ex : historique importé) ; sinon le trigger
      // côté base la renseignera automatiquement à la complétion.
      ...(vuLe ? { vu_le: vuLe } : {}),
    },
    { onConflict: 'utilisateur_id,tmdb_id,type', ignoreDuplicates: true }
  );
  if (error) throw error;
}

/** Change le statut de suivi d'une entrée existante. */
export async function changerStatut(entreeId: string, statut: StatutSuivi): Promise<void> {
  const { error } = await supabase.from('bibliotheque').update({ statut }).eq('id', entreeId);
  if (error) throw error;
}

/** Attribue une note personnelle (sur 10) à une entrée. */
export async function noter(entreeId: string, note: number | null): Promise<void> {
  const { error } = await supabase
    .from('bibliotheque')
    .update({ note_perso: note })
    .eq('id', entreeId);
  if (error) throw error;
}

/** Retire un titre de la bibliothèque. */
export async function retirerTitre(entreeId: string): Promise<void> {
  const { error } = await supabase.from('bibliotheque').delete().eq('id', entreeId);
  if (error) throw error;
}

// -----------------------------------------------------------------------------
//  Épisodes vus
// -----------------------------------------------------------------------------

function versEpisodeVu(ligne: any): EpisodeVu {
  return {
    id: ligne.id,
    utilisateurId: ligne.utilisateur_id,
    serieId: ligne.serie_id,
    episodeId: ligne.episode_id,
    saison: ligne.saison,
    numero: ligne.numero,
    note: ligne.note ?? null,
    vuLe: ligne.vu_le,
  };
}

/** Récupère les épisodes vus d'une série. */
export async function episodesVusDeLaSerie(serieId: number): Promise<EpisodeVu[]> {
  const { data, error } = await supabase.from('episodes_vus').select('*').eq('serie_id', serieId);
  if (error) throw error;
  return (data ?? []).map(versEpisodeVu);
}

/** Marque un épisode comme vu. */
export async function marquerEpisodeVu(
  serieId: number,
  episodeId: number,
  saison: number,
  numero: number
): Promise<void> {
  const utilisateurId = await idUtilisateur();

  const { error } = await supabase.from('episodes_vus').upsert(
    {
      utilisateur_id: utilisateurId,
      serie_id: serieId,
      episode_id: episodeId,
      saison,
      numero,
    },
    { onConflict: 'utilisateur_id,episode_id', ignoreDuplicates: true }
  );
  if (error) throw error;
}

/**
 * Attribue (ou efface avec `null`) la note personnelle d'un épisode. Noter un
 * épisode le marque implicitement comme vu (la ligne est créée si besoin).
 */
export async function noterEpisode(
  serieId: number,
  episodeId: number,
  saison: number,
  numero: number,
  note: number | null
): Promise<void> {
  const utilisateurId = await idUtilisateur();
  // Pas d'ignoreDuplicates ici : on veut bien METTRE À JOUR la note d'une ligne
  // existante. `vu_le` n'étant pas fourni, il est préservé (ou pris par défaut).
  const { error } = await supabase.from('episodes_vus').upsert(
    {
      utilisateur_id: utilisateurId,
      serie_id: serieId,
      episode_id: episodeId,
      saison,
      numero,
      note,
    },
    { onConflict: 'utilisateur_id,episode_id' }
  );
  if (error) throw error;
}

/** Statistiques simples affichées sur l'écran Profil. */
export interface Statistiques {
  nbSeries: number;
  nbFilms: number;
  nbEpisodesVus: number;
}

/**
 * Calcule quelques statistiques sur la bibliothèque de l'utilisateur.
 * (Compte les séries, les films, et le total d'épisodes vus.)
 */
export async function statistiques(): Promise<Statistiques> {
  const biblio = await chargerBibliotheque();
  // `count: 'exact', head: true` demande uniquement le nombre de lignes,
  // sans rapatrier les données (plus léger et plus rapide).
  const { count } = await supabase.from('episodes_vus').select('*', { count: 'exact', head: true });

  return {
    nbSeries: biblio.filter((e) => e.type === 'serie').length,
    nbFilms: biblio.filter((e) => e.type === 'film').length,
    nbEpisodesVus: count ?? 0,
  };
}

/** Annule le marquage "vu" d'un épisode. */
export async function demarquerEpisode(episodeId: number): Promise<void> {
  const utilisateurId = await idUtilisateur();

  const { error } = await supabase
    .from('episodes_vus')
    .delete()
    .eq('utilisateur_id', utilisateurId)
    .eq('episode_id', episodeId);
  if (error) throw error;
}
