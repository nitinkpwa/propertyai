import {
  areaIqLabel,
  buildExplanation,
  calculateFactorConfidence,
  factor,
  scoreToneFromValue,
  weightedAverage,
} from "./score-utils";
import { factorPoints, normalizeAreaIQDisplayScore } from "./normalize";
import {
  AREAIQ_DEFAULT_WEIGHTS,
  SCORING_ENGINE_VERSION,
  mergeWeights,
} from "./weights";
import type { AreaIQScoreInput, ScoreAuditLine, ScoredResult } from "./types";
import { INSUFFICIENT_DATA, INSUFFICIENT_DATA_CTA } from "./types";

function buildAudit(factors: ReturnType<typeof factor>[]): ScoreAuditLine[] {
  return factors
    .filter((f) => f.weight > 0)
    .map((f) => {
      const pts = factorPoints(f.score, f.weight);
      return {
        key: f.key,
        label: f.label,
        earned: pts.earned,
        max: pts.max,
        pending: pts.pending,
        factorScore: f.score,
      };
    });
}

/**
 * AreaIQ Score — overall property quality (0–100).
 * Partial: every available factor contributes; missing → lower confidence.
 * Display score is buyer-normalized; rawScore kept for audit.
 */
export function calculateAreaIQScore(input: AreaIQScoreInput): ScoredResult {
  const w = mergeWeights(AREAIQ_DEFAULT_WEIGHTS, input.weights);

  const factors = [
    factor(
      "locationQuality",
      "Location",
      w.locationQuality,
      input.locationQuality,
      input.locationQuality != null && input.locationQuality >= 72
        ? "Prime location"
        : input.locationQuality != null
          ? "Location on file"
          : null,
    ),
    factor(
      "builderReputation",
      "Builder",
      w.builderReputation,
      input.builderReputation,
      input.builderReputation != null && input.builderReputation >= 80
        ? "Trusted builder"
        : input.builderReputation != null
          ? "Builder identified"
          : null,
    ),
    factor(
      "constructionQuality",
      "Configuration",
      w.constructionQuality,
      input.constructionQuality,
      input.constructionQuality != null
        ? "Configuration / construction signals"
        : null,
    ),
    factor(
      "priceFairness",
      "Price",
      w.priceFairness,
      input.priceFairness,
      input.priceFairness != null && input.priceFairness >= 85
        ? "Fair pricing"
        : input.priceFairness != null && input.priceFairness < 50
          ? "Above market pricing"
          : input.priceFairness != null
            ? "Price on file"
            : null,
    ),
    factor(
      "connectivity",
      "Connectivity",
      w.connectivity,
      input.connectivity,
      input.connectivity != null && input.connectivity >= 72
        ? "Excellent connectivity"
        : null,
    ),
    factor(
      "amenities",
      "Amenities",
      w.amenities,
      input.amenities,
      input.amenities != null && input.amenities >= 72
        ? "Strong amenity set"
        : input.amenities != null
          ? "Amenities listed"
          : null,
    ),
    factor(
      "legalVerification",
      "Legal",
      w.legalVerification,
      input.legalVerification,
      input.legalVerification != null && input.legalVerification >= 75
        ? "Strong legal verification"
        : input.legalVerification != null && input.legalVerification < 40
          ? "Legal gaps remain"
          : null,
    ),
    factor(
      "demand",
      "Demand",
      w.demand,
      input.demand,
      input.demand != null && input.demand < 50 ? "Softer demand signals" : null,
    ),
    factor(
      "futureInfrastructure",
      "Market / Infrastructure",
      w.futureInfrastructure,
      input.futureInfrastructure,
      input.futureInfrastructure != null && input.futureInfrastructure >= 72
        ? "Infrastructure upside"
        : null,
    ),
    factor(
      "livability",
      "Livability",
      w.livability,
      input.livability,
      input.livability != null && input.livability >= 72
        ? "High livability"
        : null,
    ),
  ];

  const { score: rawScore, coverage } = weightedAverage(factors);
  const confidence = calculateFactorConfidence(factors, {
    dataQuality: coverage,
  });
  const explanation = buildExplanation(factors);
  const audit = buildAudit(factors);

  if (rawScore == null) {
    return {
      available: false,
      score: null,
      label: INSUFFICIENT_DATA,
      displayValue: INSUFFICIENT_DATA,
      message: INSUFFICIENT_DATA_CTA,
      confidence,
      factors,
      explanation,
      tone: "neutral",
      engineVersion: SCORING_ENGINE_VERSION,
      weightsUsed: { ...w },
      rawScore: null,
      audit,
    };
  }

  const score = normalizeAreaIQDisplayScore(rawScore);
  const label = areaIqLabel(score);
  return {
    available: true,
    score,
    label,
    displayValue: String(score),
    message: null,
    confidence,
    factors,
    explanation,
    tone: scoreToneFromValue(score, "quality"),
    engineVersion: SCORING_ENGINE_VERSION,
    weightsUsed: { ...w },
    rawScore,
    audit,
  };
}
