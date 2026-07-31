"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useChromeElement } from "@/components/layout/engine";
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
  className?: string;
  visible?: boolean;
}

const COLLAPSE_TRANSITION = {
  duration: 0.25,
  ease: "easeOut" as const,
};

/**
 * Smart Intelligence Bar — part of the top chrome stack (below navbar).
 * Registers its height into `--notification-height` / `--chrome-top`.
 * Never uses `top-chrome` (that aggregate includes this bar).
 */
export default function NotificationBar({
  variant = "fixed",
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

  const [paused, setPaused] = useState(false);
  /** Stay true through exit animation so chrome height tracks the collapse. */
  const [chromeActive, setChromeActive] = useState(false);
  const { current, goNext, goPrev } = useNotificationRotation(
    items,
    ROTATE_MS,
    paused || drawerOpen,
  );

  const show = Boolean(visible && showBar && current);

  useEffect(() => {
    if (show) setChromeActive(true);
  }, [show]);

  const measureRef = useChromeElement<HTMLDivElement>(
    "notification",
    chromeActive,
    "smart-notification-bar",
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

  const positionClass =
    variant === "fixed"
      ? `fixed inset-x-0 top-navbar ${zClass.nav}`
      : variant === "sticky"
        ? `sticky top-navbar ${zClass.sticky}`
        : "relative z-layout-sticky w-full";

  const handleActivate = () => {
    if (!current) return;
    markRead(current.id);
    if (current.href) router.push(current.href);
    else setDrawerOpen(true);
  };

  return (
    <>
      <AnimatePresence
        initial={false}
        onExitComplete={() => setChromeActive(false)}
      >
        {show && current ? (
          <motion.div
            key="smart-notification-bar"
            ref={measureRef}
            className={`${positionClass} overflow-hidden border-b border-brand-border/80 bg-brand-muted/95 backdrop-blur-md ${className}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: SMART_BAR_HEIGHT_PX, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COLLAPSE_TRANSITION}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            role="region"
            aria-label="AreaIQ market intelligence"
            aria-live="polite"
          >
            <div className="mx-auto flex h-full max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
              <span
                className="relative hidden h-2 w-2 shrink-0 sm:inline-flex"
                aria-hidden
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>

              <button
                type="button"
                onClick={handleActivate}
                className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {isLoggedIn ? (
                  <PersonalUpdates
                    item={current}
                    onSwipeLeft={goNext}
                    onSwipeRight={goPrev}
                  />
                ) : (
                  <MarketTicker
                    item={current}
                    onSwipeLeft={goNext}
                    onSwipeRight={goPrev}
                  />
                )}
              </button>

              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="hidden min-h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100/80 sm:inline-flex"
                >
                  View All
                  <span aria-hidden className="ml-0.5">
                    →
                  </span>
                </button>

                <NotificationBarBell
                  unreadCount={unreadCount}
                  onClick={() => setDrawerOpen(true)}
                />

                <button
                  type="button"
                  onClick={hideBar}
                  className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-800"
                  aria-label="Dismiss announcement"
                  title="Dismiss announcement"
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
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
          </motion.div>
        ) : null}
      </AnimatePresence>

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
