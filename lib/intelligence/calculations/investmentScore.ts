import type { IntelligenceMetric } from "../types";
import { availableMetric, clampScore, unavailableMetric } from "../utils";

interface WeightedFactor {
  weight: number;
  metric: IntelligenceMetric<number> | null;
  label: string;
}

export function calculateInvestmentScore(factors: WeightedFactor[]): IntelligenceMetric<number> {
  const available = factors.filter((f) => f.metric?.available && typeof f.metric.value === "number");

  if (available.length < 2) {
    return unavailableMetric("Insufficient data");
  }

  const totalWeight = available.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight < 40) {
    return unavailableMetric("Insufficient data");
  }

  let weightedSum = 0;
  const factorLabels: string[] = [];

  for (const factor of available) {
    const normalizedWeight = (factor.weight / totalWeight) * 100;
    weightedSum += (factor.metric!.value! * normalizedWeight) / 100;
    factorLabels.push(`${factor.label} (${normalizedWeight.toFixed(0)}%)`);
  }

  const score = clampScore(weightedSum);
  return availableMetric(score, String(score), "AreaIQ Calculated", {
    factors: factorLabels,
  });
}
