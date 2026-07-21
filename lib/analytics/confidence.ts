import type { AnalyticsConfidence } from "./types";
import { INSUFFICIENT_DATA } from "./types";

export function calculateConfidence(input: {
  comparableCount: number;
  /** 0–1 quality of match (type/config/area) */
  dataQuality?: number;
  /** 0–1 freshness of comps (share created in last 180d) */
  freshness?: number;
  minForFull?: number;
}): AnalyticsConfidence {
  const { comparableCount, dataQuality = 0.7, freshness = 0.6, minForFull = 12 } = input;

  if (comparableCount <= 0) {
    return {
      value: null,
      displayValue: INSUFFICIENT_DATA,
      basedOn: "0 verified comparable listings",
      available: false,
    };
  }

  const countScore = Math.min(100, (comparableCount / minForFull) * 100);
  const qualityScore = Math.min(100, Math.max(0, dataQuality) * 100);
  const freshScore = Math.min(100, Math.max(0, freshness) * 100);
  const value = Math.round(countScore * 0.55 + qualityScore * 0.25 + freshScore * 0.2);

  return {
    value,
    displayValue: `${value}%`,
    basedOn: `${comparableCount} verified comparable listing${comparableCount === 1 ? "" : "s"}`,
    available: true,
  };
}

export function unavailableConfidence(reason: string): AnalyticsConfidence {
  return {
    value: null,
    displayValue: INSUFFICIENT_DATA,
    basedOn: reason,
    available: false,
  };
}
