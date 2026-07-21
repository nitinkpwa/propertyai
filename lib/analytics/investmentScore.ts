import { calculateConfidence, unavailableConfidence } from "./confidence";
import { clampScore } from "./math";
import type {
  ComparablePriceAnalysis,
  GrowthPrediction,
  LegalScoreResult,
  ScoredMetric,
  ScoreBreakdownFactor,
  SubjectPropertyInput,
} from "./types";
import { INSUFFICIENT_DATA } from "./types";

function factor(
  key: string,
  label: string,
  weight: number,
  score: number | null,
): ScoreBreakdownFactor {
  return {
    key,
    label,
    weight,
    score: score === null ? null : clampScore(score),
    available: score !== null,
  };
}

/**
 * Weighted investment score from verified factor scores only.
 * Weights: Price 25, Location 20, Connectivity 15, Builder 15, Amenities 10, Rental 10, Future Growth 5.
 */
export function calculateInvestmentScore(input: {
  subject: SubjectPropertyInput;
  price: ComparablePriceAnalysis;
  builderScore: number | null;
  legal: LegalScoreResult;
  growth: GrowthPrediction;
  rentalYieldPercent: number | null;
  locationScore: number | null;
  connectivityScore: number | null;
}): ScoredMetric {
  const { subject, price, builderScore, legal, growth, rentalYieldPercent } = input;

  let priceScore: number | null = null;
  if (price.available && price.differencePercent != null) {
    // Near or below average → higher score
    const d = price.differencePercent;
    if (d <= -10) priceScore = 92;
    else if (d <= -5) priceScore = 85;
    else if (d <= 5) priceScore = 78;
    else if (d <= 12) priceScore = 62;
    else priceScore = 45;
  }

  let connectivityScore = input.connectivityScore;
  if (connectivityScore == null && subject.nearbyPlaces.length > 0) {
    const types = new Set(
      subject.nearbyPlaces.map((p) => (p.type ?? "").toLowerCase()).filter(Boolean),
    );
    const hits = ["airport", "metro", "highway", "it", "school", "hospital"].filter((t) =>
      [...types].some((x) => x.includes(t)),
    ).length;
    connectivityScore = hits > 0 ? clampScore(40 + hits * 12) : null;
  }

  const amenityScore =
    subject.amenities.length > 0
      ? clampScore(40 + Math.min(50, subject.amenities.length * 6))
      : null;

  let rentalScore: number | null = null;
  if (rentalYieldPercent != null && rentalYieldPercent > 0) {
    // Map typical 2–6% yields into 40–90 band
    rentalScore = clampScore(30 + rentalYieldPercent * 12);
  }

  let growthScore: number | null = null;
  if (growth.available && growth.lowPercent != null && growth.highPercent != null) {
    const mid = (growth.lowPercent + growth.highPercent) / 2;
    growthScore = clampScore(35 + mid * 5);
  }

  const legalScore =
    legal.available && legal.score != null
      ? legal.score
      : legal.status === "pending"
        ? null
        : null;

  const factors: ScoreBreakdownFactor[] = [
    factor("price", "Price", 25, priceScore),
    factor("location", "Location", 20, input.locationScore),
    factor("connectivity", "Connectivity", 15, connectivityScore),
    factor("builder", "Builder", 15, builderScore),
    factor("amenities", "Amenities", 10, amenityScore),
    factor("rental", "Rental", 10, rentalScore),
    factor("growth", "Future Growth", 5, growthScore),
  ];

  // Legal is informational for investment — fold lightly into builder/location if present
  if (legalScore != null) {
    const builderIdx = factors.findIndex((f) => f.key === "builder");
    if (builderIdx >= 0 && factors[builderIdx].score != null) {
      factors[builderIdx] = {
        ...factors[builderIdx],
        score: clampScore(factors[builderIdx].score! * 0.7 + legalScore * 0.3),
      };
    }
  }

  const usable = factors.filter((f) => f.available && f.score != null);
  const weightSum = usable.reduce((s, f) => s + f.weight, 0);

  if (usable.length < 3 || weightSum < 40) {
    return {
      available: false,
      score: null,
      displayValue: INSUFFICIENT_DATA,
      message: INSUFFICIENT_DATA,
      confidence: unavailableConfidence(
        `${usable.length} scored factors (need 3+ with adequate weight)`,
      ),
      factors,
    };
  }

  const weighted = usable.reduce((s, f) => s + (f.score! * f.weight) / weightSum, 0);
  const score = clampScore(weighted);

  return {
    available: true,
    score,
    displayValue: String(score),
    message: null,
    confidence: calculateConfidence({
      comparableCount: price.comparableCount,
      dataQuality: usable.length / factors.length,
      freshness: price.confidence.value != null ? price.confidence.value / 100 : 0.5,
    }),
    factors,
  };
}
