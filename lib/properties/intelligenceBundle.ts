import type { PropertyCardProps } from "@/app/components/PropertyCard";
import type {
  AppreciationData,
  AreaIntelData,
  BuilderIntelData,
  CompareNearbyData,
  MarketPosition,
  PriceAnalysisData,
  ProjectTimelineData,
  PropertyIntelligenceBundle,
  RecommendedProperty,
  RecommendationReason,
  RentalIntelData,
  ScoreMetric,
  SimilarSalesData,
} from "@/app/property/[id]/data";
import { formatPrice } from "@/app/property/[id]/data";
import type { PropertyAnalyticsReport } from "@/lib/analytics/types";
import {
  INSUFFICIENT_DATA,
  WAITING_MARKET_DATA,
} from "@/lib/analytics/types";
import type { AreaIntelligenceReport, MarketContext, MarketListing } from "@/lib/intelligence/types";
import { UNAVAILABLE_MESSAGE } from "@/lib/intelligence/types";
import { pricePerSqft } from "@/lib/intelligence/utils";
import type { LegalVerificationFlags } from "@/lib/properties/legalCompliance";
import type { PropertyStructuredMeta } from "@/lib/properties/nearbyPlacesMeta";
import {
  runPropertyIntelligenceScoring,
  type PropertyIntelligenceReport,
} from "@/lib/scoring";
import { INSUFFICIENT_DATA as SCORING_INSUFFICIENT } from "@/lib/scoring/types";

type BundleInput = {
  id: string;
  name: string;
  price: number;
  pricePerSqFt: number;
  area: number;
  status: string;
  possession: string;
  city: string;
  location: string;
  builderName: string;
  amenities: string[];
  reraVerified: boolean;
  aiVerified: boolean;
  report: AreaIntelligenceReport | null;
  meta: PropertyStructuredMeta | null;
  market: MarketContext;
  similarProperties: PropertyCardProps[];
  nearbyPlaces?: { name: string; distance: string; type: string }[];
  /** Verified Analytics Engine output — preferred over heuristics */
  analytics?: PropertyAnalyticsReport | null;
  /** Legal verification flags for Legal Score pillar */
  legalFlags?: Partial<LegalVerificationFlags> | null;
  reraNumber?: string | null;
  legalVerificationAttempted?: boolean;
  views?: number | null;
  bedrooms?: number | null;
  imageCount?: number | null;
};

function metric(
  label: string,
  value: number | null,
  opts?: {
    suffix?: string;
    confidence?: number | null;
    basedOn?: string | null;
  },
): ScoreMetric {
  if (value === null || Number.isNaN(value)) {
    return {
      label,
      value: null,
      displayValue: INSUFFICIENT_DATA,
      available: false,
      confidence: null,
      confidenceLabel: null,
      basedOn: opts?.basedOn ?? null,
    };
  }
  const rounded = Math.round(Math.min(100, Math.max(0, value)));
  const suffix = opts?.suffix ?? "";
  return {
    label,
    value: rounded,
    displayValue: suffix ? `${rounded}${suffix}` : String(rounded),
    available: true,
    confidence: opts?.confidence ?? null,
    confidenceLabel:
      opts?.confidence != null ? `${Math.round(opts.confidence)}%` : null,
    basedOn: opts?.basedOn ?? null,
  };
}

function scoredToMetric(
  label: string,
  scored: {
    available: boolean;
    score: number | null;
    confidence: { value: number | null; basedOn: string };
  },
): ScoreMetric {
  if (!scored.available || scored.score == null) {
    return metric(label, null, { basedOn: scored.confidence.basedOn });
  }
  return metric(label, scored.score, {
    confidence: scored.confidence.value,
    basedOn: scored.confidence.basedOn,
  });
}

function numFromMetric(m: { available: boolean; value: number | string | null } | undefined): number | null {
  if (!m?.available || typeof m.value !== "number") return null;
  return m.value;
}

function parseMoney(raw: string | undefined | null): number | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.replace(/,/g, "").trim().toLowerCase();
  const cr = cleaned.match(/([\d.]+)\s*cr/);
  if (cr) return Math.round(parseFloat(cr[1]) * 10_000_000);
  const lakh = cleaned.match(/([\d.]+)\s*l/);
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100_000);
  const digits = cleaned.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const n = parseFloat(digits);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parsePercent(raw: string | undefined | null): number | null {
  if (!raw?.trim()) return null;
  const match = raw.match(/([\d.]+)\s*%?/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

function splitList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[|;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function builderNumericScore(report: AreaIntelligenceReport | null): number | null {
  if (!report) return null;
  const listing = numFromMetric(report.builderAnalysis.listingCount);
  const cities = numFromMetric(report.builderAnalysis.activeCities);
  const reraOk = report.builderAnalysis.reraCompliance.available
    ? report.builderAnalysis.reraCompliance.displayValue.toLowerCase().includes("registered") ||
      report.builderAnalysis.reraCompliance.displayValue.toLowerCase().includes("yes")
    : false;
  if (listing === null && cities === null && !reraOk) return null;
  let score = 45;
  if (listing !== null) score += Math.min(25, listing * 4);
  if (cities !== null) score += Math.min(15, cities * 5);
  if (reraOk) score += 15;
  return Math.min(100, score);
}

function connectivityNumeric(report: AreaIntelligenceReport | null): number | null {
  if (!report) return null;
  const parts = [report.connectivity.airport, report.connectivity.metro, report.connectivity.highways];
  const available = parts.filter((p) => p.available).length;
  if (available === 0) return null;
  return Math.min(100, 40 + available * 20);
}

function scoredResultToMetric(
  label: string,
  result: {
    available: boolean;
    score: number | null;
    displayValue: string;
    confidence: { value: number | null; basedOn: string; displayValue: string };
    message: string | null;
  },
): ScoreMetric {
  if (!result.available || result.score == null) {
    return metric(label, null, {
      basedOn: result.message || result.confidence.basedOn || SCORING_INSUFFICIENT,
    });
  }
  return metric(label, result.score, {
    confidence: result.confidence.value,
    basedOn: result.confidence.basedOn,
  });
}

function runScoring(input: BundleInput): PropertyIntelligenceReport {
  const rentalRaw = numFromMetric(input.report?.rentalYield);
  return runPropertyIntelligenceScoring(
    {
      propertyId: input.id,
      amenities: input.amenities,
      nearbyPlaces: input.nearbyPlaces ?? [],
      legalFlags: input.legalFlags ?? null,
      legalVerificationAttempted: input.legalVerificationAttempted,
      reraNumber: input.reraNumber ?? (input.reraVerified ? "verified" : null),
      possession: input.possession,
      status: input.status,
      views: input.views ?? null,
      marketAvgViews: input.market.avgViews,
      totalListings: input.market.totalListings,
      rentalYieldPercent: rentalRaw,
      builderName: input.builderName,
      city: input.city,
      location: input.location,
      price: input.price,
      areaSqft: input.area,
      bedrooms: input.bedrooms ?? null,
      imageCount: input.imageCount ?? null,
      builder: {
        projectsDelivered: numFromMetric(input.report?.builderAnalysis.listingCount),
        verifiedAreaiqScore:
          input.analytics?.builder.available && input.analytics.builder.score != null
            ? input.analytics.builder.score
            : null,
      },
    },
    input.analytics ?? null,
  );
}

function buildScores(
  input: BundleInput,
  scoring: PropertyIntelligenceReport,
): PropertyIntelligenceBundle["scores"] {
  const analytics = input.analytics;
  const report = input.report;
  const rentalRaw = numFromMetric(report?.rentalYield);
  const rentalScore =
    rentalRaw !== null ? Math.min(100, Math.round(rentalRaw * 12)) : null;
  const demand = numFromMetric(report?.demandIndex);

  const amenityFactor = analytics?.investment.factors.find((f) => f.key === "amenities");
  const connectivityFactor = analytics?.investment.factors.find(
    (f) => f.key === "connectivity",
  );

  const futureGrowth: ScoreMetric =
    analytics?.growth.available && analytics.growth.rangeLabel
      ? {
          label: "Future Growth",
          value: null,
          displayValue: analytics.growth.rangeLabel,
          available: true,
          confidence: analytics.growth.confidence.value,
          confidenceLabel: analytics.growth.confidence.displayValue,
          basedOn: analytics.growth.confidence.basedOn,
        }
      : metric("Future Growth", null, {
          basedOn: analytics?.growth.confidence.basedOn ?? WAITING_MARKET_DATA,
        });

  const liquidity = analytics
    ? scoredToMetric("Liquidity", analytics.liquidity)
    : metric("Liquidity", null, { basedOn: WAITING_MARKET_DATA });

  return {
    areaIq: scoredResultToMetric("AreaIQ Score", scoring.areaIq),
    investment: scoredResultToMetric("Investment", scoring.investment),
    rental: metric("Rental", rentalScore, {
      basedOn:
        rentalScore != null
          ? "Derived from verified rent comps"
          : "Insufficient rent comps",
    }),
    builder: scoredResultToMetric("Builder", scoring.builder),
    legal: scoredResultToMetric("Legal", scoring.legal),
    location: scoredResultToMetric("Location", scoring.location),
    amenities: metric("Amenities", amenityFactor?.score ?? null, {
      basedOn: amenityFactor?.available
        ? "Listed amenities count"
        : input.amenities.length > 0
          ? "Listed amenities count"
          : INSUFFICIENT_DATA,
    }),
    connectivity: metric("Connectivity", connectivityFactor?.score ?? null, {
      basedOn: connectivityFactor?.available
        ? "Nearby places on listing"
        : (input.nearbyPlaces?.length ?? 0) > 0
          ? "Nearby places on listing"
          : INSUFFICIENT_DATA,
    }),
    liquidity,
    futureGrowth,
    demand: metric("Demand", demand, {
      basedOn: demand != null ? "Views vs market average" : INSUFFICIENT_DATA,
    }),
    availability: metric("Availability", null, {
      basedOn: "Availability score requires verified inventory velocity data",
    }),
  };
}

function buildPriceAnalysis(input: BundleInput): PriceAnalysisData {
  const { price, pricePerSqFt, analytics } = input;

  if (analytics) {
    const p = analytics.price;
    const fv = analytics.fairValue;
      const position: MarketPosition = p.available
      ? p.marketPosition === "Fairly Priced"
        ? "Fair Value"
        : p.marketPosition === "Undervalued"
          ? "Undervalued"
          : p.marketPosition === "Overpriced"
            ? "Overpriced"
            : "Insufficient verified data"
      : "Insufficient verified data";

    const trend =
      analytics.priceTrend.available && analytics.priceTrend.points.length >= 2
        ? analytics.priceTrend.points[analytics.priceTrend.points.length - 1]?.growthPercent
        : null;

    return {
      currentPrice: p.currentTotalPrice ?? price,
      pricePerSqFt: p.currentPricePerSqft ?? pricePerSqFt,
      averageAreaPrice: fv.expected,
      averagePsf: p.averagePsf,
      medianPsf: p.medianPsf,
      lowestPrice: p.lowestPsf != null && input.area > 0 ? Math.round(p.lowestPsf * input.area) : null,
      highestPrice:
        p.highestPsf != null && input.area > 0 ? Math.round(p.highestPsf * input.area) : null,
      lowestPsf: p.lowestPsf,
      highestPsf: p.highestPsf,
      differencePercent: p.differencePercent,
      priceRankLabel: p.priceRankLabel,
      priceTrendPercent: trend,
      marketPosition: position,
      fairValuePsf: fv.averagePsf,
      fairValueEstimate: fv.expected,
      fairValueLow: fv.low,
      fairValueHigh: fv.high,
      aiOpinion: analytics.priceOpinion,
      comparableCount: p.comparableCount,
      confidence: p.confidence.value,
      confidenceLabel: p.confidence.displayValue,
      basedOn: p.confidence.basedOn,
      available: p.available,
      unavailableMessage: p.available ? null : p.message,
    };
  }

  return {
    currentPrice: price,
    pricePerSqFt,
    averageAreaPrice: null,
    averagePsf: null,
    medianPsf: null,
    lowestPrice: null,
    highestPrice: null,
    lowestPsf: null,
    highestPsf: null,
    differencePercent: null,
    priceRankLabel: null,
    priceTrendPercent: null,
    marketPosition: "Insufficient verified data",
    fairValuePsf: null,
    fairValueEstimate: null,
    fairValueLow: null,
    fairValueHigh: null,
    aiOpinion: INSUFFICIENT_DATA,
    comparableCount: 0,
    confidence: null,
    confidenceLabel: INSUFFICIENT_DATA,
    basedOn: WAITING_MARKET_DATA,
    available: false,
    unavailableMessage: WAITING_MARKET_DATA,
  };
}

function projectValue(price: number, annualRate: number, years: number): number {
  return Math.round(price * Math.pow(1 + annualRate / 100, years));
}

function buildAppreciation(input: BundleInput): AppreciationData {
  const { price, analytics } = input;

  // Only project when Analytics Engine produced a verified growth RANGE
  if (!analytics?.growth.available || analytics.growth.lowPercent == null) {
    return {
      scenarios: [],
      assumptions: [
        INSUFFICIENT_DATA,
        "AreaIQ does not invent appreciation percentages without verified market signals.",
      ],
      expectedGrowthLabel: INSUFFICIENT_DATA,
      baseAnnualRate: null,
    };
  }

  const low = analytics.growth.lowPercent;
  const high = analytics.growth.highPercent ?? low + 2;
  const balanced = Math.round(((low + high) / 2) * 10) / 10;

  const scenarios = (
    [
      ["Conservative", low],
      ["Balanced", balanced],
      ["Aggressive", high],
    ] as const
  ).map(([label, rate]) => ({
    label,
    annualRatePercent: Math.round(rate * 10) / 10,
    year1: projectValue(price, rate, 1),
    year3: projectValue(price, rate, 3),
    year5: projectValue(price, rate, 5),
  }));

  const assumptions = [
    "Scenarios compound annually from the current listed price.",
    `Expected growth range from Analytics Engine: ${analytics.growth.rangeLabel}.`,
    ...analytics.growth.signals.map((s) => `Signal: ${s}`),
    `Confidence ${analytics.growth.confidence.displayValue} — ${analytics.growth.confidence.basedOn}.`,
  ];

  return {
    scenarios: scenarios as AppreciationData["scenarios"],
    assumptions,
    expectedGrowthLabel: analytics.growth.rangeLabel ?? INSUFFICIENT_DATA,
    baseAnnualRate: balanced,
  };
}

function buildRental(input: BundleInput): RentalIntelData {
  const { price, report } = input;
  const yieldPct = numFromMetric(report?.rentalYield);
  const expectedMonthlyRent =
    yieldPct !== null && price > 0 ? Math.round((price * (yieldPct / 100)) / 12) : null;
  const annualIncome = expectedMonthlyRent !== null ? expectedMonthlyRent * 12 : null;
  const computedYield =
    yieldPct ??
    (annualIncome !== null && price > 0
      ? Math.round((annualIncome / price) * 1000) / 10
      : null);

  const demand = numFromMetric(report?.demandIndex);
  const demandLabel =
    demand === null
      ? INSUFFICIENT_DATA
      : demand >= 70
        ? "High"
        : demand >= 45
          ? "Moderate"
          : "Soft";
  // Never invent occupancy percentages
  const occupancyLabel = INSUFFICIENT_DATA;

  const available = yieldPct !== null;

  return {
    expectedMonthlyRent: available ? expectedMonthlyRent : null,
    annualIncome: available ? annualIncome : null,
    yieldPercent: available ? computedYield : null,
    occupancyLabel,
    demandLabel,
    cashFlowEstimate: null,
    roiLabel:
      computedYield !== null
        ? `${computedYield}% gross yield (from verified rent comps)`
        : INSUFFICIENT_DATA,
    aiOpinion: available
      ? `Gross yield ${computedYield}% is calculated from verified rent comps versus listed price. Occupancy is not estimated without lease data.`
      : INSUFFICIENT_DATA,
    available,
  };
}

function buildBuilder(input: BundleInput): BuilderIntelData {
  const { builderName, report, reraVerified, analytics } = input;
  const analysis = report?.builderAnalysis;
  const listingCount = numFromMetric(analysis?.listingCount);

  if (analytics) {
    return {
      name: builderName,
      overallRating: analytics.builder.available ? analytics.builder.score : null,
      projectsDelivered: listingCount,
      activeProjects: null,
      deliveryRecord: analytics.builder.available
        ? `Builder score ${analytics.builder.score}/100 — ${analytics.builder.confidence.basedOn}`
        : INSUFFICIENT_DATA,
      constructionQuality: INSUFFICIENT_DATA,
      legalIssues: analytics.legal.message || INSUFFICIENT_DATA,
      customerReviews: INSUFFICIENT_DATA,
      financialStability: INSUFFICIENT_DATA,
      averageDeliveryDelay: INSUFFICIENT_DATA,
      summary: analytics.builder.available
        ? `Verified builder score ${analytics.builder.score}/100 (confidence ${analytics.builder.confidence.displayValue}).`
        : INSUFFICIENT_DATA,
      reraCompliance: reraVerified
        ? "RERA indicated on listing"
        : analysis?.reraCompliance.displayValue || INSUFFICIENT_DATA,
    };
  }

  return {
    name: builderName,
    overallRating: null,
    projectsDelivered: listingCount,
    activeProjects: null,
    deliveryRecord: INSUFFICIENT_DATA,
    constructionQuality: INSUFFICIENT_DATA,
    legalIssues: INSUFFICIENT_DATA,
    customerReviews: INSUFFICIENT_DATA,
    financialStability: INSUFFICIENT_DATA,
    averageDeliveryDelay: INSUFFICIENT_DATA,
    summary: INSUFFICIENT_DATA,
    reraCompliance: reraVerified
      ? "RERA indicated on listing"
      : analysis?.reraCompliance.displayValue || INSUFFICIENT_DATA,
  };
}

function trendBetween(newer: number | null, older: number | null): number | null {
  if (newer === null || older === null || older <= 0) return null;
  return Math.round(((newer - older) / older) * 1000) / 10;
}

function buildSimilarSales(input: BundleInput): SimilarSalesData {
  const buy = input.market.listings
    .filter((l) => l.type === "buy" && l.price > 0)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const comps = buy.slice(0, 8).map((l: MarketListing) => ({
    id: l.id,
    title: `${l.bedrooms ? `${l.bedrooms} BHK · ` : ""}${l.location}`,
    price: l.price,
    pricePerSqFt: pricePerSqft(l.price, l.areaSqft),
    areaSqft: l.areaSqft,
    location: l.location,
    builderName: l.builderName,
    listedAt: l.createdAt,
    href: `/property/${l.id}`,
  }));

  const prices = comps.map((c) => c.price);
  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const recent30 = buy.filter((l) => now - new Date(l.createdAt).getTime() <= monthMs);
  const prior30 = buy.filter((l) => {
    const age = now - new Date(l.createdAt).getTime();
    return age > monthMs && age <= monthMs * 2;
  });
  const recent90 = buy.filter((l) => now - new Date(l.createdAt).getTime() <= monthMs * 3);
  const prior90 = buy.filter((l) => {
    const age = now - new Date(l.createdAt).getTime();
    return age > monthMs * 3 && age <= monthMs * 6;
  });
  const recent365 = buy.filter((l) => now - new Date(l.createdAt).getTime() <= monthMs * 12);
  const prior365 = buy.filter((l) => {
    const age = now - new Date(l.createdAt).getTime();
    return age > monthMs * 12 && age <= monthMs * 24;
  });

  const avgPsf = (list: MarketListing[]) => {
    const vals = list
      .map((l) => pricePerSqft(l.price, l.areaSqft))
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  return {
    comps,
    averagePrice: prices.length
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null,
    highestPrice: prices.length ? Math.max(...prices) : null,
    lowestPrice: prices.length ? Math.min(...prices) : null,
    monthlyTrendPercent: trendBetween(avgPsf(recent30), avgPsf(prior30)),
    quarterlyTrendPercent: trendBetween(avgPsf(recent90), avgPsf(prior90)),
    yearlyTrendPercent: trendBetween(avgPsf(recent365), avgPsf(prior365)),
    note: "Comparable active listings in this area — not closed transaction records. AreaIQ will upgrade to registry sales when available.",
  };
}

function buildCompareNearby(input: BundleInput, scores: PropertyIntelligenceBundle["scores"]): CompareNearbyData {
  const candidates = input.similarProperties.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    area: p.area,
    builderName: p.builderName ?? "—",
    roi: p.growthScore,
    rentalYield: p.rentalYield,
    amenityCount: null as number | null,
    futureGrowth: p.growthScore,
    areaIqScore: p.growthScore !== null && p.rentalYield !== null
      ? Math.round((p.growthScore + Math.min(100, p.rentalYield * 12)) / 2)
      : p.growthScore,
    href: p.href ?? `/property/${p.id}`,
  }));

  const compiled = input.meta?.ai?.compiled ?? {};
  let aiVerdict = compiled.aiRecommendation || compiled.comparableProperties || "";
  if (!aiVerdict && candidates.length > 0) {
    const cheaper = candidates.filter((c) => c.price < input.price).length;
    const betterGrowth = candidates.filter(
      (c) => (c.futureGrowth ?? 0) > (scores.futureGrowth.value ?? 0),
    ).length;
    aiVerdict =
      cheaper > candidates.length / 2
        ? "Nearby listings often price lower — use them as negotiation anchors."
        : betterGrowth > 0
          ? "Some nearby options show stronger growth signals — compare amenities and builder carefully."
          : "This listing holds up against nearby active comps on price and growth signals.";
  }
  if (!aiVerdict) aiVerdict = "Add more nearby listings to generate a comparison verdict.";

  return { candidates, aiVerdict };
}

function buildRecommendations(
  input: BundleInput,
  scores: PropertyIntelligenceBundle["scores"],
): RecommendedProperty[] {
  const currentGrowth = scores.futureGrowth.value ?? 0;
  const currentRental = scores.rental.value ?? 0;
  const currentPsf = input.pricePerSqFt;
  const hasMetroSignal = Boolean(
    input.meta?.location.upcomingMetro ||
      input.nearbyPlaces?.some((p) => p.type === "metro"),
  );

  return input.similarProperties.slice(0, 4).map((property) => {
    const reasons: RecommendationReason[] = [];
    if (property.growthScore !== null && property.growthScore > currentGrowth + 5) {
      reasons.push("Higher Appreciation");
    }
    if (
      property.rentalYield !== null &&
      property.rentalYield * 12 > currentRental + 5
    ) {
      reasons.push("Higher Rental");
    }
    if (property.growthScore !== null && property.rentalYield !== null) {
      const roiProxy = (property.growthScore + property.rentalYield * 10) / 2;
      const currentRoi = (currentGrowth + currentRental) / 2;
      if (roiProxy > currentRoi + 5) reasons.push("Better ROI");
    }
    if (currentPsf > 0 && property.area > 0) {
      const psf = Math.round(property.price / property.area);
      if (psf < currentPsf * 0.92) reasons.push("Better Value");
    }
    if (
      property.builderName &&
      property.builderName !== input.builderName &&
      (property.growthScore ?? 0) >= currentGrowth
    ) {
      reasons.push("Better Builder");
    }
    if (hasMetroSignal && (property.growthScore ?? 0) >= 65) {
      reasons.push("Near Metro");
    }

    const unique = [...new Set(reasons)].slice(0, 3);
    if (unique.length === 0) unique.push("Better Value");

    const why = unique
      .map((r) => {
        switch (r) {
          case "Higher Appreciation":
            return `Stronger growth score (${property.growthScore}/100)`;
          case "Higher Rental":
            return `Higher rental yield (~${property.rentalYield}%)`;
          case "Better ROI":
            return "Better blended investment signal vs this listing";
          case "Better Value":
            return "Lower price per sq ft relative to this property";
          case "Better Builder":
            return `Alternative builder: ${property.builderName}`;
          case "Near Metro":
            return "Location signals suggest stronger connectivity demand";
          default:
            return r;
        }
      })
      .join(" · ");

    return { property, reasons: unique, why };
  });
}

function buildTimeline(input: BundleInput): ProjectTimelineData {
  const status = `${input.status} ${input.possession} ${input.meta?.basic.propertyStatus ?? ""}`.toLowerCase();
  const ready =
    status.includes("ready") ||
    status.includes("immediate") ||
    input.possession.toLowerCase().includes("ready");
  const underConstruction =
    status.includes("construction") ||
    status.includes("under") ||
    input.meta?.basic.propertyStatus === "under_construction";

  let progressPercent = 55;
  if (ready) progressPercent = 100;
  else if (underConstruction) progressPercent = 65;
  else if (status.includes("new") || status.includes("launch")) progressPercent = 25;

  const milestones: ProjectTimelineData["milestones"] = [
    {
      id: "launch",
      label: "Project Launch",
      status: "done",
      detail: "Listing active on AreaIQ",
    },
    {
      id: "approvals",
      label: "Approvals & RERA",
      status: input.reraVerified ? "done" : "current",
      detail: input.reraVerified ? "RERA verified on listing" : "Confirm RERA registration",
    },
    {
      id: "construction",
      label: "Construction Progress",
      status: ready ? "done" : underConstruction ? "current" : "upcoming",
      detail: ready
        ? "Marked ready to move"
        : underConstruction
          ? "Under construction — verify site progress"
          : "Timeline not confirmed",
    },
    {
      id: "completion",
      label: "Completion",
      status: ready ? "done" : "upcoming",
      detail: input.possession || "Possession date TBD",
    },
    {
      id: "handover",
      label: "Handover",
      status: ready ? "current" : "upcoming",
      detail: ready ? "Ready for possession / handover" : "After completion milestone",
    },
  ];

  return {
    progressPercent,
    milestones,
    completionLabel: input.possession || "Not specified",
    handoverLabel: ready ? "Available now" : input.possession || "Pending",
    note: "Timeline is inferred from listing status and possession fields — confirm with the builder before booking.",
  };
}

function buildArea(input: BundleInput): AreaIntelData {
  const { report, meta, market, nearbyPlaces } = input;
  const compiled = meta?.ai?.compiled ?? {};
  const loc = meta?.location;

  const placeValue = (type: string, metaDistance?: string) => {
    if (metaDistance?.trim()) return { value: metaDistance, available: true };
    const match = (nearbyPlaces ?? []).find((p) => p.type === type);
    if (match) return { value: match.distance, available: true };
    return { value: "—", available: false };
  };

  const school = placeValue("school", loc?.schoolDistance);
  const hospital = placeValue("hospital", loc?.hospitalDistance);
  const metro = placeValue("metro", loc?.upcomingMetro);
  const airport = placeValue("airport", loc?.airportDistance);
  const shopping = placeValue("mall", loc?.mallDistance);

  const signals = [
    { label: "Schools", ...school, detail: report?.schoolsNearby.displayValue },
    { label: "Hospitals", ...hospital, detail: report?.hospitalsNearby.displayValue },
    { label: "Metro", ...metro, detail: report?.connectivity.metro.displayValue },
    { label: "Airport", ...airport, detail: report?.connectivity.airport.displayValue },
    { label: "Shopping", ...shopping },
    {
      label: "Traffic",
      value: "—",
      available: false,
      detail: UNAVAILABLE_MESSAGE,
    },
    {
      label: "Pollution",
      value: "—",
      available: false,
      detail: UNAVAILABLE_MESSAGE,
    },
    {
      label: "Crime",
      value: "—",
      available: false,
      detail: UNAVAILABLE_MESSAGE,
    },
    {
      label: "Infrastructure",
      value: loc?.futureInfrastructure || report?.connectivity.highways.displayValue || "—",
      available: Boolean(loc?.futureInfrastructure || report?.connectivity.highways.available),
    },
    {
      label: "Future Projects",
      value: loc?.upcomingMetro || compiled.futureGrowth || "—",
      available: Boolean(loc?.upcomingMetro || compiled.futureGrowth),
    },
    {
      label: "Builder Activity",
      value:
        report?.builderAnalysis.listingCount.available
          ? `${report.builderAnalysis.listingCount.displayValue} listings`
          : "—",
      available: Boolean(report?.builderAnalysis.listingCount.available),
    },
    {
      label: "Demand",
      value: report?.demandIndex.displayValue ?? "—",
      available: Boolean(report?.demandIndex.available),
    },
    {
      label: "Supply",
      value: market.totalListings > 0 ? `${market.totalListings} active comps` : "—",
      available: market.totalListings > 0,
    },
  ];

  return {
    signals,
    futureProjects: compiled.futureGrowth || loc?.futureInfrastructure || "No future project notes on file.",
    demandSupply: `${market.buyListings} buy / ${market.rentListings} rent listings in scope.`,
    summary:
      compiled.areaSummary ||
      compiled.lifestyleSummary ||
      compiled.connectivityReview ||
      `${input.location}, ${input.city} — review connectivity and infrastructure signals below.`,
  };
}

export function buildPropertyIntelligenceBundle(input: BundleInput): PropertyIntelligenceBundle {
  const scoringReport = runScoring(input);
  const scores = buildScores(input, scoringReport);
  const compiled = input.meta?.ai?.compiled ?? {};
  const priceAnalysis = buildPriceAnalysis(input);

  // Prefer scoring-engine price fairness label when available
  if (
    scoringReport.priceFairness.available &&
    scoringReport.priceFairness.label !== SCORING_INSUFFICIENT
  ) {
    const label = scoringReport.priceFairness.label;
    if (
      label === "Undervalued" ||
      label === "Fair Value" ||
      label === "Overpriced" ||
      label === "Slightly Premium"
    ) {
      priceAnalysis.marketPosition = label;
    }
  }

  return {
    scores,
    scoringReport,
    priceAnalysis,
    appreciation: buildAppreciation(input),
    rental: buildRental(input),
    builder: buildBuilder(input),
    similarSales: buildSimilarSales(input),
    compareNearby: buildCompareNearby(input, scores),
    recommendations: buildRecommendations(input, scores),
    timeline: buildTimeline(input),
    area: buildArea(input),
    compiled,
  };
}

export function buildAiSummaryFromSources(
  fallback: {
    summary: string;
    pros: string[];
    cons: string[];
    investmentScore: number | null;
    riskLevel: "Low" | "Moderate" | "High" | null;
  },
  meta: PropertyStructuredMeta | null,
  bundle: PropertyIntelligenceBundle | null,
): {
  summary: string;
  pros: string[];
  cons: string[];
  investmentScore: number | null;
  riskLevel: "Low" | "Moderate" | "High" | null;
  bullets: string[];
} {
  const compiled = meta?.ai?.compiled ?? {};
  const summary =
    compiled.buyerSummary ||
    compiled.investmentSummary ||
    compiled.aiRecommendation ||
    compiled.propertySummary ||
    fallback.summary;

  const pros = splitList(compiled.pros);
  const cons = splitList(compiled.cons);

  const bullets: string[] = [];
  if (compiled.aiRecommendation) bullets.push(compiled.aiRecommendation);
  if (bundle?.appreciation.expectedGrowthLabel) {
    bullets.push(`Expected appreciation: ${bundle.appreciation.expectedGrowthLabel}`);
  }
  if (bundle?.rental.demandLabel && bundle.rental.available) {
    bullets.push(`${bundle.rental.demandLabel} rental demand`);
  }
  if (bundle?.builder.summary) bullets.push(bundle.builder.summary.split(".")[0] + ".");
  if (compiled.futureGrowth) bullets.push(compiled.futureGrowth);
  if (fallback.riskLevel) bullets.push(`${fallback.riskLevel} legal/investment risk profile`);
  if (bundle?.priceAnalysis.marketPosition === "Undervalued") {
    bullets.push("Market position: undervalued vs area comps");
  } else if (bundle?.priceAnalysis.marketPosition === "Overpriced") {
    bullets.push("Market position: above area comps — negotiate");
  } else if (
    bundle?.priceAnalysis.marketPosition === "Fair Value" ||
    bundle?.priceAnalysis.marketPosition === "Fairly Priced"
  ) {
    bullets.push("Priced near fair value for the locality");
  }
  if (bundle?.scores.liquidity.available && (bundle.scores.liquidity.value ?? 0) >= 65) {
    bullets.push("Good resale / liquidity signal from active comps");
  }

  const uniqueBullets = [...new Set(bullets.filter(Boolean))].slice(0, 8);

  return {
    summary,
    pros: pros.length ? pros : fallback.pros,
    cons: cons.length ? cons : fallback.cons,
    // Never prefer admin-pipeline invented scores over Analytics Engine
    investmentScore:
      bundle?.scores.investment.value ??
      fallback.investmentScore,
    riskLevel: fallback.riskLevel,
    bullets: uniqueBullets.length
      ? uniqueBullets
      : [summary, ...fallback.pros].slice(0, 6),
  };
}
