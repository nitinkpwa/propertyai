import { APP_VERSION, VERSION_RELOAD_GUARD_KEY } from "./version";
import {
  clearAreaIqLocalStorage,
  clearAreaIqSessionStorage,
  unregisterServiceWorkers,
} from "./storage";
import { logger } from "./logger";

const CHUNK_RECOVERY_KEY = "areaiq_chunk_recovery_v1";

/** Classic stale-deploy symptom: works in Incognito, dies in existing profile. */
export function isStaleAssetError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : String(error ?? "");

  const m = message.toLowerCase();
  return (
    m.includes("chunkloaderror") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("error loading dynamically imported module") ||
    m.includes("unexpected token '<'") || // HTML 404 returned as JS
    m.includes("mime type")
  );
}

/**
 * Purge AreaIQ client caches + SW, then hard-reload once.
 * Does NOT clear Supabase auth cookies.
 */
export async function recoverFromStaleAssets(reason: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (sessionStorage.getItem(CHUNK_RECOVERY_KEY) === APP_VERSION) {
      logger.warn("chunk", `Already attempted recovery for ${APP_VERSION}: ${reason}`);
      return false;
    }
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, APP_VERSION);
    sessionStorage.setItem(VERSION_RELOAD_GUARD_KEY, APP_VERSION);
  } catch {
    /* private mode — still try reload */
  }

  logger.error("chunk", `Stale asset recovery: ${reason}`);

  clearAreaIqLocalStorage({ keepVersion: false, keepAuth: true });
  clearAreaIqSessionStorage({ keepReloadGuard: true });
  await unregisterServiceWorkers();

  try {
    localStorage.setItem("areaiq_app_version", APP_VERSION);
  } catch {
    /* ignore */
  }

  window.location.reload();
  return true;
}
