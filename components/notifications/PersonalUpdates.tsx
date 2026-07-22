"use client";

import type { IntelligenceNotification } from "@/lib/notifications/types";
import NotificationTicker from "./NotificationTicker";

export default function PersonalUpdates({
  item,
  onSwipeLeft,
  onSwipeRight,
}: {
  item: IntelligenceNotification | null;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  return (
    <NotificationTicker
      item={item}
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
    />
  );
}
