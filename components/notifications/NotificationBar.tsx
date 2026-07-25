"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRegisterChrome } from "@/components/layout/engine";
import {
  useNotificationRotation,
  useSmartNotifications,
} from "@/lib/notifications/hooks";
import { ROTATE_MS, SMART_BAR_HEIGHT_PX } from "@/lib/notifications/types";
import { zClass } from "@/lib/layout/zIndex";
import MarketTicker from "./MarketTicker";
import PersonalUpdates from "./PersonalUpdates";
import NotificationDrawer from "./NotificationDrawer";
import NotificationBarBell from "./NotificationBarBell";

interface NotificationBarProps {
  variant?: "fixed" | "sticky" | "inline";
  /** @deprecated Use layout engine top-chrome; kept for call-site compat */
  topOffsetClassName?: string;
  className?: string;
  visible?: boolean;
}

/**
 * Smart Intelligence Bar — one verified signal at a time.
 * Rotates only within the highest priority band. Never invents data.
 */
export default function NotificationBar({
  variant = "fixed",
  topOffsetClassName = "top-chrome",
  className = "",
  visible = true,
}: NotificationBarProps) {
  const router = useRouter();
  const {
    items,
    drawerItems,
    unreadCount,
    isLoggedIn,
    showBar,
    drawerOpen,
    setDrawerOpen,
    dismiss,
    markRead,
    markAllRead,
    hideBar,
    onDisplay,
  } = useSmartNotifications();

  useRegisterChrome(
    "notification",
    SMART_BAR_HEIGHT_PX,
    Boolean(visible && showBar),
    "smart-notification-bar",
  );

  const [paused, setPaused] = useState(false);
  const { current, goNext, goPrev } = useNotificationRotation(
    items,
    ROTATE_MS,
    paused || drawerOpen,
  );

  useEffect(() => {
    if (current) onDisplay(current);
  }, [current, onDisplay]);

  const drawer = (
    <NotificationDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      items={drawerItems}
      unreadCount={unreadCount}
      onSelect={(item) => {
        markRead(item.id);
        setDrawerOpen(false);
        if (item.href) router.push(item.href);
      }}
      onMarkAllRead={markAllRead}
      onDismiss={dismiss}
    />
  );

  if (!visible || !showBar || !current) {
    return drawer;
  }

  const positionClass =
    variant === "fixed"
      ? `fixed inset-x-0 ${zClass.nav} ${topOffsetClassName}`
      : variant === "sticky"
        ? `sticky ${zClass.sticky} top-chrome`
        : "relative z-layout-sticky w-full";

  const handleActivate = () => {
    markRead(current.id);
    if (current.href) router.push(current.href);
    else setDrawerOpen(true);
  };

  return (
    <>
      <div
        className={`${positionClass} border-b border-brand-border/80 bg-brand-muted/95 backdrop-blur-md ${className}`}
        style={{ height: SMART_BAR_HEIGHT_PX }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-label="AreaIQ market intelligence"
        aria-live="polite"
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <span className="relative hidden h-2 w-2 shrink-0 sm:inline-flex" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>

          <button
            type="button"
            onClick={handleActivate}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {isLoggedIn ? (
              <PersonalUpdates item={current} onSwipeLeft={goNext} onSwipeRight={goPrev} />
            ) : (
              <MarketTicker item={current} onSwipeLeft={goNext} onSwipeRight={goPrev} />
            )}
          </button>

          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100/80"
            >
              View All
              <span aria-hidden className="ml-0.5">
                →
              </span>
            </button>
            <button
              type="button"
              onClick={hideBar}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-800/70 transition hover:bg-emerald-100/80 hover:text-emerald-900"
              aria-label="Dismiss bar for today"
              title="Dismiss for today"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
            <NotificationBarBell
              unreadCount={unreadCount}
              onClick={() => setDrawerOpen(true)}
            />
          </div>

          <div className="flex shrink-0 sm:hidden">
            <NotificationBarBell
              unreadCount={unreadCount}
              onClick={() => setDrawerOpen(true)}
            />
          </div>
        </div>

        {items.length > 1 ? (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center gap-1 pb-0.5"
            aria-hidden
          >
            <motion.div
              key={current.id}
              className="h-0.5 w-8 rounded-full bg-brand/50"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
              style={{ originX: 0 }}
            />
          </div>
        ) : null}
      </div>

      {variant === "fixed" ? (
        <div aria-hidden style={{ height: SMART_BAR_HEIGHT_PX }} />
      ) : null}

      {drawer}
    </>
  );
}

export function NotificationBarViewAllLink() {
  return (
    <Link href="/buyer/notifications" className="text-xs font-semibold text-emerald-700">
      View all
    </Link>
  );
}
