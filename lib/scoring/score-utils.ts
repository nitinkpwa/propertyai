import type {
  ScoreConfidence,
  ScoreExplanation,
  ScoreFactor,
  ScoreTone,
  AreaIQLabel,
  InvestmentLabel,
  LegalLabel,
} from "./types";
import { INSUFFICIENT_DATA } from "./types";

/** Only return null / Insufficient Data below this share of total factor weight. */
export const MIN_WEIGHTED_COVERAGE = 0.25;

export const CONFIDENCE_TOOLTIP =
  "This score is based on currently verified property data. Confidence will improve as more market and builder information becomes available.";

export function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Normalize relative weights so usable factors sum to 1.0 */
export function normalizeWeights(
  factors: Pick<ScoreFactor, "key" | "weight" | "available" | "score">[],
): Map<string, number> {
  const usable = factors.filter((f) => f.available && f.score != null && f.weight > 0);
  const sum = usable.reduce((s, f) => s + f.weight, 0);
  const map = new Map<string, number>();
  if (sum <= 0) return map;
  for (const f of usable) {
    map.set(f.key, f.weight / sum);
  }
  return map;
}

/**
 * Partial weighted average — every available factor contributes.
 * Missing factors reduce coverage/confidence; they do NOT zero the score.
 * Returns null only when weighted coverage < MIN_WEIGHTED_COVERAGE (25%).
 */
export function weightedAverage(
  factors: ScoreFactor[],
  options?: { minFactors?: number; minCoverage?: number },
): { score: number | null; coverage: number; used: number; total: number } {
  // minFactors kept for API compat; partial scoring only gates on coverage
  const minCoverage = options?.minCoverage ?? MIN_WEIGHTED_COVERAGE;
  const total = factors.filter((f) => f.weight > 0).length;
  const usable = factors.filter((f) => f.available && f.score != null && f.weight > 0);
  const weightSum = factors
    .filter((f) => f.weight > 0)
    .reduce((s, f) => s + f.weight, 0);
  const usableWeight = usable.reduce((s, f) => s + f.weight, 0);
  const coverage = weightSum > 0 ? usableWeight / weightSum : 0;

  if (usable.length === 0 || coverage < minCoverage) {
    return { score: null, coverage, used: usable.length, total };
  }

  const norms = normalizeWeights(factors);
  let acc = 0;
  for (const f of usable) {
    acc += (f.score as number) * (norms.get(f.key) ?? 0);
  }
  return { score: clampScore(acc), coverage, used: usable.length, total };
}

/**
 * Confidence falls as factors go missing.
 * ~50% coverage → ~70% confidence (missing weight penalized at 60%).
 */
export function calculateFactorConfidence(
  factors: ScoreFactor[],
  options?: { freshness?: number; dataQuality?: number },
): ScoreConfidence {
  const weightSum = factors.filter((f) => f.weight > 0).reduce((s, f) => s + f.weight, 0);
  const usable = factors.filter((f) => f.available && f.score != null && f.weight > 0);
  const usableWeight = usable.reduce((s, f) => s + f.weight, 0);
  const coverage = weightSum > 0 ? usableWeight / weightSum : 0;
  const missingFactors = factors
    .filter((f) => f.weight > 0 && (!f.available || f.score == null))
    .map((f) => f.label);

  if (usable.length === 0) {
    return {
      value: null,
      displayValue: INSUFFICIENT_DATA,
      coverage: 0,
      missingFactors,
      basedOn: "No verified factors available",
    };
  }

  // Primary: missing weight lowers confidence. Freshness is a light nudge only.
  const freshness = clamp01(options?.freshness ?? 0.7);
  const coverageConfidence = 100 - (1 - coverage) * 60;
  const value = clampScore(coverageConfidence * 0.9 + freshness * 10);

  return {
    value,
    displayValue: `${value}%`,
    coverage,
    missingFactors,
    basedOn: CONFIDENCE_TOOLTIP,
  };
}

export function areaIqLabel(score: number): AreaIQLabel {
  // Delegates to buyer-facing bands (normalize.ts is source of truth)
  if (score >= 95) return "Exceptional";
  if (score >= 90) return "Excellent";
  if (score >= 85) return "Very Good";
  if (score >= 80) return "Good";
  if (score >= 75) return "Promising";
  if (score >= 70) return "Average";
  return "Needs Review";
}

export function investmentLabel(score: number): InvestmentLabel {
  if (score >= 95) return "Exceptional";
  if (score >= 85) return "High Growth";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Moderate";
  return "Weak Investment";
}

export function legalLabel(score: number): LegalLabel {
  if (score >= 90) return "Verified";
  if (score >= 75) return "Mostly Verified";
  if (score >= 50) return "Partially Verified";
  if (score >= 30) return "Needs Verification";
  return "High Risk";
}

export function scoreToneFromValue(score: number | null, kind: "quality" | "legal" | "investment" = "quality"): ScoreTone {
  if (score == null) return "neutral";
  if (kind === "legal") {
    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 50) return "average";
    return "risk";
  }
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 70) return "average";
  return "risk";
}

/** Premium UI color tokens — Apple / Bloomberg / Stripe, not gaming */
export const SCORE_TONE_COLORS: Record<
  ScoreTone,
  { text: string; bg: string; ring: string; bar: string }
> = {
  excellent: {
    text: "#0F766E",
    bg: "#F0FDFA",
    ring: "#14B8A6",
    bar: "#0D9488",
  },
  good: {
    text: "#1D4ED8",
    bg: "#EFF6FF",
    ring: "#3B82F6",
    bar: "#2563EB",
  },
  average: {
    text: "#B45309",
    bg: "#FFFBEB",
    ring: "#F59E0B",
    bar: "#D97706",
  },
  risk: {
    text: "#B91C1C",
    bg: "#FEF2F2",
    ring: "#EF4444",
    bar: "#DC2626",
  },
  neutral: {
    text: "#525252",
    bg: "#F5F5F5",
    ring: "#A3A3A3",
    bar: "#737373",
  },
};

export function buildExplanation(
  factors: ScoreFactor[],
  options?: { positiveThreshold?: number; negativeThreshold?: number; maxEach?: number },
): ScoreExplanation {
  const posT = options?.positiveThreshold ?? 72;
  const negT = options?.negativeThreshold ?? 55;
  const max = options?.maxEach ?? 4;

  const scored = factors.filter((f) => f.available && f.score != null);
  const positive = scored
    .filter((f) => (f.score as number) >= posT)
    .sort((a, b) => (b.score as number) - (a.score as number))
    .slice(0, max)
    .map((f) => f.detail?.trim() || f.label);

  const negative = [
    ...scored
      .filter((f) => (f.score as number) < negT)
      .sort((a, b) => (a.score as number) - (b.score as number))
      .slice(0, max)
      .map((f) => f.detail?.trim() || `Weak ${f.label.toLowerCase()}`),
    ...factors
      .filter((f) => f.weight > 0 && (!f.available || f.score == null))
      .slice(0, Math.max(0, max - scored.filter((f) => (f.score as number) < negT).length))
      .map((f) => `${f.label} data missing`),
  ].slice(0, max);

  const summary =
    positive.length > 0
      ? `Strong on ${positive.slice(0, 2).join(" and ").toLowerCase()}.`
      : negative.length > 0
        ? "Limited verified strengths — review gaps before deciding."
        : INSUFFICIENT_DATA;

  return { positive, negative, summary };
}

export function factor(
  key: string,
  label: string,
  weight: number,
  score: number | null,
  detail?: string | null,
): ScoreFactor {
  return {
    key,
    label,
    weight,
    score: score === null || Number.isNaN(score) ? null : clampScore(score),
    available: score !== null && !Number.isNaN(score),
    detail: detail ?? null,
  };
}

/** Map a 0–N count into a 40–95 band */
export function scaleCount(count: number, perUnit = 6, base = 40, cap = 95): number {
  return clampScore(base + Math.min(cap - base, count * perUnit));
}

/** Invert risk: high risk → low score */
export function invertRisk(riskScore: number | null): number | null {
  if (riskScore == null) return null;
  return clampScore(100 - riskScore);
}
