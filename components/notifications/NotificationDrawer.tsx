"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatTimeAgo } from "@/lib/notifications/service";
import type { IntelligenceNotification } from "@/lib/notifications/types";

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  items: IntelligenceNotification[];
  unreadCount: number;
  onSelect: (item: IntelligenceNotification) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function NotificationDrawer({
  open,
  onClose,
  items,
  unreadCount,
  onSelect,
  onMarkAllRead,
  onDismiss,
}: NotificationDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const sorted = [...items].filter((i) => i.kind !== "market_status");

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[65]" role="presentation">
          <motion.button
            type="button"
            aria-label="Close notifications"
            className="absolute inset-0 bg-neutral-950/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-[min(100vw-2rem,24rem)] flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.14)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
              <div>
                <h2 id={titleId} className="text-sm font-bold text-heading-primary">
                  AreaIQ Intelligence
                </h2>
                <p className="text-xs text-muted">
                  {unreadCount > 0
                    ? `${unreadCount} actionable update${unreadCount === 1 ? "" : "s"}`
                    : "Verified signals only — never fabricated"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="rounded-xl px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-body hover:bg-neutral-50"
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scroll-touch">
              {sorted.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-2xl" aria-hidden>
                    📡
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading-primary">
                    No verified intelligence yet
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    AreaIQ only surfaces signals grounded in live data.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {sorted.map((item) => (
                    <li key={item.id}>
                      <div
                        className={`flex gap-3 px-4 py-3.5 ${
                          !item.read && item.score >= 80 ? "bg-emerald-50/40" : "bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => onSelect(item)}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 text-base" aria-hidden>
                              {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-heading-primary">
                                {item.title}
                              </p>
                              {item.message ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                                  {item.message}
                                </p>
                              ) : null}
                              <p className="mt-1.5 text-[10px] leading-relaxed text-label">
                                P{item.score} · {item.source} · {item.confidence}% confidence
                                · {formatTimeAgo(item.timestamp)}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-[10px] text-muted">
                                {item.reason}
                              </p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismiss(item.id)}
                          className="shrink-0 self-start rounded-lg p-2 text-muted hover:bg-neutral-100 hover:text-heading-primary"
                          aria-label="Dismiss"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-neutral-100 p-3">
              <Link
                href="/buyer/notifications"
                onClick={onClose}
                className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Open CRM notification center
              </Link>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
