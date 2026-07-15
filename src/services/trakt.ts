// =============================================================================
//  Service Trakt.tv
//  ---------------------------------------------------------------------------
//  Connexion via le "device flow" OAuth (pas de navigateur intégré, idéal en
//  mobile), stockage sécurisé des jetons, et synchronisation de l'historique
//  "vu" + des notes depuis Trakt vers la bibliothèque My Watch.
//
//  Les titres sont résolus via leur id TMDb (fourni par Trakt) : c'est plus
//  fiable que l'import CSV, qui doit deviner le titre par recherche.
//
//  Périmètre v1 : import Trakt -> My Watch (séries/films + notes de titres).
//  Hors périmètre (évolutions) : épisodes vus détaillés (Trakt ne fournit pas
//  l'id TMDb par épisode), notes d'épisodes, et envoi My Watch -> Trakt.
// =============================================================================

import { getItem, setItem, supprimerItem } from '@/lib/stockageSecurise';
import { detailsTitre } from '@/lib/tmdb';
import { ajouterTitre, entreePour, noter } from '@/services/bibliotheque';
import { avecReessais, enParallele } from '@/services/async';
import {
  mapperWatched,
  mapperNotes,
  appliquerNotes,
  TraktWatchedShow,
  TraktWatchedMovie,
  TraktRating,
  TitreTrakt,
  cleTraktValide,
} from '@/services/traktMapping';

export { cleTraktValide };

const BASE = 'https://api.trakt.tv';
const CLIENT_ID = process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_TRAKT_CLIENT_SECRET ?? '';
const CLE_JETON = 'trakt_jeton'; // clé de stockage SecureStore
const CONCURRENCE = 5; // résolutions TMDb en parallèle pendant la synchro

interface JetonTrakt {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  created_at: number;
}

// --- Configuration / état ----------------------------------------------------

/** Vrai si les identifiants d'application Trakt sont réellement renseignés (.env). */
export function traktConfigure(): boolean {
  return cleTraktValide(CLIENT_ID) && cleTraktValide(CLIENT_SECRET);
}

async function chargerJeton(): Promise<JetonTrakt | null> {
  const brut = await getItem(CLE_JETON);
  return brut ? (JSON.parse(brut) as JetonTrakt) : null;
}

async function sauverJeton(jeton: JetonTrakt): Promise<void> {
  await setItem(CLE_JETON, JSON.stringify(jeton));
}

/** Indique si un compte Trakt est actuellement connecté. */
export async function estConnecteTrakt(): Promise<boolean> {
  return (await chargerJeton()) !== null;
}

/** Déconnecte le compte Trakt (efface les jetons locaux). */
export async function deconnecterTrakt(): Promise<void> {
  await supprimerItem(CLE_JETON);
}

// --- Device flow -------------------------------------------------------------

export interface CodeAppareil {
  deviceCode: string;
  userCode: string;
  url: string;
  interval: number; // secondes entre deux sondages
  expiresIn: number; // secondes avant expiration
}

/** Étape 1 : demande un code d'appairage à présenter à l'utilisateur. */
export async function demarrerAppairage(): Promise<CodeAppareil> {
  const reponse = await fetch(`${BASE}/oauth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID }),
  });
  if (!reponse.ok) throw new Error('Impossible de démarrer la connexion Trakt.');
  const d = await reponse.json();
  return {
    deviceCode: d.device_code,
    userCode: d.user_code,
    url: d.verification_url,
    interval: d.interval,
    expiresIn: d.expires_in,
  };
}

export type EtatSondage = 'en_attente' | 'ok' | 'refuse' | 'expire';

/**
 * Étape 2 : sonde une fois si l'utilisateur a autorisé l'appairage. À appeler en
 * boucle toutes les `interval` secondes jusqu'à un état différent de "en_attente".
 */
export async function sonderAppairage(deviceCode: string): Promise<EtatSondage> {
  const reponse = await fetch(`${BASE}/oauth/device/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: deviceCode,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (reponse.status === 200) {
    const d = await reponse.json();
    await sauverJeton({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_in: d.expires_in,
      created_at: d.created_at,
    });
    return 'ok';
  }
  // 400 = en attente d'autorisation ; 429 = sonder moins vite -> on patiente.
  if (reponse.status === 400 || reponse.status === 429) return 'en_attente';
  if (reponse.status === 418) return 'refuse'; // refusé explicitement
  return 'expire'; // 404 / 409 / 410 -> recommencer l'appairage
}

// --- Appels API authentifiés -------------------------------------------------

async function rafraichirJeton(jeton: JetonTrakt): Promise<JetonTrakt> {
  const reponse = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: jeton.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      grant_type: 'refresh_token',
    }),
  });
  if (!reponse.ok) throw new Error('Session Trakt expirée, reconnecte-toi.');
  const d = await reponse.json();
  const nouveau: JetonTrakt = {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_in: d.expires_in,
    created_at: d.created_at,
  };
  await sauverJeton(nouveau);
  return nouveau;
}

/** GET authentifié Trakt, avec rafraîchissement automatique du jeton sur 401. */
async function getTrakt<T>(chemin: string): Promise<T> {
  let jeton = await chargerJeton();
  if (!jeton) throw new Error('Non connecté à Trakt.');

  const faire = (acces: string) =>
    fetch(`${BASE}${chemin}`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': CLIENT_ID,
        Authorization: `Bearer ${acces}`,
      },
    });

  let reponse = await faire(jeton.access_token);
  if (reponse.status === 401) {
    jeton = await rafraichirJeton(jeton);
    reponse = await faire(jeton.access_token);
  }
  if (!reponse.ok) throw new Error(`Erreur Trakt ${reponse.status} sur ${chemin}`);
  return (await reponse.json()) as T;
}

// --- Synchronisation ---------------------------------------------------------

export interface ResultatSyncTrakt {
  importes: number;
  echecs: number;
}

/**
 * Importe l'historique vu (séries + films) et les notes de titres depuis Trakt
 * vers la bibliothèque. Chaque titre est résolu via son id TMDb puis ajouté ;
 * un titre déjà présent n'est pas écrasé (mais sa note Trakt est appliquée).
 *
 * @param onProgress  Callback (traités, total) pour une barre de progression.
 */
export async function synchroniserDepuisTrakt(
  onProgress?: (traites: number, total: number) => void
): Promise<ResultatSyncTrakt> {
  const [shows, movies, ratings] = await Promise.all([
    getTrakt<TraktWatchedShow[]>('/sync/watched/shows'),
    getTrakt<TraktWatchedMovie[]>('/sync/watched/movies'),
    getTrakt<TraktRating[]>('/sync/ratings').catch(() => [] as TraktRating[]),
  ]);

  const titres = appliquerNotes(mapperWatched(shows, movies), mapperNotes(ratings));

  const resultat: ResultatSyncTrakt = { importes: 0, echecs: 0 };
  let traites = 0;

  await enParallele(titres, CONCURRENCE, async (t: TitreTrakt) => {
    try {
      // On a le tmdbId : résolution directe (titre localisé + affiche).
      const titre = await avecReessais(() => detailsTitre(t.tmdbId, t.type));
      await ajouterTitre(titre, t.statut, 'import_trakt');
      if (t.note !== null) {
        const entree = await entreePour(t.tmdbId, t.type);
        if (entree) await noter(entree.id, t.note);
      }
      resultat.importes++;
    } catch {
      resultat.echecs++;
    } finally {
      traites++;
      onProgress?.(traites, titres.length);
    }
  });

  return resultat;
}
