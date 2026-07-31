import {
  buildExplanation,
  calculateFactorConfidence,
  factor,
  scoreToneFromValue,
  weightedAverage,
} from "./score-utils";
import {
  LOCATION_DEFAULT_WEIGHTS,
  SCORING_ENGINE_VERSION,
  mergeWeights,
} from "./weights";
import type { LocationScoreInput, ScoredResult } from "./types";
import { INSUFFICIENT_DATA, INSUFFICIENT_DATA_CTA } from "./types";

/**
 * Location Score (0–100) — schools, hospitals, transit, demand, safety, future.
 */
export function calculateLocationScore(input: LocationScoreInput): ScoredResult {
  const w = mergeWeights(LOCATION_DEFAULT_WEIGHTS, input.weights);

  const factors = [
    factor(
      "schools",
      "Schools",
      w.schools,
      input.schools,
      input.schools != null && input.schools >= 72 ? "Strong school access" : null,
    ),
    factor(
      "hospitals",
      "Hospitals",
      w.hospitals,
      input.hospitals,
      input.hospitals != null && input.hospitals >= 72
        ? "Strong hospital access"
        : null,
    ),
    factor("highways", "Highways", w.highways, input.highways),
    factor(
      "metro",
      "Metro",
      w.metro,
      input.metro,
      input.metro != null && input.metro >= 72 ? "Metro connectivity" : null,
    ),
    factor("airport", "Airport", w.airport, input.airport),
    factor(
      "itParks",
      "IT Parks",
      w.itParks,
      input.itParks,
      input.itParks != null && input.itParks >= 72 ? "Near IT employment hubs" : null,
    ),
    factor(
      "demand",
      "Demand",
      w.demand,
      input.demand,
      input.demand != null && input.demand >= 72 ? "High locality demand" : null,
    ),
    factor(
      "safety",
      "Safety",
      w.safety,
      input.safety,
      input.safety != null && input.safety < 50 ? "Safety concerns in locality data" : null,
    ),
    factor(
      "futureDevelopment",
      "Future Development",
      w.futureDevelopment,
      input.futureDevelopment,
      input.futureDevelopment != null && input.futureDevelopment >= 72
        ? "Future development pipeline"
        : null,
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
    label: score >= 80 ? "Prime" : score >= 65 ? "Strong" : score >= 50 ? "Average" : "Weak",
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
