import {
  APP_VERSION,
  APP_VERSION_STORAGE_KEY,
  VERSION_RELOAD_GUARD_KEY,
} from "./version";
import {
  clearAreaIqLocalStorage,
  clearAreaIqSessionStorage,
  sanitizeAreaIqStorage,
  unregisterServiceWorkers,
} from "./storage";
import { logger } from "./logger";

export type VersionCheckResult =
  | { status: "ok"; version: string }
  | { status: "upgraded"; previous: string | null; version: string; reloading: boolean }
  | { status: "skipped" };

const LEGACY_MIGRATION_KEY = "areaiq_stability_v1_migrated";

/** Ephemeral / cache keys safe to drop without wiping user drafts or guest chat history. */
const EPHEMERAL_LOCAL_KEYS = [
  "areaiq_smart_bar_dismissed",
  "areaiq_smart_bar_read",
  "areaiq_smart_bar_hidden_until",
  "areaiq_intel_history_v1",
  "areaiq_admin_broadcasts",
];

function clearEphemeralLocal() {
  for (const key of EPHEMERAL_LOCAL_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

async function performUpgradeReload(previous: string | null): Promise<VersionCheckResult> {
  let alreadyReloading = false;
  try {
    alreadyReloading = sessionStorage.getItem(VERSION_RELOAD_GUARD_KEY) === APP_VERSION;
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.setItem(VERSION_RELOAD_GUARD_KEY, APP_VERSION);
  } catch {
    /* ignore */
  }

  await unregisterServiceWorkers();

  try {
    localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
    localStorage.setItem(LEGACY_MIGRATION_KEY, "1");
  } catch {
    /* ignore */
  }

  if (!alreadyReloading) {
    logger.warn(
      "version",
      `Recovering client state (previous=${previous ?? "legacy"}) → ${APP_VERSION}`,
    );
    window.location.reload();
    return {
      status: "upgraded",
      previous,
      version: APP_VERSION,
      reloading: true,
    };
  }

  try {
    sessionStorage.removeItem(VERSION_RELOAD_GUARD_KEY);
  } catch {
    /* ignore */
  }

  return {
    status: "upgraded",
    previous,
    version: APP_VERSION,
    reloading: false,
  };
}

/**
 * Compare deployed APP_VERSION with stored client version.
 * On mismatch (or first migration from pre-version clients):
 * purge AreaIQ caches only (NOT auth cookies), unregister SWs, reload once.
 */
export async function runVersionGuard(): Promise<VersionCheckResult> {
  if (typeof window === "undefined") return { status: "skipped" };

  let stored: string | null = null;
  let migrated = false;
  try {
    stored = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    migrated = localStorage.getItem(LEGACY_MIGRATION_KEY) === "1";
  } catch {
    return { status: "skipped" };
  }

  // Pre-stability clients: one-time soft recovery (fixes "works in incognito only")
  if (!stored && !migrated) {
    sanitizeAreaIqStorage();
    clearEphemeralLocal();
    clearAreaIqSessionStorage({ keepReloadGuard: true });
    // Keep auth — only AreaIQ caches
    clearAreaIqLocalStorage({ keepAuth: true });
    return performUpgradeReload(null);
  }

  // First visit after migration flag somehow without version — stamp quietly
  if (!stored) {
    sanitizeAreaIqStorage();
    try {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
      localStorage.setItem(LEGACY_MIGRATION_KEY, "1");
    } catch {
      /* ignore */
    }
    return { status: "ok", version: APP_VERSION };
  }

  if (stored === APP_VERSION) {
    sanitizeAreaIqStorage();
    return { status: "ok", version: APP_VERSION };
  }

  // Full version mismatch — wipe AreaIQ-owned storage, keep auth cookies
  clearAreaIqLocalStorage({ keepAuth: true });
  clearAreaIqSessionStorage({ keepReloadGuard: true });
  return performUpgradeReload(stored);
}
