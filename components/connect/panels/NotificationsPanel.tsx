"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getConnectNotificationHref,
  getNotificationIcon,
  groupNotificationsByDate,
  requestBrowserNotificationPermission,
  useConnectNotifications,
} from "@/lib/connect/notifications";
import { connectTokens } from "@/lib/connect/design";
import ConnectEmptyModule from "@/app/connect/components/ConnectEmptyModule";

interface Props {
  userId: string | undefined;
}

export default function NotificationsPanel({ userId }: Props) {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } = useConnectNotifications(userId);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default",
  );

  const groups = groupNotificationsByDate(notifications);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={connectTokens.heading}>Notifications</h2>
          <p className={connectTokens.subheading}>{unreadCount} unread</p>
        </div>
        {unreadCount > 0 ? (
          <button type="button" onClick={() => markAllRead()} className={connectTokens.btnSecondary}>Mark all read</button>
        ) : null}
      </div>

      {browserPermission !== "granted" ? (
        <div className={`${connectTokens.card} border-amber-100 bg-amber-50/50 p-4`}>
          <p className="text-sm font-semibold text-amber-900">Enable browser notifications</p>
          <button
            type="button"
            onClick={async () => setBrowserPermission(await requestBrowserNotificationPermission())}
            className={`mt-2 ${connectTokens.btnPrimary} text-xs`}
          >
            Enable
          </button>
        </div>
      ) : null}

      {notifications.length === 0 ? (
        <ConnectEmptyModule icon="🔔" title="No notifications" description="You'll receive alerts for new enquiries, visit requests, and property updates on your assigned listings." />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-label">{group.label}</p>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.read_at) void markRead(n.id);
                      router.push(getConnectNotificationHref(n));
                    }}
                    className={`flex w-full gap-4 rounded-2xl border p-4 text-left ${!n.read_at ? "border-emerald-200 bg-emerald-50/40" : "border-neutral-200 bg-white"}`}
                  >
                    <span className="text-xl">{getNotificationIcon(n.type)}</span>
                    <div>
                      <p className="font-semibold text-heading-primary">{n.title}</p>
                      <p className="text-sm text-body">{n.message}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
