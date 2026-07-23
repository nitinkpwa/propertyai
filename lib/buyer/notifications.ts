"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrmNotification } from "@/lib/crm/types";
import {
  invalidateBuyerNotifications,
  markAllBuyerNotificationsRead,
  markBuyerNotificationRead,
  refreshBuyerNotifications,
  subscribeBuyerNotifications,
  type NotificationFetchStatus,
  type NotificationSnapshot,
} from "@/lib/buyer/notificationStore";

export { invalidateBuyerNotifications };

const EMPTY: NotificationSnapshot = {
  notifications: [],
  unreadCount: 0,
  status: "idle",
  lastSyncedAt: null,
  offline: false,
};

export function useBuyerNotifications(userId: string | undefined) {
  const [snap, setSnap] = useState<NotificationSnapshot>(() =>
    userId
      ? {
          ...EMPTY,
          status: "loading",
        }
      : EMPTY,
  );

  useEffect(() => {
    if (!userId) {
      setSnap(EMPTY);
      return;
    }
    return subscribeBuyerNotifications(userId, setSnap);
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await refreshBuyerNotifications(userId);
  }, [userId]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      await markBuyerNotificationRead(userId, id);
    },
    [userId],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllBuyerNotificationsRead(userId);
  }, [userId]);

  return {
    notifications: snap.notifications,
    unreadCount: snap.unreadCount,
    loading: snap.status === "loading" || snap.status === "idle",
    /** Never surface technical errors to UI — soft status only */
    error: null as string | null,
    status: snap.status as NotificationFetchStatus,
    offline: snap.offline,
    lastSyncedAt: snap.lastSyncedAt,
    refresh,
    markRead,
    markAllRead,
  };
}

export function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return Promise.resolve("denied" as NotificationPermission);
    }
    if (Notification.permission === "granted") return Promise.resolve("granted");
    if (Notification.permission === "denied") return Promise.resolve("denied");
    return Notification.requestPermission().catch(
      () => "denied" as NotificationPermission,
    );
  } catch {
    return Promise.resolve("denied" as NotificationPermission);
  }
}

export function showBrowserNotification(title: string, body: string, href?: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const safeTitle = typeof title === "string" && title.trim() ? title : "AreaIQ";
    const safeBody = typeof body === "string" ? body : "";

    const notification = new Notification(safeTitle, {
      body: safeBody,
      icon: "/android-chrome-192x192.png",
      tag: `areaiq-${Date.now()}`,
    });

    if (href) {
      notification.onclick = () => {
        window.focus();
        window.location.href = href;
      };
    }
  } catch {
    /* browser notification blocked / unsupported */
  }
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case "site_visit_accepted":
      return "✅";
    case "site_visit_rejected":
      return "❌";
    case "site_visit_booked":
      return "📅";
    case "property_saved":
      return "❤️";
    case "new_inquiry":
      return "📩";
    default:
      return "🔔";
  }
}

export function groupNotificationsByDate(
  notifications: CrmNotification[] | null | undefined,
): { label: string; items: CrmNotification[] }[] {
  try {
    const list = Array.isArray(notifications) ? notifications.filter(Boolean) : [];
    if (list.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: Record<string, CrmNotification[]> = {};

    for (const n of list) {
      if (!n || typeof n !== "object") continue;
      let label = "Earlier";
      try {
        const raw = n.created_at;
        const d = raw ? new Date(raw) : null;
        if (d && !Number.isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          if (d.getTime() === today.getTime()) label = "Today";
          else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
          else {
            label = d.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          }
        }
      } catch {
        label = "Earlier";
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    }

    return Object.entries(groups).map(([label, items]) => ({ label, items }));
  } catch {
    return [];
  }
}
