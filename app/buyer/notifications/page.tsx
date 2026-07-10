"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getNotificationIcon,
  groupNotificationsByDate,
  requestBrowserNotificationPermission,
  useBuyerNotifications,
} from "@/lib/buyer/notifications";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/app/buyer/components/EmptyState";
import Card from "@/components/ui/Card";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useBuyerNotifications(user?.id);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  const handleEnableBrowser = async () => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
  };

  if (loading) return <PageSkeleton rows={5} />;

  const groups = groupNotificationsByDate(notifications);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Stay Updated"
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        action={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => markAllRead()}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {browserPermission !== "granted" ? (
        <Card padding="sm" className="border-amber-100 bg-amber-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Enable browser notifications</p>
              <p className="text-xs text-amber-700">Get instant alerts for visit approvals and price updates</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleEnableBrowser}>
              Enable
            </Button>
          </div>
        </Card>
      ) : null}

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications yet"
          description="You'll receive alerts when your site visit is approved, a builder replies, or new properties match your profile."
          actionLabel="Browse Properties"
          tips={[
            "Book a site visit to get real-time status updates",
            "Save properties to track price changes",
            "Complete your profile for matching property alerts",
          ]}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-label">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.read_at) markRead(n.id);
                    }}
                    className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition hover:shadow-sm ${
                      !n.read_at
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-neutral-200/80 bg-white"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-lg">
                      {getNotificationIcon(n.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-heading-primary">{n.title}</p>
                        {!n.read_at ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-body">{n.message}</p>
                      <p className="mt-2 text-xs text-muted">
                        {new Date(n.created_at).toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
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
