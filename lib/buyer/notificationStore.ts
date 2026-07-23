/**
 * Buyer notifications store — cache, retries, offline, sticky unread badge.
 * Never throws to UI callers.
 */

import type { CrmNotification } from "@/lib/crm/types";
import {
  fetchUnreadNotificationCount,
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/crm/queries";

const CACHE_PREFIX = "areaiq_buyer_notifications_v1:";
const POLL_MS = 60_000;
const RETRY_DELAYS_MS = [2000, 5000];

export type NotificationFetchStatus =
  | "idle"
  | "loading"
  | "ok"
  | "empty"
  | "offline"
  | "error";

export interface NotificationSnapshot {
  notifications: CrmNotification[];
  unreadCount: number;
  status: NotificationFetchStatus;
  lastSyncedAt: string | null;
  offline: boolean;
}

type Listener = (snap: NotificationSnapshot) => void;

interface CachePayload {
  notifications: CrmNotification[];
  unreadCount: number;
  lastSyncedAt: string;
}

const listeners = new Map<string, Set<Listener>>();
const snapshots = new Map<string, NotificationSnapshot>();
const inflight = new Map<string, Promise<NotificationSnapshot>>();
const pollTimers = new Map<string, number>();
const onlineBound = { current: false };

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

function emptySnap(partial?: Partial<NotificationSnapshot>): NotificationSnapshot {
  return {
    notifications: [],
    unreadCount: 0,
    status: "idle",
    lastSyncedAt: null,
    offline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    ...partial,
  };
}

function readCache(userId: string): CachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed || !Array.isArray(parsed.notifications)) return null;
    return {
      notifications: sanitizeList(parsed.notifications),
      unreadCount:
        typeof parsed.unreadCount === "number" && Number.isFinite(parsed.unreadCount)
          ? Math.max(0, parsed.unreadCount)
          : 0,
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
    } as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(userId: string, payload: CachePayload) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch {
    /* quota / private */
  }
}

export function sanitizeNotification(row: unknown): CrmNotification | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  if (!id) return null;
  return {
    id,
    user_id: typeof r.user_id === "string" ? r.user_id : "",
    type: (typeof r.type === "string" ? r.type : "general") as CrmNotification["type"],
    title: typeof r.title === "string" && r.title.trim() ? r.title : "Notification",
    message: typeof r.message === "string" ? r.message : "",
    lead_id: typeof r.lead_id === "string" ? r.lead_id : null,
    property_id: typeof r.property_id === "string" ? r.property_id : null,
    read_at: typeof r.read_at === "string" ? r.read_at : null,
    created_at:
      typeof r.created_at === "string" && r.created_at
        ? r.created_at
        : new Date().toISOString(),
  };
}

export function sanitizeList(rows: unknown): CrmNotification[] {
  if (!Array.isArray(rows)) return [];
  const out: CrmNotification[] = [];
  for (const row of rows) {
    const n = sanitizeNotification(row);
    if (n) out.push(n);
  }
  return out;
}

function emit(userId: string, snap: NotificationSnapshot) {
  snapshots.set(userId, snap);
  const set = listeners.get(userId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(snap);
    } catch {
      /* listener must not break store */
    }
  }
}

function getSnap(userId: string): NotificationSnapshot {
  const existing = snapshots.get(userId);
  if (existing) return existing;

  const cached = readCache(userId);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  if (cached) {
    const snap = emptySnap({
      notifications: cached.notifications,
      unreadCount: cached.unreadCount,
      status: offline ? "offline" : cached.notifications.length ? "ok" : "empty",
      lastSyncedAt: cached.lastSyncedAt,
      offline,
    });
    snapshots.set(userId, snap);
    return snap;
  }

  const snap = emptySnap({
    status: offline ? "offline" : "loading",
    offline,
  });
  snapshots.set(userId, snap);
  return snap;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchOnce(userId: string): Promise<{
  notifications: CrmNotification[];
  unreadCount: number;
}> {
  const started = Date.now();
  console.info("[AreaIQ:notifications] fetch start", {
    userId,
    api: "crm_notifications",
    online: typeof navigator !== "undefined" ? navigator.onLine : null,
  });

  const [items, count] = await Promise.all([
    fetchUserNotifications(userId, 50),
    fetchUnreadNotificationCount(userId),
  ]);

  const notifications = sanitizeList(items);
  const unreadCount =
    typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0;

  console.info("[AreaIQ:notifications] fetch ok", {
    userId,
    api: "crm_notifications",
    count: notifications.length,
    unreadCount,
    durationMs: Date.now() - started,
  });

  return { notifications, unreadCount };
}

async function fetchWithRetry(userId: string): Promise<NotificationSnapshot> {
  const prev = getSnap(userId);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  if (offline) {
    const snap = emptySnap({
      notifications: prev.notifications,
      unreadCount: prev.unreadCount,
      status: "offline",
      lastSyncedAt: prev.lastSyncedAt,
      offline: true,
    });
    emit(userId, snap);
    return snap;
  }

  // Keep previous badge while refreshing
  emit(userId, {
    ...prev,
    status: prev.notifications.length || prev.lastSyncedAt ? prev.status : "loading",
    offline: false,
  });

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 5000);
        console.info("[AreaIQ:notifications] retry", { userId, attempt });
      }

      const { notifications, unreadCount } = await fetchOnce(userId);
      const lastSyncedAt = new Date().toISOString();
      writeCache(userId, { notifications, unreadCount, lastSyncedAt });

      const snap = emptySnap({
        notifications,
        unreadCount,
        status: notifications.length ? "ok" : "empty",
        lastSyncedAt,
        offline: false,
      });
      emit(userId, snap);
      return snap;
    } catch (err) {
      lastError = err;
      console.error("[AreaIQ:notifications] fetch failed", {
        userId,
        attempt,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }

  // Soft fail — keep previous data + badge
  const snap = emptySnap({
    notifications: prev.notifications,
    unreadCount: prev.unreadCount,
    status: prev.notifications.length || prev.lastSyncedAt ? prev.status : "empty",
    lastSyncedAt: prev.lastSyncedAt,
    offline: typeof navigator !== "undefined" && !navigator.onLine,
  });
  emit(userId, snap);
  console.warn("[AreaIQ:notifications] using cached/empty after retries", {
    userId,
    lastError: lastError instanceof Error ? lastError.message : String(lastError ?? ""),
    cachedCount: snap.notifications.length,
    unreadCount: snap.unreadCount,
  });
  return snap;
}

export function refreshBuyerNotifications(userId: string): Promise<NotificationSnapshot> {
  const existing = inflight.get(userId);
  if (existing) return existing;

  const promise = fetchWithRetry(userId).finally(() => {
    inflight.delete(userId);
  });
  inflight.set(userId, promise);
  return promise;
}

function ensurePolling(userId: string) {
  if (typeof window === "undefined") return;
  if (pollTimers.has(userId)) return;

  const id = window.setInterval(() => {
    void refreshBuyerNotifications(userId);
  }, POLL_MS);
  pollTimers.set(userId, id);

  if (!onlineBound.current) {
    onlineBound.current = true;
    window.addEventListener("online", () => {
      for (const uid of listeners.keys()) {
        void refreshBuyerNotifications(uid);
      }
    });
    window.addEventListener("offline", () => {
      for (const [uid, set] of listeners) {
        const prev = getSnap(uid);
        emit(uid, { ...prev, offline: true, status: "offline" });
        void set;
      }
    });
  }
}

function stopPollingIfUnused(userId: string) {
  const set = listeners.get(userId);
  if (set && set.size > 0) return;
  const timer = pollTimers.get(userId);
  if (timer != null) {
    window.clearInterval(timer);
    pollTimers.delete(userId);
  }
}

export function subscribeBuyerNotifications(
  userId: string,
  listener: Listener,
): () => void {
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(listener);

  const snap = getSnap(userId);
  listener(snap);

  ensurePolling(userId);
  void refreshBuyerNotifications(userId);

  return () => {
    set!.delete(listener);
    if (set!.size === 0) {
      listeners.delete(userId);
      stopPollingIfUnused(userId);
    }
  };
}

export async function markBuyerNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const prev = getSnap(userId);
  const nextList = prev.notifications.map((n) =>
    n.id === notificationId ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n,
  );
  const wasUnread = prev.notifications.some((n) => n.id === notificationId && !n.read_at);
  const nextUnread = wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount;
  const optimistic = emptySnap({
    ...prev,
    notifications: nextList,
    unreadCount: nextUnread,
  });
  emit(userId, optimistic);
  writeCache(userId, {
    notifications: nextList,
    unreadCount: nextUnread,
    lastSyncedAt: prev.lastSyncedAt ?? new Date().toISOString(),
  });

  const ok = await markNotificationRead(notificationId);
  if (!ok) {
    void refreshBuyerNotifications(userId);
  }
}

export async function markAllBuyerNotificationsRead(userId: string): Promise<void> {
  const prev = getSnap(userId);
  const now = new Date().toISOString();
  const nextList = prev.notifications.map((n) => ({
    ...n,
    read_at: n.read_at ?? now,
  }));
  emit(
    userId,
    emptySnap({
      ...prev,
      notifications: nextList,
      unreadCount: 0,
    }),
  );
  writeCache(userId, {
    notifications: nextList,
    unreadCount: 0,
    lastSyncedAt: prev.lastSyncedAt ?? now,
  });

  const ok = await markAllNotificationsRead(userId);
  if (!ok) {
    void refreshBuyerNotifications(userId);
  }
}

/** Call after buyer actions that may create notifications. */
export function invalidateBuyerNotifications(userId?: string | null) {
  if (!userId) return;
  void refreshBuyerNotifications(userId);
}
