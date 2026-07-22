/** Admin broadcast helpers — no fabricated market ticker strings. */

import type { AdminBroadcastInput, IntelligenceNotification } from "./types";

export function createBroadcastNotification(
  input: AdminBroadcastInput,
  id = `bcast-${Date.now()}`,
): IntelligenceNotification {
  return {
    id,
    title: input.title.trim(),
    message: input.message?.trim() || undefined,
    icon: input.icon ?? categoryIcon(input.category),
    href: input.href,
    score: 80,
    kind: "buyer_intel",
    source: "admin_broadcast",
    reason: `Admin draft broadcast (${input.category}) — publish to site_announcements for cross-device delivery`,
    confidence: 100,
    timestamp: new Date().toISOString(),
  };
}

function categoryIcon(category: AdminBroadcastInput["category"]): string {
  switch (category) {
    case "maintenance":
      return "🛠";
    case "feature":
      return "✨";
    case "holiday":
      return "🎉";
    case "market_report":
      return "📊";
    case "builder_update":
      return "🏗";
    default:
      return "📢";
  }
}
