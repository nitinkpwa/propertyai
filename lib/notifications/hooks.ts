"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { runIntelligenceEngine } from "./engine";
import { recordIntelligenceSeen } from "./engine/history";
import { countUnread } from "./service";
import {
  dismissBarForToday,
  dismissNotification,
  isBarHidden,
  markAllReadLocal,
  markNotificationReadLocal,
} from "./storage";
import type { IntelligenceNotification } from "./types";
import { ROTATE_MS, SMART_BAR_HEIGHT_PX } from "./types";

const CSS_VAR = "--smart-bar-h";
const REFRESH_MS = 90_000;

export function useSmartNotifications() {
  const { user, profile, loading: authLoading } = useAuth();
  const isLoggedIn = Boolean(user);
  const [queue, setQueue] = useState<IntelligenceNotification[]>([]);
  const [all, setAll] = useState<IntelligenceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setHidden(isBarHidden());
  }, []);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    try {
      const result = await runIntelligenceEngine({
        isLoggedIn,
        userId: user?.id,
        profile: profile ?? null,
      });
      setQueue(result.queue);
      setAll(result.all);
    } catch (error) {
      console.error("Intelligence engine:", error);
      setQueue([]);
      setAll([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isLoggedIn, user?.id, profile]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh, revision]);

  const items = useMemo(() => queue, [queue]);
  const drawerItems = useMemo(() => all, [all]);

  const unreadCount = useMemo(
    () => countUnread(all, isLoggedIn),
    [all, isLoggedIn],
  );

  const dismiss = useCallback((id: string) => {
    dismissNotification(id);
    setRevision((r) => r + 1);
  }, []);

  const markRead = useCallback((id: string) => {
    markNotificationReadLocal(id);
    setAll((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    setQueue((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  }, []);

  const markAllRead = useCallback(() => {
    markAllReadLocal(all.map((i) => i.id));
    setRevision((r) => r + 1);
  }, [all]);

  const hideBar = useCallback(() => {
    dismissBarForToday();
    setHidden(true);
  }, []);

  const showBar = !authLoading && !loading && !hidden && items.length > 0;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(CSS_VAR, showBar ? `${SMART_BAR_HEIGHT_PX}px` : "0px");
    return () => {
      root.style.setProperty(CSS_VAR, "0px");
    };
  }, [showBar]);

  const onDisplay = useCallback((item: IntelligenceNotification) => {
    recordIntelligenceSeen(item);
  }, []);

  return {
    items,
    drawerItems,
    unreadCount,
    isLoggedIn,
    authLoading: authLoading || loading,
    showBar,
    drawerOpen,
    setDrawerOpen,
    dismiss,
    markRead,
    markAllRead,
    hideBar,
    refresh,
    onDisplay,
  };
}

export type SmartNotificationsApi = ReturnType<typeof useSmartNotifications>;

export function useNotificationRotation(
  items: IntelligenceNotification[],
  intervalMs: number = ROTATE_MS,
  paused = false,
) {
  const [index, setIndex] = useState(0);

  const itemIds = items.map((i) => i.id).join("|");

  useEffect(() => {
    setIndex(0);
  }, [itemIds]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, items.length, intervalMs, itemIds]);

  const current = items[index] ?? items[0] ?? null;
  const goNext = useCallback(() => {
    if (items.length === 0) return;
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);
  const goPrev = useCallback(() => {
    if (items.length === 0) return;
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  return { current, index, goNext, goPrev, setIndex };
}
