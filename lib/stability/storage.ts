import { AREAIQ_STORAGE_PREFIX } from "./version";

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
] as const;

export const AREAIQ_SESSION_KEYS = [
  "areaiq_intel_platform_stats_v2",
  "areaiq_pending_auth_intent_v1",
  "areaiq_pricing_normalized_v1",
  "areaiq_version_reload_guard",
] as const;

function isAreaIqKey(key: string): boolean {
  return (
    key.startsWith(AREAIQ_STORAGE_PREFIX) ||
    key.startsWith("areaiq-") ||
    key.startsWith("areaiq_") ||
    key.startsWith("sb-") // stale supabase local leftovers if any
  );
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

/** Remove every AreaIQ-owned localStorage key (and leftover sb-*). */
export function clearAreaIqLocalStorage(options?: { keepVersion?: boolean }) {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (options?.keepVersion && key === "areaiq_app_version") continue;
      // Keep admin property drafts unless full wipe — drafts are long form work
      if (key.startsWith("areaiq-admin-property-draft")) continue;
      if (isAreaIqKey(key) || AREAIQ_LOCAL_KEYS.includes(key as (typeof AREAIQ_LOCAL_KEYS)[number])) {
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
      if (isAreaIqKey(key) || AREAIQ_SESSION_KEYS.includes(key as (typeof AREAIQ_SESSION_KEYS)[number])) {
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
          .filter((n) => n.toLowerCase().includes("areaiq") || n.toLowerCase().includes("next"))
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
}
