import { AREAIQ_STORAGE_PREFIX, APP_VERSION_STORAGE_KEY } from "./version";

/** Known AreaIQ storage keys (for documentation + selective wipe). */
export const AREAIQ_LOCAL_KEYS = [
  "areaiq_app_version",
  "areaiq_tribute_seen",
  "areaiq_pending_auth_intent_v1",
  "areaiq_smart_bar_dismissed",
  "areaiq_smart_bar_read",
  "areaiq_admin_broadcasts",
  "areaiq_smart_bar_hidden_until",
  "areaiq_intel_history_v1",
  "areaiq_recent_searches",
  "areaiq-recent-searches-v1",
  "areaiq-guest-conversations-v1",
  "areaiq-active-conversation-id",
  "areaiq_buyer_collections",
  "areaiq_buyer_saved_notes",
  "areaiq_stability_v1_migrated",
  "areaiq_chunk_recovery_v1",
] as const;

export const AREAIQ_SESSION_KEYS = [
  "areaiq_intel_platform_stats_v2",
  "areaiq_pending_auth_intent_v1",
  "areaiq_pricing_normalized_v1",
  "areaiq_version_reload_guard",
  "areaiq_chunk_recovery_v1",
] as const;

function isAreaIqCacheKey(key: string): boolean {
  return (
    key.startsWith(AREAIQ_STORAGE_PREFIX) ||
    key.startsWith("areaiq-") ||
    key.startsWith("areaiq_")
  );
}

/** Legacy supabase-js localStorage tokens — safe to drop; SSR auth uses cookies. */
function isLegacySupabaseLocalKey(key: string): boolean {
  return key.startsWith("sb-") && key.includes("auth");
}

function safeRemoveLocal(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

function safeRemoveSession(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

export interface ClearLocalOptions {
  keepVersion?: boolean;
  /** When true (default on version upgrade), never touch auth cookies; only drop legacy sb-* local leftovers if keepAuth=false */
  keepAuth?: boolean;
}

/**
 * Remove AreaIQ-owned localStorage keys.
 * By default keeps Supabase auth intact (cookies + optional local tokens).
 */
export function clearAreaIqLocalStorage(options?: ClearLocalOptions) {
  if (typeof window === "undefined") return;
  const keepVersion = options?.keepVersion ?? false;
  const keepAuth = options?.keepAuth ?? true;

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (keepVersion && key === APP_VERSION_STORAGE_KEY) continue;
      // Keep admin property drafts — long-form work
      if (key.startsWith("areaiq-admin-property-draft")) continue;

      if (isLegacySupabaseLocalKey(key)) {
        if (!keepAuth) safeRemoveLocal(key);
        continue;
      }

      if (
        isAreaIqCacheKey(key) ||
        AREAIQ_LOCAL_KEYS.includes(key as (typeof AREAIQ_LOCAL_KEYS)[number])
      ) {
        safeRemoveLocal(key);
      }
    }
  } catch {
    /* quota / private */
  }
}

/** Clear all sessionStorage entries owned by AreaIQ. */
export function clearAreaIqSessionStorage(options?: { keepReloadGuard?: boolean }) {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (options?.keepReloadGuard && key === "areaiq_version_reload_guard") continue;
      if (
        isAreaIqCacheKey(key) ||
        AREAIQ_SESSION_KEYS.includes(key as (typeof AREAIQ_SESSION_KEYS)[number])
      ) {
        safeRemoveSession(key);
      }
    }
  } catch {
    /* private */
  }
}

/** Unregister all service workers (stale PWA caches). */
export async function unregisterServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (n) =>
              n.toLowerCase().includes("areaiq") ||
              n.toLowerCase().includes("next") ||
              n.toLowerCase().includes("workbox"),
          )
          .map((n) => caches.delete(n)),
      );
    }
  } catch {
    /* ignore */
  }
}

/**
 * Parse JSON from storage; return fallback if invalid.
 * Never throws.
 */
export function readJsonStorage<T>(
  raw: string | null,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** Soft purge of clearly corrupt AreaIQ JSON blobs (non-destructive for valid data). */
export function sanitizeAreaIqStorage() {
  if (typeof window === "undefined") return;

  const localCandidates = [
    "areaiq_admin_broadcasts",
    "areaiq_intel_history_v1",
    "areaiq_smart_bar_dismissed",
    "areaiq_smart_bar_read",
    "areaiq_recent_searches",
    "areaiq-recent-searches-v1",
    "areaiq-guest-conversations-v1",
    "areaiq_buyer_collections",
    "areaiq_buyer_saved_notes",
    "areaiq_pending_auth_intent_v1",
  ];

  for (const key of localCandidates) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) continue;
      JSON.parse(raw);
    } catch {
      safeRemoveLocal(key);
    }
  }

  try {
    const hidden = localStorage.getItem("areaiq_smart_bar_hidden_until");
    if (hidden != null && Number.isNaN(Number(hidden))) {
      safeRemoveLocal("areaiq_smart_bar_hidden_until");
    }
  } catch {
    /* ignore */
  }

  // Drop orphaned legacy supabase-js local tokens (SSR uses cookies)
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (isLegacySupabaseLocalKey(key)) {
        safeRemoveLocal(key);
      }
    }
  } catch {
    /* ignore */
  }
}

/** Snapshot of browser storage keys for /debug (values redacted). */
export function listStorageKeys(): {
  local: string[];
  session: string[];
  cookieNames: string[];
} {
  const local: string[] = [];
  const session: string[] = [];
  const cookieNames: string[] = [];

  if (typeof window === "undefined") {
    return { local, session, cookieNames };
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) local.push(key);
    }
  } catch {
    /* ignore */
  }

  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) session.push(key);
    }
  } catch {
    /* ignore */
  }

  try {
    cookieNames.push(
      ...document.cookie
        .split(";")
        .map((c) => c.trim().split("=")[0] ?? "")
        .filter(Boolean),
    );
  } catch {
    /* ignore */
  }

  return { local: local.sort(), session: session.sort(), cookieNames: cookieNames.sort() };
}
