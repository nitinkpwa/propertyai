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
import type { AreaIntelligenceReport, MarketContext, MarketListing } from "@/lib/intelligence/types";
import { UNAVAILABLE_MESSAGE } from "@/lib/intelligence/types";
import { pricePerSqft } from "@/lib/intelligence/utils";
import type { PropertyStructuredMeta } from "@/lib/properties/nearbyPlacesMeta";

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
};

function metric(
  label: string,
  value: number | null,
  suffix = "",
): ScoreMetric {
  if (value === null || Number.isNaN(value)) {
    return { label, value: null, displayValue: "—", available: false };
  }
  const rounded = Math.round(Math.min(100, Math.max(0, value)));
  return {
    label,
    value: rounded,
    displayValue: suffix ? `${rounded}${suffix}` : String(rounded),
    available: true,
  };
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

function buildScores(input: BundleInput): PropertyIntelligenceBundle["scores"] {
  const { report, amenities, reraVerified, market, status } = input;
  const investment = numFromMetric(report?.investmentScore);
  const growth = numFromMetric(report?.growthScore);
  const rentalRaw = numFromMetric(report?.rentalYield);
  const rentalScore =
    rentalRaw !== null ? Math.min(100, Math.round(rentalRaw * 12)) : null;
  const demand = numFromMetric(report?.demandIndex);
  const builder = builderNumericScore(report);
  const connectivity = connectivityNumeric(report);
  const legal = reraVerified ? 82 : report?.builderAnalysis.reraCompliance.available ? 68 : null;
  const amenityScore =
    amenities.length > 0 ? Math.min(100, 35 + amenities.length * 8) : null;
  const location =
    growth !== null || demand !== null
      ? Math.round(((growth ?? 50) * 0.6 + (demand ?? 50) * 0.4))
      : null;
  const liquidity =
    market.totalListings > 0
      ? Math.min(100, 40 + Math.min(40, market.totalListings * 2) + (market.newListings90d > 0 ? 10 : 0))
      : null;
  const areaIqParts = [investment, growth, rentalScore, builder, connectivity].filter(
    (v): v is number => v !== null,
  );
  const areaIq =
    areaIqParts.length > 0
      ? Math.round(areaIqParts.reduce((a, b) => a + b, 0) / areaIqParts.length)
      : null;

  const availabilityScore =
    status.toLowerCase().includes("available") || status === "active" ? 88 : 55;

  return {
    areaIq: metric("AreaIQ Score", areaIq),
    investment: metric("Investment", investment),
    rental: metric("Rental", rentalScore),
    builder: metric("Builder", builder),
    legal: metric("Legal", legal),
    location: metric("Location", location),
    amenities: metric("Amenities", amenityScore),
    connectivity: metric("Connectivity", connectivity),
    liquidity: metric("Liquidity", liquidity),
    futureGrowth: metric("Future Growth", growth),
    demand: metric("Demand", demand),
    availability: metric("Availability", availabilityScore),
  };
}

function buildPriceAnalysis(input: BundleInput): PriceAnalysisData {
  const { price, pricePerSqFt, area, market, meta, report } = input;
  const buyListings = market.listings.filter((l) => l.type === "buy" && l.price > 0);
  const prices = buyListings.map((l) => l.price);
  const psfs = buyListings
    .map((l) => pricePerSqft(l.price, l.areaSqft))
    .filter((v): v is number => v !== null);

  const averageAreaPrice =
    prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
  const averagePsf = market.medianPricePerSqft;
  const lowestPrice = prices.length ? Math.min(...prices) : null;
  const highestPrice = prices.length ? Math.max(...prices) : null;
  const lowestPsf = psfs.length ? Math.min(...psfs) : null;
  const highestPsf = psfs.length ? Math.max(...psfs) : null;

  let priceTrendPercent: number | null = null;
  if (
    market.recentMedianPricePerSqft !== null &&
    market.olderMedianPricePerSqft !== null &&
    market.olderMedianPricePerSqft > 0
  ) {
    priceTrendPercent =
      ((market.recentMedianPricePerSqft - market.olderMedianPricePerSqft) /
        market.olderMedianPricePerSqft) *
      100;
  }

  const fairValuePsf = averagePsf;
  const fairValueEstimate =
    fairValuePsf !== null && area > 0 ? Math.round(fairValuePsf * area) : averageAreaPrice;

  let marketPosition: MarketPosition = "Unknown";
  if (fairValuePsf !== null && pricePerSqFt > 0) {
    const delta = (pricePerSqFt - fairValuePsf) / fairValuePsf;
    if (delta <= -0.08) marketPosition = "Undervalued";
    else if (delta >= 0.08) marketPosition = "Overpriced";
    else marketPosition = "Fair Value";
  }

  const compiled = meta?.ai?.compiled ?? {};
  const aiOpinion =
    compiled.priceAnalysis ||
    compiled.marketPosition ||
    (marketPosition === "Undervalued"
      ? "Listing price sits below area median — potential negotiation headroom for buyers."
      : marketPosition === "Overpriced"
        ? "Listing price is above area median — verify amenities and location premium before paying up."
        : marketPosition === "Fair Value"
          ? "Pricing aligns with comparable active listings in this locality."
          : UNAVAILABLE_MESSAGE);

  return {
    currentPrice: price,
    pricePerSqFt,
    averageAreaPrice,
    averagePsf,
    lowestPrice,
    highestPrice,
    lowestPsf,
    highestPsf,
    priceTrendPercent:
      priceTrendPercent !== null ? Math.round(priceTrendPercent * 10) / 10 : null,
    marketPosition,
    fairValuePsf,
    fairValueEstimate,
    aiOpinion,
    comparableCount: report?.marketSnapshot.comparableListings ?? buyListings.length,
  };
}

function projectValue(price: number, annualRate: number, years: number): number {
  return Math.round(price * Math.pow(1 + annualRate / 100, years));
}

function buildAppreciation(input: BundleInput): AppreciationData {
  const { price, meta, report } = input;
  const compiled = meta?.ai?.compiled ?? {};
  const fromMeta = parsePercent(meta?.pricing.expectedAppreciation);
  const fromCompiled = parsePercent(compiled.capitalAppreciation);
  const growth = numFromMetric(report?.growthScore);

  let baseAnnual = fromMeta ?? fromCompiled;
  if (baseAnnual !== null && baseAnnual > 40) {
    // Treat multi-year totals (e.g. "24%") as ~3y if large
    baseAnnual = Math.round((baseAnnual / 3) * 10) / 10;
  }
  if (baseAnnual === null && growth !== null) {
    baseAnnual = Math.round((4 + (growth / 100) * 8) * 10) / 10;
  }

  const balanced = baseAnnual ?? 6;
  const scenarios = (
    [
      ["Conservative", balanced * 0.7],
      ["Balanced", balanced],
      ["Aggressive", balanced * 1.35],
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
    baseAnnual !== null
      ? `Balanced rate derived from ${fromMeta || fromCompiled ? "listing/AI appreciation input" : "AreaIQ growth score"} (~${balanced}% p.a.).`
      : "Insufficient appreciation signal — showing illustrative mid-market rates.",
    "Actual returns depend on micro-location, delivery, interest rates, and local supply.",
    compiled.futureGrowth ? `Outlook: ${compiled.futureGrowth}` : "Infrastructure and demand shifts can accelerate or slow appreciation.",
  ].filter(Boolean);

  return {
    scenarios: scenarios as AppreciationData["scenarios"],
    assumptions,
    expectedGrowthLabel:
      compiled.capitalAppreciation ||
      meta?.pricing.expectedAppreciation ||
      (baseAnnual !== null ? `~${balanced}% p.a. (balanced)` : "Estimate pending"),
    baseAnnualRate: baseAnnual,
  };
}

function buildRental(input: BundleInput): RentalIntelData {
  const { price, meta, report } = input;
  const compiled = meta?.ai?.compiled ?? {};
  const fromMeta = parseMoney(meta?.pricing.rentalEstimate);
  const yieldPct = numFromMetric(report?.rentalYield);
  const expectedMonthlyRent =
    fromMeta ??
    (yieldPct !== null && price > 0 ? Math.round((price * (yieldPct / 100)) / 12) : null);
  const annualIncome = expectedMonthlyRent !== null ? expectedMonthlyRent * 12 : null;
  const computedYield =
    yieldPct ??
    (annualIncome !== null && price > 0
      ? Math.round((annualIncome / price) * 1000) / 10
      : null);

  const demand = numFromMetric(report?.demandIndex);
  const demandLabel =
    demand === null ? "Demand data pending" : demand >= 70 ? "High" : demand >= 45 ? "Moderate" : "Soft";
  const occupancyLabel =
    demand === null ? "—" : demand >= 70 ? "Strong (~90%+)" : demand >= 45 ? "Stable (~80%)" : "Variable";

  // Rough EMI proxy for cash flow (20y @ 8.5%, 20% down)
  let cashFlowEstimate: number | null = null;
  if (expectedMonthlyRent !== null && price > 0) {
    const loan = price * 0.8;
    const r = 0.085 / 12;
    const n = 20 * 12;
    const emi = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    cashFlowEstimate = Math.round(expectedMonthlyRent - emi);
  }

  const available = expectedMonthlyRent !== null || computedYield !== null;

  return {
    expectedMonthlyRent,
    annualIncome,
    yieldPercent: computedYield,
    occupancyLabel,
    demandLabel,
    cashFlowEstimate,
    roiLabel:
      computedYield !== null
        ? `${computedYield}% gross yield`
        : "ROI pending more rental comps",
    aiOpinion:
      compiled.rentalAnalysis ||
      (available
        ? "Rental figures are estimates from AreaIQ comps and listing inputs — validate with local brokers."
        : UNAVAILABLE_MESSAGE),
    available,
  };
}

function buildBuilder(input: BundleInput): BuilderIntelData {
  const { builderName, report, meta, reraVerified } = input;
  const compiled = meta?.ai?.compiled ?? {};
  const analysis = report?.builderAnalysis;
  const rating = builderNumericScore(report);
  const listingCount = numFromMetric(analysis?.listingCount);
  const activeCities = numFromMetric(analysis?.activeCities);

  return {
    name: builderName,
    overallRating: rating,
    projectsDelivered: listingCount,
    activeProjects: listingCount !== null ? Math.max(1, Math.round(listingCount * 0.4)) : null,
    deliveryRecord:
      rating !== null && rating >= 70
        ? "Generally reliable based on listing footprint"
        : rating !== null
          ? "Mixed signal — verify delivery history"
          : "Delivery record not available",
    constructionQuality: meta?.specs.constructionQuality || "Not assessed from listing facts",
    legalIssues: reraVerified
      ? "RERA verified on this listing"
      : analysis?.reraCompliance.displayValue || "Legal diligence recommended",
    customerReviews: "Aggregated public reviews not linked yet",
    financialStability:
      activeCities !== null && activeCities >= 2
        ? "Multi-city presence suggests operational scale"
        : "Financial stability not independently verified",
    averageDeliveryDelay: "Not available from current data sources",
    summary:
      compiled.builderReputationSummary ||
      report?.builderReputation.displayValue ||
      `${builderName} — review RERA status and past deliveries before booking.`,
    reraCompliance: analysis?.reraCompliance.displayValue || (reraVerified ? "RERA listed" : "Unknown"),
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
  const scores = buildScores(input);
  const compiled = input.meta?.ai?.compiled ?? {};

  return {
    scores,
    priceAnalysis: buildPriceAnalysis(input),
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
  } else if (bundle?.priceAnalysis.marketPosition === "Fair Value") {
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
    investmentScore:
      parsePercent(compiled.investmentScore) ??
      bundle?.scores.investment.value ??
      fallback.investmentScore,
    riskLevel: fallback.riskLevel,
    bullets: uniqueBullets.length
      ? uniqueBullets
      : [summary, ...fallback.pros].slice(0, 6),
  };
}
