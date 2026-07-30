"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  getNotificationIcon,
  groupNotificationsByDate,
  showBrowserNotification,
  useBuyerNotifications,
} from "@/lib/buyer/notifications";
import { getCrmNotificationHref } from "@/lib/buyer/notificationRoutes";
import { useAuthOptional } from "@/lib/auth/AuthProvider";

interface NotificationBellProps {
  className?: string;
}

/** Quiet placeholder when the widget cannot mount — never an error banner. */
export function NotificationBellFallback({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Link
        href="/buyer/notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-body shadow-sm"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </Link>
    </div>
  );
}

function BellSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex h-10 w-10 animate-pulse items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 ${className}`}
      aria-hidden
    />
  );
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const auth = useAuthOptional();
  const router = useRouter();
  const userId = auth?.user?.id;
  const { notifications, unreadCount, loading, offline, markRead, markAllRead } =
    useBuyerNotifications(userId);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prevUnread = useRef(unreadCount);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (unreadCount > prevUnread.current && notifications.length > 0) {
      const latest = notifications.find((n) => !n.read_at);
      if (latest) {
        showBrowserNotification(
          latest.title,
          latest.message,
          getCrmNotificationHref(latest),
        );
      }
    }
    prevUnread.current = unreadCount;
  }, [unreadCount, notifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Anchor panel under the bell, clamped to viewport (mobile-safe).
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const gutter = 12;
    const width = Math.min(380, window.innerWidth - gutter * 2);
    let left = rect.right - width;
    left = Math.max(gutter, Math.min(left, window.innerWidth - width - gutter));
    setPanelStyle({
      position: "fixed",
      top: Math.min(rect.bottom + 8, window.innerHeight - 160),
      left,
      width,
      maxHeight: Math.min(420, window.innerHeight - rect.bottom - 24),
      zIndex: 80,
    });
  }, [open]);

  if (!auth) {
    return <NotificationBellFallback className={className} />;
  }

  if (loading && notifications.length === 0 && unreadCount === 0) {
    return <BellSkeleton className={className} />;
  }

  let groups: { label: string; items: typeof notifications }[] = [];
  try {
    groups = groupNotificationsByDate(notifications.slice(0, 8));
  } catch {
    groups = [];
  }

  const openNotification = (n: (typeof notifications)[number]) => {
    if (!n.read_at) void markRead(n.id);
    setOpen(false);
    router.push(getCrmNotificationHref(n));
  };

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-body shadow-sm transition-all hover:bg-neutral-50 hover:text-heading-primary"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          style={panelStyle}
          className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-bold text-heading-primary">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {offline ? (
            <p className="border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-[11px] text-muted">
              Offline · Showing last synced notifications
            </p>
          ) : null}

          <div className="max-h-80 overflow-y-auto scroll-touch">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl">🔔</p>
                <p className="mt-2 text-sm font-medium text-label">You&apos;re all caught up</p>
                <p className="text-xs text-muted">No new notifications yet</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <p className="bg-neutral-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-label">
                    {group.label}
                  </p>
                  {group.items.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 ${
                        !n.read_at ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <span className="text-lg">{getNotificationIcon(n.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-heading-primary">
                          {n.title || "Notification"}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.message || ""}</p>
                      </div>
                      {!n.read_at ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-neutral-100 p-3">
            <Link
              href="/buyer/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-xl bg-neutral-50 py-2.5 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
