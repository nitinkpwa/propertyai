import type { IntelligenceMetric, MarketContext, PropertyIntelligenceInput } from "../types";
import {
  availableMetric,
  clampScore,
  pricePerSqft,
  unavailableMetric,
} from "../utils";

const MIN_COMPARABLES = 5;

export function calculateGrowthScore(
  property: PropertyIntelligenceInput,
  market: MarketContext,
): IntelligenceMetric<number> {
  if (market.totalListings < MIN_COMPARABLES) {
    return unavailableMetric();
  }

  const factors: string[] = [];
  let score = 50;

  const propertyPpsf = pricePerSqft(property.price, property.areaSqft);
  if (propertyPpsf !== null && market.medianPricePerSqft !== null) {
    const discount = ((market.medianPricePerSqft - propertyPpsf) / market.medianPricePerSqft) * 100;
    if (discount > 5) {
      score += Math.min(15, discount / 2);
      factors.push(`Listed ${discount.toFixed(0)}% below area median price/sqft`);
    } else if (discount < -10) {
      score -= Math.min(10, Math.abs(discount) / 3);
      factors.push(`Listed above area median price/sqft`);
    } else {
      factors.push("Price/sqft aligned with area median");
    }
  }

  if (
    market.recentMedianPricePerSqft !== null &&
    market.olderMedianPricePerSqft !== null &&
    market.olderMedianPricePerSqft > 0
  ) {
    const trend =
      ((market.recentMedianPricePerSqft - market.olderMedianPricePerSqft) /
        market.olderMedianPricePerSqft) *
      100;
    if (trend > 2) {
      score += Math.min(20, trend * 2);
      factors.push(`Recent listings priced ${trend.toFixed(1)}% higher than older inventory`);
    } else if (trend < -2) {
      score -= Math.min(10, Math.abs(trend));
      factors.push(`Recent listing prices trending lower in ${market.city}`);
    }
  }

  const newListingRatio = market.newListings90d / market.totalListings;
  if (newListingRatio >= 0.35) {
    score += 10;
    factors.push("High share of new listings in the last 90 days");
  } else if (newListingRatio >= 0.2) {
    score += 5;
    factors.push("Moderate new listing activity");
  }

  if (market.avgViews !== null && market.avgViews > 0) {
    const relativeViews = property.views / market.avgViews;
    if (relativeViews >= 1.2) {
      score += 8;
      factors.push("Above-average listing interest vs area");
    } else if (relativeViews <= 0.6) {
      score -= 5;
      factors.push("Below-average listing interest vs area");
    }
  }

  const buyRatio = market.buyListings / Math.max(1, market.totalListings);
  if (buyRatio >= 0.7) {
    score += 5;
    factors.push("Strong buy-side demand in area inventory");
  }

  const finalScore = clampScore(score);
  return availableMetric(finalScore, String(finalScore), "AreaIQ Calculated", {
    factors,
  });
}

export function calculateDemandIndex(
  property: PropertyIntelligenceInput,
  market: MarketContext,
): IntelligenceMetric<number> {
  if (market.totalListings < MIN_COMPARABLES || market.avgViews === null) {
    return unavailableMetric();
  }

  const relative = property.views / market.avgViews;
  const score = clampScore(Math.min(100, relative * 50));
  return availableMetric(score, String(score), "AreaIQ Calculated", {
    factors: [
      `${property.views} views vs area average ${market.avgViews.toFixed(0)}`,
      `${market.totalListings} active comparable listings in ${market.city}`,
    ],
  });
}
