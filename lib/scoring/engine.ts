/**
 * Property Intelligence Scoring Engine — orchestrator.
 *
 * Consumes verified analytics + legal flags + listing signals.
 * Produces three independent pillars + builder/location/price fairness.
 * UI never changes when ML / government APIs replace factor sources later.
 */

import type { PropertyAnalyticsReport } from "@/lib/analytics/types";
import type { LegalVerificationFlags } from "@/lib/properties/legalCompliance";
import { calculateAreaIQScore } from "./areaiq-score";
import { calculateBuilderScore } from "./builder-score";
import {
  amenitiesToScore,
  builderFromName,
  constructionFromConfiguration,
  demandFromViews,
  growthToAppreciationScore,
  legalFlagsToDocuments,
  livabilityFromParts,
  locationFromListingMeta,
  mediaCompletenessScore,
  nearbyToConnectivityScore,
  nearbyToLocationParts,
  priceDiffToEntryScore,
  priceFromListingDocumented,
  rentalYieldToScore,
  supplyDemandScore,
} from "./derive-factors";
import { calculateInvestmentScore } from "./investment-score";
import { calculateLegalScore } from "./legal-score";
import { calculateLocationScore } from "./location-score";
import { calculatePriceFairness } from "./price-fairness";
import { clampScore, invertRisk } from "./score-utils";
import type {
  PropertyCardScores,
  PropertyIntelligenceReport,
  ScoreAdminBreakdown,
  ScoredResult,
} from "./types";
import { INSUFFICIENT_DATA, INSUFFICIENT_DATA_CTA } from "./types";
import { SCORING_ENGINE_VERSION } from "./weights";

/** Average of available 0–100 parts — used so partial location signals still feed AreaIQ */
function averageAvailable(parts: Array<number | null | undefined>): number | null {
  const vals = parts.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!vals.length) return null;
  return clampScore(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export interface ScoringPropertyContext {
  propertyId: string;
  amenities: string[];
  nearbyPlaces: { name?: string; distance?: string; type?: string }[];
  legalFlags: Partial<LegalVerificationFlags> | null;
  /** True when admin has saved legal verification at least once */
  legalVerificationAttempted?: boolean;
  reraNumber?: string | null;
  possession?: string | null;
  status?: string | null;
  views?: number | null;
  marketAvgViews?: number | null;
  totalListings?: number | null;
  /** Optional rental yield % from rent comps */
  rentalYieldPercent?: number | null;
  /** Listing fields — enable partial AreaIQ without market analytics */
  builderName?: string | null;
  city?: string | null;
  location?: string | null;
  price?: number | null;
  areaSqft?: number | null;
  bedrooms?: number | null;
  imageCount?: number | null;
  builder?: {
    projectsDelivered?: number | null;
    deliveryDelayPercent?: number | null;
    customerRating?: number | null;
    qualityScore?: number | null;
    legalHistoryScore?: number | null;
    completionPercent?: number | null;
    financialStability?: number | null;
    completedProjects?: number | null;
    underConstruction?: number | null;
    verifiedAreaiqScore?: number | null;
  } | null;
  /** Admin weight overrides keyed by score type */
  weightOverrides?: {
    areaIq?: Record<string, number>;
    investment?: Record<string, number>;
    legal?: Record<string, number>;
    builder?: Record<string, number>;
    location?: Record<string, number>;
  } | null;
}

function factorScore(
  analytics: PropertyAnalyticsReport | null | undefined,
  key: string,
): number | null {
  const f = analytics?.investment.factors.find((x) => x.key === key);
  if (f?.available && f.score != null) return f.score;
  return null;
}

/**
 * Run the full Property Intelligence Scoring Engine.
 * Deterministic: same inputs → same outputs.
 */
export function runPropertyIntelligenceScoring(
  context: ScoringPropertyContext,
  analytics: PropertyAnalyticsReport | null | undefined,
): PropertyIntelligenceReport {
  const amenityScore = amenitiesToScore(context.amenities);
  const connectivityScore =
    factorScore(analytics, "connectivity") ??
    nearbyToConnectivityScore(context.nearbyPlaces);
  const locationParts = nearbyToLocationParts(context.nearbyPlaces);
  const demandScore =
    demandFromViews(context.views, context.marketAvgViews) ??
    factorScore(analytics, "location");

  const location = calculateLocationScore({
    ...locationParts,
    demand: demandScore,
    safety: null, // never invent crime data
    futureDevelopment: factorScore(analytics, "growth"),
    weights: context.weightOverrides?.location,
  });

  // Even when full Location Score is thin, feed partial nearby signals into AreaIQ
  const locationQualityPartial = averageAvailable([
    locationParts.schools,
    locationParts.hospitals,
    locationParts.highways,
    locationParts.metro,
    locationParts.airport,
    locationParts.itParks,
    demandScore,
  ]);

  const builder = calculateBuilderScore({
    projectsDelivered: context.builder?.projectsDelivered ?? null,
    deliveryDelayPercent: context.builder?.deliveryDelayPercent ?? null,
    customerRating: context.builder?.customerRating ?? null,
    qualityScore: context.builder?.qualityScore ?? null,
    legalHistoryScore: context.builder?.legalHistoryScore ?? null,
    completionPercent: context.builder?.completionPercent ?? null,
    financialStability: context.builder?.financialStability ?? null,
    completedProjects: context.builder?.completedProjects ?? null,
    underConstruction: context.builder?.underConstruction ?? null,
    verifiedAreaiqScore:
      context.builder?.verifiedAreaiqScore ??
      (analytics?.builder.available ? analytics.builder.score : null),
    weights: context.weightOverrides?.builder,
  });

  const priceFairness = calculatePriceFairness({
    propertyPsf: analytics?.price.currentPricePerSqft ?? null,
    areaAveragePsf: analytics?.price.averagePsf ?? null,
    builderAveragePsf: null,
    nearbyAveragePsf: analytics?.price.medianPsf ?? null,
    differencePercent: analytics?.price.differencePercent ?? null,
  });

  const legal = calculateLegalScore({
    documents: legalFlagsToDocuments(context.legalFlags, {
      reraNumber: context.reraNumber,
      litigation: null,
      encumbranceClear: null,
      registryVerified: null,
      verificationAttempted: context.legalVerificationAttempted,
    }),
    weights: context.weightOverrides?.legal,
  });

  const construction = constructionFromConfiguration({
    bedrooms: context.bedrooms,
    areaSqft: context.areaSqft,
    possession: context.possession,
    status: context.status,
  });

  const locationQuality =
    location.score ??
    locationQualityPartial ??
    factorScore(analytics, "location") ??
    locationFromListingMeta(context.city, context.location, locationQualityPartial);

  const builderReputation =
    builder.score ?? builderFromName(context.builderName);

  const priceFactor =
    priceFairness.score ??
    priceFromListingDocumented(context.price, context.areaSqft);

  const mediaScore = mediaCompletenessScore(context.imageCount);
  const amenityFactor =
    amenityScore ??
    factorScore(analytics, "amenities") ??
    mediaScore;

  const livability = livabilityFromParts(
    amenityFactor,
    connectivityScore,
    locationQuality,
  );

  const areaIq = calculateAreaIQScore({
    locationQuality,
    builderReputation,
    constructionQuality: construction,
    priceFairness: priceFactor,
    connectivity: connectivityScore,
    amenities: amenityFactor,
    legalVerification: legal.score,
    demand: demandScore,
    futureInfrastructure:
      analytics?.growth.available && analytics.growth.lowPercent != null
        ? growthToAppreciationScore(
            analytics.growth.lowPercent,
            analytics.growth.highPercent,
          )
        : null,
    livability,
    weights: context.weightOverrides?.areaIq,
  });

  const rentalScore = rentalYieldToScore(
    context.rentalYieldPercent ??
      (analytics
        ? // investment rental factor if present
          factorScore(analytics, "rental")
        : null),
  );

  const appreciation = growthToAppreciationScore(
    analytics?.growth.lowPercent,
    analytics?.growth.highPercent,
  );
  const entryPrice = priceDiffToEntryScore(analytics?.price.differencePercent);
  const liquidity = analytics?.liquidity.available ? analytics.liquidity.score : null;
  const marketTrend =
    analytics?.priceTrend.available && analytics.priceTrend.points.length >= 2
      ? (() => {
          const last = analytics.priceTrend.points[analytics.priceTrend.points.length - 1];
          const g = last?.growthPercent;
          return g == null ? null : clampGrowthTrend(g);
        })()
      : null;

  const supplyVsDemand = supplyDemandScore(context.totalListings, demandScore);

  // Risk: invert legal weakness + thin confidence
  const riskScore = (() => {
    if (legal.score == null && liquidity == null) return null;
    const legalRisk = legal.score != null ? 100 - legal.score : 50;
    const liqRisk = liquidity != null ? 100 - liquidity : 50;
    return invertRisk((legalRisk * 0.6 + liqRisk * 0.4));
  })();

  const investment = calculateInvestmentScore({
    capitalAppreciation: appreciation,
    rentalYield: rentalScore,
    entryPrice,
    exitPotential: liquidity,
    supplyVsDemand,
    infrastructureGrowth:
      analytics?.growth.available && analytics.growth.lowPercent != null
        ? growthToAppreciationScore(
            analytics.growth.lowPercent,
            analytics.growth.highPercent,
          )
        : null,
    liquidity,
    builderReliability: builder.score,
    marketTrend,
    risk: riskScore,
    weights: context.weightOverrides?.investment,
  });

  return {
    propertyId: context.propertyId,
    generatedAt: new Date().toISOString(),
    engineVersion: SCORING_ENGINE_VERSION,
    areaIq,
    investment,
    legal,
    builder,
    location,
    priceFairness,
  };
}

function clampGrowthTrend(growthPercent: number): number {
  // Map annual-ish growth into 40–95 band
  return Math.round(Math.min(100, Math.max(0, 50 + growthPercent * 4)));
}

/** Compact card scores — never "—" */
export function toPropertyCardScores(
  report: PropertyIntelligenceReport | null | undefined,
): PropertyCardScores {
  const empty = (label = INSUFFICIENT_DATA) => ({
    available: false as const,
    score: null,
    label,
    displayValue: INSUFFICIENT_DATA,
    confidence: null,
    confidenceLabel: null,
  });

  if (!report) {
    return {
      areaIq: empty(),
      legal: empty(),
      investment: empty(),
    };
  }

  const map = (r: ScoredResult) =>
    r.available && r.score != null
      ? {
          available: true as const,
          score: r.score,
          label: r.label,
          displayValue: String(r.score),
          confidence: r.confidence.value,
          confidenceLabel: r.confidence.displayValue,
        }
      : empty(r.label);

  return {
    areaIq: map(report.areaIq),
    legal: map(report.legal),
    investment: map(report.investment),
  };
}

/**
 * Lightweight card scoring from listing fields alone (no analytics round-trip).
 * Used on home/catalog when full engine hasn't run. Still deterministic.
 */
export function scorePropertyCardFromListing(input: {
  propertyId: string;
  amenities: string[];
  nearbyPlaces?: { type?: string; distance?: string }[];
  legalFlags: Partial<LegalVerificationFlags> | null;
  legalVerificationAttempted?: boolean;
  reraNumber?: string | null;
  growthScore?: number | null;
  possession?: string | null;
  status?: string | null;
  builderVerifiedScore?: number | null;
  builderName?: string | null;
  city?: string | null;
  location?: string | null;
  price?: number | null;
  areaSqft?: number | null;
  bedrooms?: number | null;
  imageCount?: number | null;
}): PropertyCardScores {
  const report = runPropertyIntelligenceScoring(
    {
      propertyId: input.propertyId,
      amenities: input.amenities,
      nearbyPlaces: input.nearbyPlaces ?? [],
      legalFlags: input.legalFlags,
      legalVerificationAttempted: input.legalVerificationAttempted,
      reraNumber: input.reraNumber,
      possession: input.possession,
      status: input.status,
      builderName: input.builderName,
      city: input.city,
      location: input.location,
      price: input.price,
      areaSqft: input.areaSqft,
      bedrooms: input.bedrooms,
      imageCount: input.imageCount,
      builder: {
        verifiedAreaiqScore: input.builderVerifiedScore ?? null,
      },
    },
    null,
  );

  const cards = toPropertyCardScores(report);
  if (
    !cards.investment?.available &&
    typeof input.growthScore === "number" &&
    input.growthScore > 0
  ) {
    cards.investment = {
      available: true,
      score: Math.round(input.growthScore),
      label: "Stored",
      displayValue: String(Math.round(input.growthScore)),
      confidence: null,
      confidenceLabel: null,
    };
  }
  return cards;
}

export function buildAdminBreakdown(
  report: PropertyIntelligenceReport,
  rawInputs: Record<string, unknown>,
  weightConfigId: string | null = null,
): ScoreAdminBreakdown {
  const missingData = [
    ...report.areaIq.confidence.missingFactors.map((f) => `AreaIQ: ${f}`),
    ...report.investment.confidence.missingFactors.map((f) => `Investment: ${f}`),
    ...report.legal.confidence.missingFactors.map((f) => `Legal: ${f}`),
    ...report.builder.confidence.missingFactors.map((f) => `Builder: ${f}`),
    ...report.location.confidence.missingFactors.map((f) => `Location: ${f}`),
  ];

  return {
    report,
    rawInputs,
    missingData,
    weightConfigId,
  };
}

export function insufficientCardMessage(): string {
  return INSUFFICIENT_DATA_CTA;
}
