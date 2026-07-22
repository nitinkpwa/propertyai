import type { IntelligenceNotification } from "./types";
import { scoreToLegacyPriority } from "./types";

export function formatTimeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function countUnread(
  items: IntelligenceNotification[],
  isLoggedIn = false,
): number {
  return items.filter((i) => {
    if (i.read || i.kind === "market_status" || i.kind === "platform_stat") {
      return false;
    }
    if (!isLoggedIn) return i.source === "admin_broadcast" && i.score >= 80;
    return i.score >= 80;
  }).length;
}

/** Adapt intelligence items for UI that still expects createdAt/priority */
export function toDisplayItem(item: IntelligenceNotification) {
  return {
    ...item,
    createdAt: item.timestamp,
    priority: scoreToLegacyPriority(item.score),
  };
}

// Re-export engine entry for callers
export { runIntelligenceEngine } from "./engine";
export type { IntelligenceEngineResult } from "./engine";
