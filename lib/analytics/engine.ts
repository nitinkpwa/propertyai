import "server-only";

import { extractNearbyPlacesList } from "@/lib/properties/nearbyPlacesMeta";
import { calculateRentalYield } from "@/lib/intelligence/calculations/rentalYield";
import type { MarketContext } from "@/lib/intelligence/types";
import { calculateBuilderScore } from "./builderScore";
import { calculateComparablePrices } from "./comps";
import { calculateFairValue } from "./fairValue";
import {
  fetchBuilderIntelligence,
  fetchCandidateListings,
  fetchEngagementSignals,
  fetchSubjectProperty,
} from "./fetchComparables";
import { calculateGrowthPrediction } from "./growth";
import { calculateInvestmentScore } from "./investmentScore";
import { calculateLegalScore } from "./legalScore";
import { calculateLiquidity } from "./liquidity";
import { average } from "./math";
import { buildAnalyticsOpinions } from "./opinions";
import {
  calculatePriceTrend,
  calculateShortHorizonTrendPercent,
} from "./priceTrend";
import type {
  CompFilterOptions,
  ComparableListing,
  PropertyAnalyticsReport,
  SubjectPropertyInput,
} from "./types";

function toLegacyMarketContext(
  subject: SubjectPropertyInput,
  comps: ComparableListing[],
): MarketContext {
  const now = Date.now();
  const ninety = 90 * 86400000;
  const recent = comps.filter((c) => now - new Date(c.createdAt).getTime() <= ninety);
  const older = comps.filter((c) => now - new Date(c.createdAt).getTime() > ninety);
  const allPsf = comps.map((c) => c.pricePerSqft);
  const recentPsf = recent.map((c) => c.pricePerSqft);
  const olderPsf = older.map((c) => c.pricePerSqft);

  return {
    city: subject.city,
    locality: subject.location,
    listings: comps.map((c) => ({
      id: c.id,
      price: c.totalPrice,
      areaSqft: c.areaSqft,
      bedrooms: c.bedrooms,
      type: c.listingType,
      location: c.location,
      city: c.city,
      createdAt: c.createdAt,
      views: c.views,
      builderName: c.builderName,
      reraNumber: c.reraNumber,
    })),
    totalListings: comps.length,
    newListings90d: recent.length,
    buyListings: comps.filter((c) => c.listingType === "buy").length,
    rentListings: comps.filter((c) => c.listingType === "rent").length,
    medianPricePerSqft: average(allPsf),
    recentMedianPricePerSqft: average(recentPsf),
    olderMedianPricePerSqft: average(olderPsf),
    avgViews: average(comps.map((c) => c.views)),
  };
}

function locationScoreFromComps(
  subject: SubjectPropertyInput,
  comps: ComparableListing[],
): number | null {
  if (comps.length < 3) return null;
  const local = comps.filter(
    (c) =>
      c.location.toLowerCase().includes(subject.location.toLowerCase()) ||
      subject.location.toLowerCase().includes(c.location.toLowerCase()),
  );
  if (local.length === 0) return 55;
  const share = local.length / comps.length;
  return Math.round(50 + share * 40);
}

/**
 * Full Property Analytics Engine entry point.
 * All numbers are derived from DB listings / engagement — never invented.
 */
export async function runPropertyAnalytics(
  propertyId: string,
  options: CompFilterOptions = {},
): Promise<PropertyAnalyticsReport | null> {
  const subjectRow = await fetchSubjectProperty(propertyId);
  if (!subjectRow) return null;

  const nearby = extractNearbyPlacesList(subjectRow.rawNearby);
  const subject: SubjectPropertyInput = {
    ...subjectRow,
    nearbyPlaces: nearby,
    possession: subjectRow.possession,
  };

  const [candidates, engagement, builderVerified] = await Promise.all([
    fetchCandidateListings(subject),
    fetchEngagementSignals(propertyId, subject.views),
    fetchBuilderIntelligence(subject.builderName),
  ]);

  return buildAnalyticsReport({
    subject,
    candidates,
    engagement,
    builderVerified,
    options,
  });
}

/** Pure calculation path — reusable for tests and batch jobs. */
export function buildAnalyticsReport(input: {
  subject: SubjectPropertyInput;
  candidates: ComparableListing[];
  engagement: Awaited<ReturnType<typeof fetchEngagementSignals>>;
  builderVerified: Awaited<ReturnType<typeof fetchBuilderIntelligence>>;
  options?: CompFilterOptions;
}): PropertyAnalyticsReport {
  const { subject, candidates, engagement, builderVerified, options } = input;

  const price = calculateComparablePrices(subject, candidates, options);
  const fairValue = calculateFairValue(subject, price);

  const builderListings = candidates.filter(
    (c) =>
      subject.builderName &&
      c.builderName &&
      c.builderName.toLowerCase() === subject.builderName.toLowerCase(),
  );
  const builder = calculateBuilderScore(subject, {
    builderListings,
    verified: builderVerified,
  });

  const legal = calculateLegalScore(subject);

  const market = toLegacyMarketContext(subject, price.comps.length ? price.comps : candidates);
  const shortTrend = calculateShortHorizonTrendPercent(
    market.recentMedianPricePerSqft,
    market.olderMedianPricePerSqft,
  );
  const growth = calculateGrowthPrediction(subject, price, shortTrend);
  const priceTrend = calculatePriceTrend(
    price.comps.length >= 5 ? price.comps : candidates.filter((c) => c.pricePerSqft > 0),
  );

  // Rental yield via existing calculator when rent comps exist
  const rentalMetric = calculateRentalYield(
    {
      id: subject.id,
      title: subject.title,
      price: subject.totalPrice,
      areaSqft: subject.areaSqft,
      bedrooms: subject.bedrooms,
      type: subject.listingType,
      location: subject.location,
      city: subject.city,
      sector: subject.sector,
      builderName: subject.builderName,
      reraNumber: subject.reraNumber,
      possession: subject.possession,
      nearbyPlaces: subject.nearbyPlaces,
      views: subject.views,
      createdAt: subject.createdAt,
    },
    market,
  );
  const rentalYieldPercent =
    rentalMetric.available && typeof rentalMetric.value === "number"
      ? rentalMetric.value
      : null;

  const investment = calculateInvestmentScore({
    subject,
    price,
    builderScore: builder.available ? builder.score : null,
    legal,
    growth,
    rentalYieldPercent,
    locationScore: locationScoreFromComps(subject, price.comps),
    connectivityScore: null,
  });

  const liquidity = calculateLiquidity(subject, engagement, {
    totalListings: market.totalListings,
    newListings90d: market.newListings90d,
    avgViews: market.avgViews,
  });

  const base = {
    propertyId: subject.id,
    generatedAt: new Date().toISOString(),
    price,
    fairValue,
    investment,
    builder,
    legal,
    liquidity,
    growth,
    priceTrend,
    priceOpinion: "",
    investmentOpinion: "",
  };

  const opinions = buildAnalyticsOpinions(base);

  return {
    ...base,
    ...opinions,
  };
}

// Re-export named calculators for cross-surface reuse
export {
  calculateComparablePrices,
  calculateFairValue,
  calculateInvestmentScore,
  calculateBuilderScore,
  calculateLiquidity,
  calculateGrowthPrediction,
  calculateLegalScore,
  calculatePriceTrend,
};
