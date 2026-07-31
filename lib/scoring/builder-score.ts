import {
  buildExplanation,
  calculateFactorConfidence,
  clampScore,
  factor,
  scaleCount,
  scoreToneFromValue,
  weightedAverage,
} from "./score-utils";
import {
  BUILDER_DEFAULT_WEIGHTS,
  SCORING_ENGINE_VERSION,
  mergeWeights,
} from "./weights";
import type { BuilderScoreInput, ScoredResult } from "./types";
import { INSUFFICIENT_DATA, INSUFFICIENT_DATA_CTA } from "./types";

/**
 * Builder Score (0–100) — delivery track record & reliability.
 */
export function calculateBuilderScore(input: BuilderScoreInput): ScoredResult {
  // Prefer verified AreaIQ builder intelligence score when present
  if (
    typeof input.verifiedAreaiqScore === "number" &&
    input.verifiedAreaiqScore > 0
  ) {
    const score = clampScore(input.verifiedAreaiqScore);
    const factors = [
      factor("verified", "Verified AreaIQ Builder Score", 100, score, "From builder intelligence"),
    ];
    return {
      available: true,
      score,
      label: score >= 80 ? "Trusted" : score >= 60 ? "Established" : "Caution",
      displayValue: String(score),
      message: null,
      confidence: {
        value: 92,
        displayValue: "92%",
        coverage: 1,
        missingFactors: [],
        basedOn: "Verified builder_intelligence.areaiq_builder_score",
      },
      factors,
      explanation: {
        positive: score >= 70 ? ["Verified builder score on file"] : [],
        negative: score < 55 ? ["Below-average verified builder score"] : [],
        summary: `Verified builder score ${score}/100.`,
      },
      tone: scoreToneFromValue(score),
      engineVersion: SCORING_ENGINE_VERSION,
      weightsUsed: { verified: 100 },
    };
  }

  const w = mergeWeights(BUILDER_DEFAULT_WEIGHTS, input.weights);

  const deliveredScore =
    input.projectsDelivered != null
      ? scaleCount(input.projectsDelivered, 4, 40, 95)
      : input.completedProjects != null
        ? scaleCount(input.completedProjects, 4, 40, 95)
        : null;

  const delayScore =
    input.deliveryDelayPercent != null
      ? clampScore(100 - input.deliveryDelayPercent)
      : null;

  const ratingScore =
    input.customerRating != null
      ? clampScore((input.customerRating / 5) * 100)
      : null;

  const ucScore =
    input.underConstruction != null
      ? clampScore(50 + Math.min(40, input.underConstruction * 5))
      : null;

  const factors = [
    factor(
      "projectsDelivered",
      "Projects Delivered",
      w.projectsDelivered,
      deliveredScore,
      deliveredScore != null && deliveredScore >= 72
        ? "Strong delivery volume"
        : null,
    ),
    factor(
      "deliveryDelays",
      "Delivery Delays",
      w.deliveryDelays,
      delayScore,
      delayScore != null && delayScore < 50 ? "Notable delivery delays" : null,
    ),
    factor(
      "customerRating",
      "Customer Rating",
      w.customerRating,
      ratingScore,
      ratingScore != null && ratingScore >= 80 ? "Strong customer ratings" : null,
    ),
    factor("quality", "Quality", w.quality, input.qualityScore),
    factor("legalHistory", "Legal History", w.legalHistory, input.legalHistoryScore),
    factor(
      "completionPercent",
      "Completion %",
      w.completionPercent,
      input.completionPercent,
    ),
    factor(
      "financialStability",
      "Financial Stability",
      w.financialStability,
      input.financialStability,
    ),
    factor(
      "completedProjects",
      "Completed Projects",
      w.completedProjects,
      input.completedProjects != null
        ? scaleCount(input.completedProjects, 4, 40, 95)
        : null,
    ),
    factor(
      "underConstruction",
      "Under Construction",
      w.underConstruction,
      ucScore,
    ),
  ];

  const { score, coverage } = weightedAverage(factors);
  const confidence = calculateFactorConfidence(factors, { dataQuality: coverage });
  const explanation = buildExplanation(factors);

  if (score == null) {
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
    };
  }

  return {
    available: true,
    score,
    label: score >= 80 ? "Trusted" : score >= 60 ? "Established" : "Caution",
    displayValue: String(score),
    message: null,
    confidence,
    factors,
    explanation,
    tone: scoreToneFromValue(score),
    engineVersion: SCORING_ENGINE_VERSION,
    weightsUsed: { ...w },
  };
}
