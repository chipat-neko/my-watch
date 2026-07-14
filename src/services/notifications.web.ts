// =============================================================================
//  Notifications (web)
//  ---------------------------------------------------------------------------
//  Les notifications locales programmées ne sont pas prises en charge sur le
//  navigateur. Ce fichier fournit la même API que notifications.ts, mais en
//  "no-op", pour que le reste de l'app fonctionne sans condition de plateforme.
// =============================================================================

import { ProchainEpisode } from '@/lib/tmdb';

export async function notificationsActivees(): Promise<boolean> {
  return false;
}

export async function demanderPermissionNotifications(): Promise<boolean> {
  return false;
}

export async function reprogrammerNotificationsEpisodes(
  _episodes: ProchainEpisode[]
): Promise<void> {
  // no-op sur le web
}

export async function activerNotifications(_episodes: ProchainEpisode[]): Promise<boolean> {
  return false;
}

export async function desactiverNotifications(): Promise<void> {
  // no-op sur le web
}

export async function synchroniserNotifications(_episodes: ProchainEpisode[]): Promise<void> {
  // no-op sur le web
}
