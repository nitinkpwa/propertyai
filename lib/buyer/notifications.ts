"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchUnreadNotificationCount,
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/crm/queries";
import type { CrmNotification } from "@/lib/crm/types";

const POLL_INTERVAL_MS = 60_000;

export function useBuyerNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setError(null);
      const [items, count] = await Promise.all([
        fetchUserNotifications(userId, 50),
        fetchUnreadNotificationCount(userId),
      ]);
      setNotifications(Array.isArray(items) ? items : []);
      setUnreadCount(typeof count === "number" ? count : 0);
    } catch {
      setError("Unable to load notifications right now.");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(timer);
      clearInterval(interval);
    };
  }, [userId, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      const ok = await markNotificationRead(id);
      if (ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const ok = await markAllNotificationsRead(userId);
    if (ok) {
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
      setUnreadCount(0);
    }
  }, [userId]);

  return { notifications, unreadCount, loading, error, refresh, markRead, markAllRead };
}

export function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("denied" as NotificationPermission);
  }
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string, href?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body,
    icon: "/android-chrome-192x192.png",
    tag: `areaiq-${Date.now()}`,
  });

  if (href) {
    notification.onclick = () => {
      window.focus();
      window.location.href = href;
    };
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
  notifications: CrmNotification[],
): { label: string; items: CrmNotification[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, CrmNotification[]> = {};

  for (const n of notifications) {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}
