import { clampScore } from "./score-utils";
import type { AreaIQLabel } from "./types";

/**
 * Buyer-friendly weighted normalization curve.
 *
 * Maps raw weighted factor average (0–100) into a display band where
 * solid verified listings naturally land ~75–95, without inflating weak ones.
 *
 * Deterministic · piecewise-linear · reversible for audit (raw kept separately).
 *
 * Before (raw mid-quality ~60) → looked "poor"
 * After  (same inputs)         → ~78–84 "Good / Promising"
 */
export function normalizeAreaIQDisplayScore(raw: number): number {
  const r = Math.min(100, Math.max(0, raw));

  // Weak: stay below 70 (Needs Review)
  if (r <= 40) return clampScore(r * 1.4); // 40 → 56
  if (r <= 50) return clampScore(56 + ((r - 40) / 10) * (70 - 56)); // 50 → 70

  // Average → Promising
  if (r <= 60) return clampScore(70 + ((r - 50) / 10) * (78 - 70)); // 60 → 78
  if (r <= 70) return clampScore(78 + ((r - 60) / 10) * (84 - 78)); // 70 → 84

  // Good → Very Good → Excellent
  if (r <= 80) return clampScore(84 + ((r - 70) / 10) * (90 - 84)); // 80 → 90
  if (r <= 90) return clampScore(90 + ((r - 80) / 10) * (95 - 90)); // 90 → 95

  // Exceptional ceiling
  return clampScore(95 + ((r - 90) / 10) * (100 - 95)); // 100 → 100
}

export function areaIqLabelV2(score: number): AreaIQLabel {
  if (score >= 95) return "Exceptional";
  if (score >= 90) return "Excellent";
  if (score >= 85) return "Very Good";
  if (score >= 80) return "Good";
  if (score >= 75) return "Promising";
  if (score >= 70) return "Average";
  return "Needs Review";
}

/** Points earned toward a factor's max weight (for admin audit). */
export function factorPoints(
  score: number | null | undefined,
  weight: number,
): { earned: number | null; max: number; pending: boolean } {
  if (score == null || Number.isNaN(score)) {
    return { earned: null, max: weight, pending: true };
  }
  return {
    earned: Math.round((clampScore(score) / 100) * weight * 10) / 10,
    max: weight,
    pending: false,
  };
}
