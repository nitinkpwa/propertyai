import { calculateConfidence, unavailableConfidence } from "./confidence";
import { average, round1 } from "./math";
import type { ComparableListing, PriceTrendAnalysis } from "./types";
import { HISTORICAL_UNAVAILABLE } from "./types";

/**
 * Yearly average PSF from listing created_at cohorts.
 * This is listing-based, not closed-transaction history.
 */
export function calculatePriceTrend(comps: ComparableListing[]): PriceTrendAnalysis {
  if (comps.length < 5) {
    return {
      available: false,
      message: HISTORICAL_UNAVAILABLE,
      points: [],
      confidence: unavailableConfidence("Need 5+ dated comparable listings"),
    };
  }

  const byYear = new Map<string, number[]>();
  for (const c of comps) {
    const y = new Date(c.createdAt).getFullYear();
    if (!Number.isFinite(y) || y < 2000) continue;
    const key = String(y);
    const arr = byYear.get(key) ?? [];
    arr.push(c.pricePerSqft);
    byYear.set(key, arr);
  }

  const years = [...byYear.keys()].sort();
  if (years.length < 2) {
    return {
      available: false,
      message: HISTORICAL_UNAVAILABLE,
      points: [],
      confidence: unavailableConfidence("Need listings across 2+ years"),
    };
  }

  const points = years.map((year, i) => {
    const avg = average(byYear.get(year)!)!;
    let growthPercent: number | null = null;
    if (i > 0) {
      const prev = average(byYear.get(years[i - 1])!)!;
      if (prev > 0) growthPercent = round1(((avg - prev) / prev) * 100);
    }
    return {
      year,
      averagePsf: Math.round(avg),
      growthPercent,
    };
  });

  return {
    available: true,
    message: null,
    points,
    confidence: calculateConfidence({
      comparableCount: comps.length,
      dataQuality: years.length >= 3 ? 0.7 : 0.5,
      freshness: 0.5,
    }),
  };
}

/** Recent vs older median listing PSF — used as a short-horizon trend signal. */
export function calculateShortHorizonTrendPercent(
  recentMedianPsf: number | null,
  olderMedianPsf: number | null,
): number | null {
  if (
    recentMedianPsf == null ||
    olderMedianPsf == null ||
    olderMedianPsf <= 0 ||
    recentMedianPsf <= 0
  ) {
    return null;
  }
  return round1(((recentMedianPsf - olderMedianPsf) / olderMedianPsf) * 100);
}
