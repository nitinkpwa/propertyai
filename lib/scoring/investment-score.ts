import {
  buildExplanation,
  calculateFactorConfidence,
  factor,
  investmentLabel,
  scoreToneFromValue,
  weightedAverage,
} from "./score-utils";
import {
  INVESTMENT_DEFAULT_WEIGHTS,
  SCORING_ENGINE_VERSION,
  mergeWeights,
} from "./weights";
import type { InvestmentScoreInput, ScoredResult } from "./types";
import { INSUFFICIENT_DATA, INSUFFICIENT_DATA_CTA } from "./types";

/**
 * Investment Score — how good is this property as an investment?
 * Independent of AreaIQ Score and Legal Score. Never mixed.
 */
export function calculateInvestmentScore(input: InvestmentScoreInput): ScoredResult {
  const w = mergeWeights(INVESTMENT_DEFAULT_WEIGHTS, input.weights);

  const factors = [
    factor(
      "capitalAppreciation",
      "Capital Appreciation",
      w.capitalAppreciation,
      input.capitalAppreciation,
      input.capitalAppreciation != null && input.capitalAppreciation >= 75
        ? "Strong appreciation outlook"
        : input.capitalAppreciation != null && input.capitalAppreciation < 50
          ? "Muted appreciation outlook"
          : null,
    ),
    factor(
      "rentalYield",
      "Rental Yield",
      w.rentalYield,
      input.rentalYield,
      input.rentalYield != null && input.rentalYield >= 72
        ? "Attractive rental yield"
        : input.rentalYield != null && input.rentalYield < 50
          ? "Moderate rental yield"
          : null,
    ),
    factor(
      "entryPrice",
      "Entry Price",
      w.entryPrice,
      input.entryPrice,
      input.entryPrice != null && input.entryPrice >= 75
        ? "Favorable entry price"
        : input.entryPrice != null && input.entryPrice < 50
          ? "Premium entry price"
          : null,
    ),
    factor(
      "exitPotential",
      "Exit Potential",
      w.exitPotential,
      input.exitPotential,
      input.exitPotential != null && input.exitPotential >= 72
        ? "Healthy exit potential"
        : null,
    ),
    factor(
      "supplyVsDemand",
      "Supply vs Demand",
      w.supplyVsDemand,
      input.supplyVsDemand,
      input.supplyVsDemand != null && input.supplyVsDemand < 50
        ? "Slightly high inventory"
        : input.supplyVsDemand != null && input.supplyVsDemand >= 72
          ? "Demand exceeds supply"
          : null,
    ),
    factor(
      "infrastructureGrowth",
      "Infrastructure Growth",
      w.infrastructureGrowth,
      input.infrastructureGrowth,
      input.infrastructureGrowth != null && input.infrastructureGrowth >= 72
        ? "Infrastructure growth tailwind"
        : null,
    ),
    factor(
      "liquidity",
      "Liquidity",
      w.liquidity,
      input.liquidity,
      input.liquidity != null && input.liquidity >= 72
        ? "Good resale liquidity"
        : null,
    ),
    factor(
      "builderReliability",
      "Builder Reliability",
      w.builderReliability,
      input.builderReliability,
      input.builderReliability != null && input.builderReliability >= 72
        ? "Reliable builder track record"
        : null,
    ),
    factor(
      "marketTrend",
      "Market Trend",
      w.marketTrend,
      input.marketTrend,
      input.marketTrend != null && input.marketTrend >= 72
        ? "Positive market trend"
        : null,
    ),
    factor(
      "risk",
      "Risk",
      w.risk,
      input.risk,
      input.risk != null && input.risk < 50
        ? "Elevated investment risk"
        : input.risk != null && input.risk >= 75
          ? "Controlled risk profile"
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

  const label = investmentLabel(score);
  return {
    available: true,
    score,
    label,
    displayValue: String(score),
    message: null,
    confidence,
    factors,
    explanation,
    tone: scoreToneFromValue(score, "investment"),
    engineVersion: SCORING_ENGINE_VERSION,
    weightsUsed: { ...w },
  };
}
