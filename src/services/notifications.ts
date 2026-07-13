// =============================================================================
//  Service de notifications locales
//  ---------------------------------------------------------------------------
//  Planifie des rappels LOCAUX le jour de diffusion des prochains épisodes des
//  séries suivies. Tout se passe sur l'appareil (aucun serveur de push) : on
//  programme des notifications à partir des dates connues via TMDb.
//
//  La préférence d'activation est mémorisée localement (AsyncStorage) pour que
//  l'app sache s'il faut (re)programmer les rappels au fil des consultations.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ProchainEpisode } from '@/lib/tmdb';

// Affiche les notifications même lorsque l'app est ouverte au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Clé de préférence : "1" si l'utilisateur a activé les notifications. */
const CLE_ACTIVES = 'notifications_actives';
/** Heure de la journée (24h) à laquelle notifier, le jour de diffusion. */
const HEURE_NOTIF = 9;
/** iOS limite le nombre de notifications planifiées : on borne par prudence. */
const MAX_NOTIFS = 30;

/** Indique si l'utilisateur a activé les notifications. */
export async function notificationsActivees(): Promise<boolean> {
  return (await AsyncStorage.getItem(CLE_ACTIVES)) === '1';
}

/** Mémorise la préférence d'activation. */
async function definirActivees(actives: boolean): Promise<void> {
  await AsyncStorage.setItem(CLE_ACTIVES, actives ? '1' : '0');
}

/**
 * Demande (si nécessaire) la permission d'envoyer des notifications.
 * @returns true si la permission est accordée.
 */
export async function demanderPermissionNotifications(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const demande = await Notifications.requestPermissionsAsync();
  return demande.status === 'granted';
}

/**
 * Reprogramme entièrement les rappels : annule les notifications existantes puis
 * en planifie une par épisode à venir (le jour de diffusion, à HEURE_NOTIF).
 */
export async function reprogrammerNotificationsEpisodes(
  episodes: ProchainEpisode[]
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const maintenant = Date.now();
  let planifiees = 0;

  for (const ep of episodes) {
    if (planifiees >= MAX_NOTIFS) break;

    // Déclenchement : le jour de diffusion à HEURE_NOTIF (heure locale).
    const quand = new Date(`${ep.dateDiffusion}T00:00:00`);
    quand.setHours(HEURE_NOTIF, 0, 0, 0);
    if (quand.getTime() <= maintenant) continue; // épisode déjà diffusé aujourd'hui/passé

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Nouvel épisode de ${ep.serieTitre}`,
        body: `S${ep.saison}E${ep.numero} — ${ep.nom || 'nouvel épisode'} sort aujourd'hui !`,
      },
      trigger: { date: quand },
    });
    planifiees++;
  }
}

/**
 * Active les notifications : demande la permission, mémorise la préférence et
 * planifie les rappels. Renvoie false si la permission a été refusée.
 */
export async function activerNotifications(episodes: ProchainEpisode[]): Promise<boolean> {
  const ok = await demanderPermissionNotifications();
  if (!ok) {
    await definirActivees(false);
    return false;
  }
  await definirActivees(true);
  await reprogrammerNotificationsEpisodes(episodes);
  return true;
}

/** Désactive les notifications : annule les rappels et mémorise la préférence. */
export async function desactiverNotifications(): Promise<void> {
  await definirActivees(false);
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Reprogramme les rappels UNIQUEMENT si l'utilisateur les a activés.
 * Appelé quand la liste des prochains épisodes est recalculée (ex : Calendrier),
 * pour garder les notifications à jour après un ajout/retrait de série.
 */
export async function synchroniserNotifications(episodes: ProchainEpisode[]): Promise<void> {
  if (await notificationsActivees()) await reprogrammerNotificationsEpisodes(episodes);
}
