import { calculateFactorConfidence, clampScore } from "./score-utils";
import type { PriceFairnessResult } from "./types";
import { INSUFFICIENT_DATA } from "./types";

export interface PriceFairnessInput {
  propertyPsf: number | null;
  areaAveragePsf: number | null;
  builderAveragePsf: number | null;
  nearbyAveragePsf: number | null;
  /** Precomputed difference % vs area average when available */
  differencePercent?: number | null;
}

/**
 * Price Fairness — compare property vs area / builder / nearby averages.
 * Returns label + buyer-favorability score (higher = better deal).
 */
export function calculatePriceFairness(input: PriceFairnessInput): PriceFairnessResult {
  const propertyPsf = input.propertyPsf;
  const refs = [
    input.areaAveragePsf,
    input.nearbyAveragePsf,
    input.builderAveragePsf,
  ].filter((v): v is number => typeof v === "number" && v > 0);

  const factors = [
    {
      key: "area",
      label: "Area Average",
      weight: 50,
      score: input.areaAveragePsf != null && propertyPsf != null ? 100 : null,
      available: input.areaAveragePsf != null && propertyPsf != null,
    },
    {
      key: "nearby",
      label: "Nearby Projects",
      weight: 30,
      score: input.nearbyAveragePsf != null && propertyPsf != null ? 100 : null,
      available: input.nearbyAveragePsf != null && propertyPsf != null,
    },
    {
      key: "builder",
      label: "Builder Average",
      weight: 20,
      score: input.builderAveragePsf != null && propertyPsf != null ? 100 : null,
      available: input.builderAveragePsf != null && propertyPsf != null,
    },
  ];

  const confidence = calculateFactorConfidence(factors);

  if (
    propertyPsf == null ||
    propertyPsf <= 0 ||
    refs.length === 0
  ) {
    return {
      available: false,
      label: INSUFFICIENT_DATA,
      score: null,
      differencePercent: null,
      propertyPsf,
      areaAveragePsf: input.areaAveragePsf,
      builderAveragePsf: input.builderAveragePsf,
      nearbyAveragePsf: input.nearbyAveragePsf,
      detail: "Need property PSF and at least one market average.",
      confidence,
    };
  }

  // Blend available references (area preferred)
  let blend = 0;
  let wSum = 0;
  if (input.areaAveragePsf && input.areaAveragePsf > 0) {
    blend += input.areaAveragePsf * 0.5;
    wSum += 0.5;
  }
  if (input.nearbyAveragePsf && input.nearbyAveragePsf > 0) {
    blend += input.nearbyAveragePsf * 0.3;
    wSum += 0.3;
  }
  if (input.builderAveragePsf && input.builderAveragePsf > 0) {
    blend += input.builderAveragePsf * 0.2;
    wSum += 0.2;
  }
  const benchmark = blend / wSum;
  const differencePercent =
    input.differencePercent ??
    Math.round(((propertyPsf - benchmark) / benchmark) * 1000) / 10;

  let label: PriceFairnessResult["label"];
  let score: number;
  if (differencePercent <= -8) {
    label = "Undervalued";
    score = 92;
  } else if (differencePercent <= 5) {
    label = "Fair Value";
    score = 78;
  } else if (differencePercent <= 12) {
    label = "Slightly Premium";
    score = 58;
  } else {
    label = "Overpriced";
    score = 38;
  }

  // Fine-tune score by distance from fair
  score = clampScore(score - Math.max(0, differencePercent - 5) * 1.2);

  return {
    available: true,
    label,
    score,
    differencePercent,
    propertyPsf,
    areaAveragePsf: input.areaAveragePsf,
    builderAveragePsf: input.builderAveragePsf,
    nearbyAveragePsf: input.nearbyAveragePsf,
    detail: `${differencePercent > 0 ? "+" : ""}${differencePercent}% vs blended market average`,
    confidence,
  };
}
