"use client";

import { useEffect, useRef, useState } from "react";
import {
  getNotificationIcon,
  groupNotificationsByDate,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  useConnectNotifications,
} from "@/lib/connect/notifications";

interface ConnectNotificationBellProps {
  userId: string | undefined;
  onViewAll: () => void;
}

export default function ConnectNotificationBell({ userId, onViewAll }: ConnectNotificationBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useConnectNotifications(userId);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(unreadCount);

  useEffect(() => {
    requestBrowserNotificationPermission();
  }, []);

  useEffect(() => {
    if (unreadCount > prevUnread.current && notifications.length > 0) {
      const latest = notifications.find((n) => !n.read_at);
      if (latest) showBrowserNotification(latest.title, latest.message);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount, notifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const groups = groupNotificationsByDate(notifications.slice(0, 8));

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-body transition hover:bg-neutral-50"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        🔔
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-bold text-heading-primary">Notifications</p>
            {unreadCount > 0 ? (
              <button type="button" onClick={() => markAllRead()} className="text-xs font-semibold text-emerald-600">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">No notifications yet</div>
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
                      onClick={() => { if (!n.read_at) markRead(n.id); setOpen(false); }}
                      className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-neutral-50 ${!n.read_at ? "bg-emerald-50/40" : ""}`}
                    >
                      <span>{getNotificationIcon(n.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-heading-primary">{n.title}</p>
                        <p className="line-clamp-2 text-xs text-muted">{n.message}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-neutral-100 p-3">
            <button
              type="button"
              onClick={() => { setOpen(false); onViewAll(); }}
              className="block w-full rounded-xl bg-neutral-50 py-2.5 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              View all notifications
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
