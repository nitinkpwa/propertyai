import { calculateConfidence, unavailableConfidence } from "./confidence";
import { clampScore } from "./math";
import type { EngagementSignals, ScoredMetric, SubjectPropertyInput } from "./types";
import { INSUFFICIENT_DATA, WAITING_MARKET_DATA } from "./types";

/**
 * Liquidity from engagement + inventory velocity signals.
 * Missing engagement tables → insufficient (never invent).
 */
export function calculateLiquidity(
  subject: SubjectPropertyInput,
  engagement: EngagementSignals,
  market: { totalListings: number; newListings90d: number; avgViews: number | null },
): ScoredMetric {
  const factors = [];

  const daysOnMarket = Math.max(
    0,
    Math.round((Date.now() - new Date(subject.createdAt).getTime()) / 86400000),
  );

  // Fresh listing with views is more liquid; stale with zero engagement is not
  let domScore: number | null = null;
  if (subject.createdAt) {
    if (daysOnMarket <= 14) domScore = 88;
    else if (daysOnMarket <= 45) domScore = 72;
    else if (daysOnMarket <= 90) domScore = 58;
    else domScore = 40;
    factors.push({
      key: "dom",
      label: "Days on market",
      weight: 25,
      score: domScore,
      available: true,
    });
  }

  if (engagement.listingViews > 0 || (engagement.viewEvents != null && engagement.viewEvents > 0)) {
    const views = engagement.viewEvents ?? engagement.listingViews;
    const vsAvg =
      market.avgViews && market.avgViews > 0 ? views / market.avgViews : views > 0 ? 1 : 0;
    factors.push({
      key: "views",
      label: "Buyer views",
      weight: 20,
      score: clampScore(40 + Math.min(50, vsAvg * 35)),
      available: true,
    });
  }

  if (engagement.savedCount != null) {
    factors.push({
      key: "saves",
      label: "Saved count",
      weight: 20,
      score: clampScore(35 + Math.min(55, engagement.savedCount * 12)),
      available: true,
    });
  }

  if (engagement.visitRequestCount != null) {
    factors.push({
      key: "visits",
      label: "Visit requests",
      weight: 20,
      score: clampScore(35 + Math.min(55, engagement.visitRequestCount * 15)),
      available: true,
    });
  }

  if (market.totalListings > 0) {
    // Lower competing inventory → higher liquidity for a well-viewed listing
    const inventoryPressure = Math.min(40, market.totalListings);
    factors.push({
      key: "inventory",
      label: "Local inventory",
      weight: 15,
      score: clampScore(90 - inventoryPressure),
      available: true,
    });
  }

  const usable = factors.filter((f) => f.available && f.score != null);
  // Require at least views/DOM + one more real engagement OR inventory signal
  const hasEngagement =
    engagement.savedCount != null ||
    engagement.visitRequestCount != null ||
    engagement.listingViews > 0 ||
    (engagement.viewEvents != null && engagement.viewEvents > 0);

  if (!hasEngagement || usable.length < 2) {
    return {
      available: false,
      score: null,
      displayValue: INSUFFICIENT_DATA,
      message: WAITING_MARKET_DATA,
      confidence: unavailableConfidence(
        "Need verified views/saves/visits to score liquidity",
      ),
      factors,
    };
  }

  const w = usable.reduce((s, f) => s + f.weight, 0);
  const score = clampScore(usable.reduce((s, f) => s + (f.score! * f.weight) / w, 0));

  return {
    available: true,
    score,
    displayValue: String(score),
    message: null,
    confidence: calculateConfidence({
      comparableCount: usable.length * 4,
      dataQuality: hasEngagement ? 0.75 : 0.4,
      freshness: daysOnMarket <= 90 ? 0.8 : 0.45,
    }),
    factors,
  };
}
