"use client";

/**
 * Connect notifications share the CRM notification store (same table / user_id),
 * but deep links must stay inside /connect — never /buyer.
 */
export {
  useBuyerNotifications as useConnectNotifications,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  getNotificationIcon,
  groupNotificationsByDate,
} from "@/lib/buyer/notifications";

export { getConnectNotificationHref } from "@/lib/connect/notificationRoutes";
