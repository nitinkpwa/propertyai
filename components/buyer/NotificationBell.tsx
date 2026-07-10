"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getNotificationIcon,
  groupNotificationsByDate,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  useBuyerNotifications,
} from "@/lib/buyer/notifications";
import { useAuth } from "@/lib/auth/AuthProvider";

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useBuyerNotifications(user?.id);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(unreadCount);

  useEffect(() => {
    requestBrowserNotificationPermission();
  }, []);

  useEffect(() => {
    if (unreadCount > prevUnread.current && notifications.length > 0) {
      const latest = notifications.find((n) => !n.read_at);
      if (latest) {
        showBrowserNotification(latest.title, latest.message, "/buyer/notifications");
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

  const groups = groupNotificationsByDate(notifications.slice(0, 8));

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-body shadow-sm transition-all hover:bg-neutral-50 hover:text-heading-primary"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
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
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-bold text-heading-primary">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl">🔔</p>
                <p className="mt-2 text-sm font-medium text-label">All caught up</p>
                <p className="text-xs text-muted">Visit updates and price alerts appear here</p>
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
                      onClick={() => {
                        if (!n.read_at) markRead(n.id);
                        setOpen(false);
                      }}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 ${
                        !n.read_at ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <span className="text-lg">{getNotificationIcon(n.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-heading-primary">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.message}</p>
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
