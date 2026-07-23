import { getDismissedIds, getReadIds, getStoredBroadcasts } from "../storage";
import type { IntelligenceNotification } from "../types";
import { MIN_CONFIDENCE } from "../types";

/** Sort by score desc, then unread, then newest. Drop low confidence & dismissed. */
export function scoreAndRank(
  items: IntelligenceNotification[],
): IntelligenceNotification[] {
  const dismissed = getDismissedIds();
  const readIds = getReadIds();

  // Include intentional admin local drafts (never fabricated market stats)
  const drafts = (getStoredBroadcasts() as IntelligenceNotification[]).filter(
    (d) => d?.title && d.confidence >= MIN_CONFIDENCE,
  );

  const filtered = [...items, ...drafts]
    .filter((i) => i.confidence >= MIN_CONFIDENCE)
    .filter((i) => !dismissed.has(i.id))
    .map((i) => ({
      ...i,
      read: i.read || readIds.has(i.id),
    }));

  // Dedupe by title (keep highest score / newest)
  const byTitle = new Map<string, IntelligenceNotification>();
  for (const item of filtered) {
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) continue;
    const key = title.toLowerCase();
    const prev = byTitle.get(key);
    if (!prev) {
      byTitle.set(key, { ...item, title });
      continue;
    }
    const better =
      item.score > prev.score ||
      (item.score === prev.score &&
        String(item.timestamp ?? "") > String(prev.timestamp ?? ""));
    if (better) byTitle.set(key, { ...item, title });
  }

  return [...byTitle.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const unread = Number(Boolean(a.read)) - Number(Boolean(b.read));
    if (unread !== 0) return unread;
    return b.timestamp.localeCompare(a.timestamp);
  });
}

/** Only the top priority band is eligible for rotation. */
export function selectDisplayQueue(
  ranked: IntelligenceNotification[],
): IntelligenceNotification[] {
  if (ranked.length === 0) return [];
  const topScore = ranked[0].score;
  return ranked.filter((i) => i.score === topScore);
}
