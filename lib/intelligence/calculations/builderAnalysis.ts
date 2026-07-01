import type {
  BuilderAnalysisResult,
  IntelligenceMetric,
  MarketContext,
  PropertyIntelligenceInput,
} from "../types";
import {
  availableMetric,
  clampScore,
  reputationLabel,
  unavailableMetric,
} from "../utils";

export function calculateBuilderAnalysis(
  property: PropertyIntelligenceInput,
  market: MarketContext,
): BuilderAnalysisResult {
  const builderName = property.builderName?.trim();
  if (!builderName) {
    return {
      reputation: unavailableMetric("Insufficient data"),
      listingCount: unavailableMetric(),
      reraCompliance: unavailableMetric("Insufficient data"),
      activeCities: unavailableMetric(),
    };
  }

  const builderListings = market.listings.filter(
    (l) => l.builderName?.toLowerCase() === builderName.toLowerCase(),
  );

  const allBuilderListings = builderListings.length > 0 ? builderListings : market.listings.filter(
    (l) => l.builderName?.toLowerCase().includes(builderName.toLowerCase()),
  );

  if (allBuilderListings.length === 0) {
    return {
      reputation: unavailableMetric("Insufficient data"),
      listingCount: unavailableMetric(),
      reraCompliance: unavailableMetric("Insufficient data"),
      activeCities: unavailableMetric(),
    };
  }

  const listingCount = allBuilderListings.length;
  const reraCount = allBuilderListings.filter((l) => Boolean(l.reraNumber)).length;
  const reraRatio = listingCount > 0 ? reraCount / listingCount : 0;
  const cities = new Set(allBuilderListings.map((l) => l.city.toLowerCase()));

  let score = 45;
  if (listingCount >= 10) score += 25;
  else if (listingCount >= 5) score += 18;
  else if (listingCount >= 2) score += 10;

  if (reraRatio >= 0.8) score += 20;
  else if (reraRatio >= 0.5) score += 12;
  else if (reraRatio > 0) score += 5;

  if (cities.size >= 2) score += 10;

  const reputationScore = clampScore(score);
  const label = reputationLabel(reputationScore);

  return {
    reputation: availableMetric(label, label, "AreaIQ Listings", {
      factors: [
        `${listingCount} active AreaIQ listings`,
        `${reraCount} listings with RERA number on file`,
        `Present in ${cities.size} ${cities.size === 1 ? "city" : "cities"}`,
      ],
    }),
    listingCount: availableMetric(listingCount, String(listingCount), "AreaIQ Listings"),
    reraCompliance: availableMetric(
      `${Math.round(reraRatio * 100)}% verified`,
      `${Math.round(reraRatio * 100)}% verified`,
      "AreaIQ Listings",
    ),
    activeCities: availableMetric(cities.size, String(cities.size), "AreaIQ Listings"),
  };
}

export function builderReputationMetric(
  analysis: BuilderAnalysisResult,
): IntelligenceMetric<string> {
  return analysis.reputation;
}

export function builderScoreForInvestment(
  analysis: BuilderAnalysisResult,
): IntelligenceMetric<number> | null {
  if (!analysis.reputation.available || !analysis.listingCount.available) return null;

  const listingCount = analysis.listingCount.value ?? 0;
  const reraText = analysis.reraCompliance.displayValue;
  const reraMatch = reraText.match(/(\d+)%/);
  const reraPct = reraMatch ? Number(reraMatch[1]) : 0;

  let score = 40;
  score += Math.min(30, listingCount * 3);
  score += Math.min(30, reraPct * 0.3);

  return availableMetric(clampScore(score), String(clampScore(score)), "AreaIQ Listings");
}
