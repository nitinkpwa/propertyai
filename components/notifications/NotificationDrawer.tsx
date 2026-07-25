"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayPortal } from "@/components/layout/engine";
import { useFocusTrap, useOverlay } from "@/lib/layout/overlay";
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
  const { zClassName } = useOverlay("drawer", open, onClose);
  useFocusTrap(open, panelRef);

  const sorted = [...items].filter((i) => i.kind !== "market_status");

  return (
    <AnimatePresence>
      {open ? (
        <OverlayPortal>
          <div className={`fixed inset-0 ${zClassName}`} role="presentation">
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
              className="absolute inset-y-0 right-0 flex w-[min(100vw-2rem,24rem)] flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.14)] pt-[var(--safe-top)] pb-[var(--safe-bottom)]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
                <div>
                  <h2 id={titleId} className="type-label text-heading-primary">
                    AreaIQ Intelligence
                  </h2>
                  <p className="type-micro text-muted">
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
                      className="touch-target rounded-xl px-2.5 type-micro font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Mark all read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className="touch-target inline-flex items-center justify-center rounded-xl text-body hover:bg-neutral-50"
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
                    <p className="mt-2 type-caption font-semibold text-heading-primary">
                      No verified intelligence yet
                    </p>
                    <p className="mt-1 type-micro text-muted">
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
                                <p className="type-caption font-semibold text-heading-primary">
                                  {item.title}
                                </p>
                                {item.message ? (
                                  <p className="mt-0.5 line-clamp-2 type-micro text-muted">
                                    {item.message}
                                  </p>
                                ) : null}
                                <p className="mt-1.5 type-micro leading-relaxed text-label">
                                  P{item.score} · {item.source} · {item.confidence}% confidence
                                  · {formatTimeAgo(item.timestamp)}
                                </p>
                                <p className="mt-0.5 line-clamp-2 type-micro text-muted">
                                  {item.reason}
                                </p>
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDismiss(item.id)}
                            className="touch-target shrink-0 self-start rounded-lg text-muted hover:bg-neutral-100 hover:text-heading-primary"
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
                  className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-50 type-caption font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Open CRM notification center
                </Link>
              </div>
            </motion.aside>
          </div>
        </OverlayPortal>
      ) : null}
    </AnimatePresence>
  );
}
