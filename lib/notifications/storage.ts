import type { SmartNotification } from "./types";

const DISMISSED_KEY = "areaiq_smart_bar_dismissed";
const READ_KEY = "areaiq_smart_bar_read";
const BROADCAST_KEY = "areaiq_admin_broadcasts";
const BAR_HIDDEN_KEY = "areaiq_smart_bar_hidden_until";

/** Bump this when the announcement content/campaign changes — bar reappears. */
export const ANNOUNCEMENT_BAR_VERSION = "v1";

const ANNOUNCEMENT_DISMISSED_KEY = "areaiq_announcement_dismissed";
const ANNOUNCEMENT_VERSION_KEY = "areaiq_announcement_version";
const ANNOUNCEMENT_UNTIL_KEY = "areaiq_announcement_dismissed_until";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const list = safeParse<string[]>(localStorage.getItem(DISMISSED_KEY), []);
  return new Set(Array.isArray(list) ? list : []);
}

export function dismissNotification(id: string) {
  if (typeof window === "undefined") return;
  const next = getDismissedIds();
  next.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
}

export function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const list = safeParse<string[]>(localStorage.getItem(READ_KEY), []);
  return new Set(Array.isArray(list) ? list : []);
}

export function markNotificationReadLocal(id: string) {
  if (typeof window === "undefined") return;
  const next = getReadIds();
  next.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...next]));
}

export function markAllReadLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  const next = getReadIds();
  ids.forEach((id) => next.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...next]));
}

export function getStoredBroadcasts(): SmartNotification[] {
  if (typeof window === "undefined") return [];
  const list = safeParse<SmartNotification[]>(localStorage.getItem(BROADCAST_KEY), []);
  return Array.isArray(list) ? list : [];
}

export function saveBroadcasts(items: SmartNotification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BROADCAST_KEY, JSON.stringify(items));
}

export function addStoredBroadcast(item: SmartNotification) {
  const existing = getStoredBroadcasts();
  saveBroadcasts([item, ...existing].slice(0, 50));
}

export function removeStoredBroadcast(id: string) {
  saveBroadcasts(getStoredBroadcasts().filter((b) => b.id !== id));
}

/** Hide the entire bar until timestamp (legacy key — still cleared on read). */
export function hideBarUntil(ts: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BAR_HIDDEN_KEY, String(ts));
}

/**
 * Versioned announcement dismiss.
 * Hidden while dismissed=true AND stored version matches current version AND before until.
 * Changing ANNOUNCEMENT_BAR_VERSION shows the bar again automatically.
 */
export function isAnnouncementBarHidden(
  currentVersion: string = ANNOUNCEMENT_BAR_VERSION,
): boolean {
  if (typeof window === "undefined") return false;

  const storedVersion = localStorage.getItem(ANNOUNCEMENT_VERSION_KEY);
  if (storedVersion !== currentVersion) return false;

  if (localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY) !== "true") return false;

  const untilRaw = localStorage.getItem(ANNOUNCEMENT_UNTIL_KEY);
  if (untilRaw) {
    const until = Number(untilRaw);
    if (!Number.isNaN(until) && Date.now() > until) {
      localStorage.removeItem(ANNOUNCEMENT_DISMISSED_KEY);
      localStorage.removeItem(ANNOUNCEMENT_UNTIL_KEY);
      return false;
    }
  }

  return true;
}

export function dismissAnnouncementBar(
  currentVersion: string = ANNOUNCEMENT_BAR_VERSION,
): void {
  if (typeof window === "undefined") return;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, "true");
  localStorage.setItem(ANNOUNCEMENT_VERSION_KEY, currentVersion);
  localStorage.setItem(ANNOUNCEMENT_UNTIL_KEY, String(end.getTime()));
  // Keep legacy key in sync for older readers
  hideBarUntil(end.getTime());
}

export function isBarHidden(): boolean {
  if (typeof window === "undefined") return false;

  // Prefer versioned announcement dismiss
  if (isAnnouncementBarHidden()) return true;

  // Legacy fallback
  const raw = localStorage.getItem(BAR_HIDDEN_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (Number.isNaN(until)) return false;
  if (Date.now() > until) {
    localStorage.removeItem(BAR_HIDDEN_KEY);
    return false;
  }
  return true;
}

/** Hide for rest of day (and current announcement version). */
export function dismissBarForToday() {
  dismissAnnouncementBar();
}
