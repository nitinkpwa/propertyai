"use client";

import type { SellerNotification } from "@/lib/seller/types";
import { formatDateTime } from "@/lib/seller/constants";

const ICONS: Record<SellerNotification["type"], string> = {
  lead: "📩",
  save: "❤️",
  visit: "📅",
  approval: "✅",
};

export default function NotificationsTab({ notifications }: { notifications: SellerNotification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
          🔔
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">No notifications yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
          Leads, saves, and visit updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="text-xl">{ICONS[n.type]}</span>
          <div>
            <p className="text-sm font-semibold text-neutral-900">{n.title}</p>
            <p className="mt-0.5 text-sm text-neutral-600">{n.message}</p>
            <p className="mt-1 text-xs text-neutral-400">{formatDateTime(n.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
