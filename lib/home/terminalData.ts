/**
 * Derived intelligence builders for the homepage terminal.
 * All metrics come from live listings + scoring — never fabricated time series.
 */

import type { ListingProperty } from "@/lib/properties/types";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { scorePropertyCardFromListing } from "@/lib/scoring/engine";
import type {
  AreaComparisonRow,
  BandLevel,
  BuilderLeaderboardRow,
  HeatTone,
  HeatmapCell,
  HeroStat,
  IntelligenceMapLayers,
  InvestmentGauge,
  InvestmentGrade,
  LiveActivityItem,
  MapAreaActivity,
  MapPointFeature,
  MapSuggestedQuestion,
  MapTopProject,
  MarketPulseMetric,
  MomentumLevel,
  StructuredSearchDefaults,
  TerminalBundle,
  TerminalChartSeries,
  TrendingLocationCard,
  TricityMapNode,
} from "./terminalTypes";
import {
  buildBuilderLinks,
  compareBestListings,
  distanceKm,
} from "./areaListingMarkers";
import {
  CHANDIGARH_AIRPORT,
  INTELLIGENCE_MAP_AREAS,
  MAP_AREA_MATCHERS,
  buildAreaPolygon,
  buildMajorRoadLines,
  getMapAreaRadiusKm,
} from "./intelligenceMapGeo";
import {
  collectCoordsToCache,
  persistListingCoords,
  resolveListingCoords,
  type CoordCachePayload,
} from "./listingCoords";
import { getAreaPlaceholderIntel } from "./areaPlaceholderIntel";
import {
  resolvePlace,
  resolvePlaceFromQuery,
} from "@/lib/location/resolve";

/** Grid positions for non-map heatmap UI (derived from lat/lng rank). */
function gridXY(lat: number, lng: number): { x: number; y: number } {
  const x = Math.min(90, Math.max(10, ((lng - 76.55) / 0.4) * 80 + 10));
  const y = Math.min(90, Math.max(10, ((30.9 - lat) / 0.4) * 80 + 10));
  return { x, y };
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function bandFromRatio(ratio: number | null): BandLevel {
  if (ratio == null || !Number.isFinite(ratio)) return "unknown";
  if (ratio >= 0.66) return "high";
  if (ratio >= 0.33) return "medium";
  return "low";
}

function bandFromScore(score: number | null): BandLevel {
  if (score == null || !Number.isFinite(score)) return "unknown";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function momentumFromGrowth(growth: number | null): MomentumLevel {
  if (growth == null || !Number.isFinite(growth)) return "unknown";
  if (growth >= 65) return "bullish";
  if (growth >= 40) return "neutral";
  return "bearish";
}

function heatTone(relative: number | null): HeatTone {
  if (relative == null || !Number.isFinite(relative)) return "neutral";
  if (relative >= 0.66) return "red";
  if (relative >= 0.33) return "yellow";
  return "green";
}

function labelBand(b: BandLevel): string {
  if (b === "unknown") return "—";
  return b.charAt(0).toUpperCase() + b.slice(1);
}

function labelMomentum(m: MomentumLevel): string {
  if (m === "unknown") return "—";
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchZoneByAlias(listing: ListingProperty): string | null {
  const hay = normalizeText(
    `${listing.city ?? ""} ${listing.location ?? ""} ${listing.name ?? ""} ${listing.builderName ?? ""}`,
  );
  for (const zone of MAP_AREA_MATCHERS) {
    if (zone.aliases.some((a) => hay.includes(normalizeText(a)))) return zone.id;
  }
  return null;
}

function matchZoneByPlaceGraph(listing: ListingProperty): string | null {
  const token = [listing.city, listing.location].filter(Boolean).join(" ");
  if (!token.trim()) return null;
  const place =
    resolvePlace(listing.city || "") ??
    resolvePlace(listing.location || "") ??
    resolvePlaceFromQuery(token);
  if (!place) return null;

  const direct = INTELLIGENCE_MAP_AREAS.find(
    (a) => a.id === place.canonicalId || a.placeId === place.canonicalId,
  );
  if (direct) return direct.id;

  if (place.parentCity) {
    const parent = INTELLIGENCE_MAP_AREAS.find(
      (a) => normalizeText(a.name) === normalizeText(place.parentCity!),
    );
    if (parent) return parent.id;
  }

  // Display name / cityValues may still map onto a map chip
  for (const name of [place.displayName, ...place.cityValues]) {
    const hit = INTELLIGENCE_MAP_AREAS.find(
      (a) => normalizeText(a.name) === normalizeText(name),
    );
    if (hit) return hit.id;
  }
  return null;
}

function matchZoneByProximity(listing: ListingProperty): string | null {
  if (!hasCoords(listing)) return null;
  let best: { id: string; d: number } | null = null;
  for (const area of INTELLIGENCE_MAP_AREAS) {
    const d = distanceKm(
      { lat: listing.lat, lng: listing.lng },
      { lat: area.lat, lng: area.lng },
    );
    const radius = getMapAreaRadiusKm(area.id) * 1.35;
    if (d <= radius && (!best || d < best.d)) {
      best = { id: area.id, d };
    }
  }
  return best?.id ?? null;
}

/** Resolve listing → Intelligence Map area id (alias → place graph → proximity). */
function matchZone(listing: ListingProperty): string | null {
  return (
    matchZoneByAlias(listing) ??
    matchZoneByPlaceGraph(listing) ??
    matchZoneByProximity(listing)
  );
}

function hasCoords(listing: ListingProperty): listing is ListingProperty & { lat: number; lng: number } {
  return (
    typeof listing.lat === "number" &&
    Number.isFinite(listing.lat) &&
    typeof listing.lng === "number" &&
    Number.isFinite(listing.lng)
  );
}

function isVerifiedListing(listing: ListingProperty): boolean {
  return Boolean(
    listing.reraVerified ||
      listing.aiVerified ||
      (listing.legalCompliance?.verifiedCount ?? 0) > 0,
  );
}

function investmentGrade(score: number | null): InvestmentGrade {
  if (score == null || !Number.isFinite(score)) return null;
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function riskFromLegal(legal: number | null): BandLevel {
  if (legal == null) return "unknown";
  if (legal >= 75) return "low";
  if (legal >= 50) return "medium";
  return "high";
}

function zoneToneFromInvestment(
  score: number | null,
  hasData: boolean,
): "green" | "yellow" | "red" | "grey" {
  if (!hasData || score == null) return "grey";
  if (score >= 70) return "green";
  if (score >= 45) return "yellow";
  return "red";
}

function suggestedForArea(name: string): MapSuggestedQuestion[] {
  return [
    {
      id: "outlook",
      label: `${name} investment outlook?`,
      href: `/ask?q=${encodeURIComponent(`${name} investment outlook Tricity`)}`,
    },
    {
      id: "builders",
      label: `Best builders in ${name}?`,
      href: `/ask?q=${encodeURIComponent(`Best builders in ${name}`)}`,
    },
    {
      id: "yield",
      label: `${name} rental yield?`,
      href: `/ask?q=${encodeURIComponent(`${name} rental yield`)}`,
    },
  ];
}

type ScoredListing = {
  listing: ListingProperty;
  areaIq: number | null;
  legal: number | null;
  builder: number | null;
};

function scoreListing(listing: ListingProperty): ScoredListing {
  const verifiedCount = listing.legalCompliance?.verifiedCount ?? 0;
  const scores = scorePropertyCardFromListing({
    propertyId: listing.id,
    amenities: (listing.amenities ?? []).map(String),
    legalFlags: listing.legalFlags ?? null,
    legalVerificationAttempted:
      verifiedCount > 0 || Boolean(listing.reraVerified),
    reraNumber: listing.reraVerified ? "verified" : null,
    growthScore: listing.growthScore,
    possession: listing.possession ?? null,
    status: null,
    builderName: listing.builderName,
    city: listing.city,
    location: listing.location,
    price: listing.price,
    areaSqft: listing.area > 0 ? listing.area : null,
    bedrooms: listing.bhk > 0 ? listing.bhk : null,
    imageCount: listing.imageUrl ? 1 : 0,
  });

  const cachedAreaIq =
    typeof (listing as { areaiqScore?: number | null }).areaiqScore === "number"
      ? (listing as { areaiqScore?: number | null }).areaiqScore!
      : null;
  const cachedLegal =
    typeof (listing as { legalScore?: number | null }).legalScore === "number"
      ? (listing as { legalScore?: number | null }).legalScore!
      : null;

  // Builder proxy: blend AreaIQ + legal when dedicated builder card score is absent
  const areaIq =
    cachedAreaIq ?? (scores.areaIq.available ? scores.areaIq.score : null);
  const legal =
    cachedLegal ?? (scores.legal.available ? scores.legal.score : null);
  const builderProxy =
    areaIq != null && legal != null
      ? Math.round(areaIq * 0.45 + legal * 0.55)
      : areaIq ?? legal;

  return {
    listing,
    areaIq,
    legal,
    builder: builderProxy,
  };
}

function relativeRanks(values: number[]): Map<number, number> {
  if (values.length === 0) return new Map();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const map = new Map<number, number>();
  for (const v of values) map.set(v, (v - min) / span);
  return map;
}

export function buildHeroStats(listings: ListingProperty[], scored: ScoredListing[]): HeroStat[] {
  const prices = listings.map((l) => l.price).filter((p) => p > 0);
  const avgPrice = average(prices);
  const verified = listings.filter(
    (l) => l.reraVerified || l.aiVerified || (l.legalCompliance?.verifiedCount ?? 0) > 0,
  ).length;
  const builders = new Set(
    listings
      .map((l) => (l.builderName || "").trim())
      .filter((n) => n && n.toLowerCase() !== "unknown"),
  );
  const cities = new Set(
    listings.map((l) => (l.city || l.location || "").trim()).filter(Boolean),
  );
  const avgScore = average(
    scored.map((s) => s.areaIq).filter((n): n is number => n != null),
  );

  // Same live AreaIQ signal used for map-node marketConfidence — never fabricated
  const marketConfidence =
    avgScore != null ? Math.round(avgScore) : null;

  return [
    {
      id: "verified",
      label: "Verified",
      value: listings.length > 0 ? verified : null,
      display: listings.length > 0 ? String(verified) : null,
      href: "/properties?verified=1",
    },
    {
      id: "avg-score",
      label: "Avg Score",
      value: avgScore != null ? Math.round(avgScore) : null,
      display: avgScore != null ? String(Math.round(avgScore)) : null,
      href: "/ask?q=AreaIQ+score+Tricity",
    },
    {
      id: "builders",
      label: "Builders",
      value: builders.size > 0 ? builders.size : null,
      display: builders.size > 0 ? String(builders.size) : null,
      href: "/ask?q=Top+builders+Tricity",
    },
    {
      id: "cities",
      label: "Cities",
      value: cities.size > 0 ? cities.size : null,
      display: cities.size > 0 ? String(cities.size) : null,
      href: "/properties",
    },
    {
      id: "avg-price",
      label: "Avg Price",
      value: avgPrice != null ? Math.round(avgPrice) : null,
      display: avgPrice != null ? formatInrAmount(avgPrice) : null,
      href: "/properties",
    },
    {
      id: "market-confidence",
      label: "Market Confidence",
      value: marketConfidence,
      display: marketConfidence != null ? `${marketConfidence}%` : null,
      subtitle: marketConfidence != null ? "LIVE" : null,
      href: "/ask?q=Market+confidence+Tricity+real+estate",
    },
  ];
}

export function buildTricityMapNodes(
  listings: ListingProperty[],
  scored: ScoredListing[],
): TricityMapNode[] {
  const byZone = new Map<string, ScoredListing[]>();
  for (const zone of INTELLIGENCE_MAP_AREAS) byZone.set(zone.id, []);

  for (const s of scored) {
    const zid = matchZone(s.listing);
    if (!zid) continue;
    byZone.get(zid)?.push(s);
  }

  const counts = INTELLIGENCE_MAP_AREAS.map((z) => byZone.get(z.id)!.length);
  const maxCount = Math.max(...counts, 1);
  const activeCounts = counts.filter((c) => c > 0);
  const medianInventory =
    activeCounts.length === 0
      ? null
      : [...activeCounts].sort((a, b) => a - b)[
          Math.floor(activeCounts.length / 2)
        ] ?? null;

  return INTELLIGENCE_MAP_AREAS.map((zone) => {
    const rows = byZone.get(zone.id)!;
    const prices = rows.map((r) => r.listing.price).filter((p) => p > 0);
    const growth = rows
      .map((r) => r.listing.growthScore)
      .filter((g): g is number => g != null);
    const yields = rows
      .map((r) => r.listing.rentalYield)
      .filter((y): y is number => y != null);
    const areaIq = rows.map((r) => r.areaIq).filter((n): n is number => n != null);
    const builder = rows.map((r) => r.builder).filter((n): n is number => n != null);
    const legal = rows.map((r) => r.legal).filter((n): n is number => n != null);
    const builders = new Set(
      rows
        .map((r) => (r.listing.builderName || "").trim())
        .filter((n) => n && n.toLowerCase() !== "unknown"),
    );
    const verifiedRows = rows.filter((r) => isVerifiedListing(r.listing));
    const verifiedShare =
      rows.length > 0 ? verifiedRows.length / rows.length : null;
    const xy = gridXY(zone.lat, zone.lng);
    const placeholder = rows.length === 0 ? getAreaPlaceholderIntel(zone.id) : null;
    const hasIntelligence = rows.length > 0 || placeholder != null;

    const liveAvgAreaIq = average(areaIq);
    const liveAvgGrowth = average(growth);
    const liveAvgBuilder = average(builder);
    const liveLegalConfidence = average(legal);
    const liveInvestment =
      liveAvgAreaIq != null && liveAvgGrowth != null
        ? Math.round(liveAvgAreaIq * 0.6 + liveAvgGrowth * 0.4)
        : liveAvgAreaIq != null
          ? Math.round(liveAvgAreaIq)
          : liveAvgGrowth != null
            ? Math.round(liveAvgGrowth)
            : null;

    const avgAreaIq = liveAvgAreaIq ?? placeholder?.avgAreaIqScore ?? null;
    const avgGrowth = liveAvgGrowth ?? placeholder?.avgGrowthScore ?? null;
    const avgBuilder = liveAvgBuilder;
    const legalConfidence = liveLegalConfidence;
    const investment =
      liveInvestment ?? placeholder?.investmentScore ?? null;
    const demandRatio = rows.length > 0 ? rows.length / maxCount : null;
    const supplyRatio =
      medianInventory != null && medianInventory > 0 && rows.length > 0
        ? Math.min(1, rows.length / (medianInventory * 1.4))
        : null;

    const rankedProjects: MapTopProject[] = [...rows]
      .sort(
        (a, b) =>
          (b.areaIq ?? -1) - (a.areaIq ?? -1) ||
          b.listing.price - a.listing.price,
      )
      .slice(0, 3)
      .map((r) => ({
        id: r.listing.id,
        name: r.listing.name,
        score: r.areaIq != null ? Math.round(r.areaIq) : null,
        price: r.listing.price > 0 ? r.listing.price : null,
        href: `/property/${r.listing.id}`,
      }));

    const recentActivity: MapAreaActivity[] = rows.slice(0, 4).map((r) => {
      if (r.listing.reraVerified) {
        return {
          id: `act-${r.listing.id}`,
          label: "RERA signal",
          detail: r.listing.name,
          href: `/property/${r.listing.id}`,
        };
      }
      if (r.areaIq != null && r.areaIq >= 75) {
        return {
          id: `act-${r.listing.id}`,
          label: "High AreaIQ",
          detail: `${r.listing.name} · ${Math.round(r.areaIq)}`,
          href: `/property/${r.listing.id}`,
        };
      }
      return {
        id: `act-${r.listing.id}`,
        label: "Live listing",
        detail: r.listing.name,
        href: `/property/${r.listing.id}`,
      };
    });

    const heatWeightParts = [
      investment != null ? investment / 100 : null,
      demandRatio,
      verifiedShare,
      avgBuilder != null ? avgBuilder / 100 : null,
      legalConfidence != null ? legalConfidence / 100 : null,
      placeholder != null ? placeholder.investmentScore / 100 : null,
    ].filter((n): n is number => n != null);
    const heatWeight =
      heatWeightParts.length > 0
        ? heatWeightParts.reduce((a, b) => a + b, 0) / heatWeightParts.length
        : 0;

    return {
      id: zone.id,
      name: zone.name,
      lat: zone.lat,
      lng: zone.lng,
      polygon: buildAreaPolygon(zone.lat, zone.lng, zone.id),
      x: xy.x,
      y: xy.y,
      listingCount: rows.length,
      verifiedCount: verifiedRows.length,
      averagePrice: average(prices) ?? placeholder?.averagePrice ?? null,
      avgGrowthScore: avgGrowth,
      avgRentalYield: average(yields) ?? placeholder?.avgRentalYield ?? null,
      avgAreaIqScore: avgAreaIq,
      avgBuilderScore: avgBuilder,
      investmentScore: investment,
      investmentGrade: investmentGrade(investment),
      legalConfidence: legalConfidence != null ? Math.round(legalConfidence) : null,
      marketConfidence:
        avgAreaIq != null
          ? Math.round(avgAreaIq)
          : placeholder?.marketConfidence ?? null,
      builderCount: builders.size,
      verificationConfidence:
        verifiedShare != null ? Math.round(verifiedShare * 100) : null,
      demand: rows.length > 0 ? bandFromRatio(demandRatio) : placeholder?.demand ?? "unknown",
      supply: rows.length > 0 ? bandFromRatio(supplyRatio) : placeholder?.supply ?? "unknown",
      risk: rows.length > 0 ? riskFromLegal(legalConfidence) : placeholder?.risk ?? "unknown",
      heat: demandRatio ?? (placeholder != null ? 0.45 : 0),
      heatWeight,
      zoneTone: zoneToneFromInvestment(investment, hasIntelligence),
      topProject: rankedProjects[0] ?? null,
      topProjects: rankedProjects,
      recentActivity,
      suggestedQuestions: suggestedForArea(zone.name),
      hasIntelligence,
      href: `/ask?q=${encodeURIComponent(`${zone.name} area intelligence`)}`,
      listingsHref: `/properties?location=${encodeURIComponent(zone.name)}`,
      compareHref: `/ask?q=${encodeURIComponent(`Compare ${zone.name} with nearby Tricity areas`)}`,
    };
  });
}

function listingPointFromScored(
  s: ScoredListing,
  kind: "listing" | "premium",
): MapPointFeature {
  const l = s.listing;
  const areaId = matchZone(l);
  const coords = resolveListingCoords(l, areaId);
  const verified = isVerifiedListing(l);
  return {
    id: `${kind === "premium" ? "p" : "v"}-${l.id}`,
    propertyId: l.id,
    name: l.name,
    lat: coords.lat,
    lng: coords.lng,
    href: `/property/${l.id}`,
    score: s.areaIq != null ? Math.round(s.areaIq) : null,
    price: l.price > 0 ? l.price : null,
    builderName: l.builderName || null,
    kind,
    areaId,
    imageUrl: l.imageUrl ?? null,
    bhk: l.bhk > 0 ? l.bhk : null,
    areaSize: l.area > 0 ? l.area : null,
    areaUnit: l.areaUnit ?? "sqft",
    legalPercent: s.legal != null ? Math.round(s.legal) : null,
    builderRating: s.builder != null ? Math.round(s.builder) : null,
    verified,
    isBestMatch: false,
    isNearby: false,
    askHref: `/ask?q=${encodeURIComponent(`Tell me about ${l.name}`)}`,
    bookVisitHref: `/property/${l.id}?action=book`,
  };
}

export function buildIntelligenceMapLayers(
  scored: ScoredListing[],
): IntelligenceMapLayers {
  const verifiedListings: MapPointFeature[] = [];
  const premiumProjects: MapPointFeature[] = [];
  const builderBuckets = new Map<
    string,
    { lats: number[]; lngs: number[]; score: number[]; href: string }
  >();
  const bestByArea = new Map<string, MapPointFeature>();

  let liveCoords = 0;
  let inferredCoords = 0;
  let estimatedCoords = 0;
  let skippedNoArea = 0;
  const cachePayload: CoordCachePayload[] = [];

  for (const s of scored) {
    const l = s.listing;
    const areaId = matchZone(l);
    const resolved = resolveListingCoords(l, areaId);
    if (resolved.source === "live") liveCoords += 1;
    else if (resolved.source === "inferred") inferredCoords += 1;
    else estimatedCoords += 1;

    // Never drop area listings for missing DB coordinates — resolve or estimate.
    const point = listingPointFromScored(s, "listing");
    if (!point.areaId) skippedNoArea += 1;
    verifiedListings.push(point);
    cachePayload.push({
      id: l.id,
      lat: point.lat,
      lng: point.lng,
      source: resolved.source,
    });
    if (point.areaId) {
      const prev = bestByArea.get(point.areaId);
      if (!prev || compareBestListings(point, prev) < 0) {
        bestByArea.set(point.areaId, point);
      }
    }

    if (s.areaIq != null && s.areaIq >= 75) {
      premiumProjects.push(listingPointFromScored(s, "premium"));
    }

    const builder = (l.builderName || "").trim();
    if (builder && builder.toLowerCase() !== "unknown") {
      const key = builder.toLowerCase();
      const bucket = builderBuckets.get(key) ?? {
        lats: [] as number[],
        lngs: [] as number[],
        score: [] as number[],
        href: `/ask?q=${encodeURIComponent(`${builder} builder review Tricity`)}`,
      };
      bucket.lats.push(point.lat);
      bucket.lngs.push(point.lng);
      if (s.builder != null) bucket.score.push(s.builder);
      builderBuckets.set(key, bucket);
    }
  }

  // Persist inferred/estimated coords (NULL-only in DB) so next load is live.
  persistListingCoords(collectCoordsToCache(cachePayload));

  for (const point of verifiedListings) {
    if (!point.areaId || !point.propertyId) continue;
    const best = bestByArea.get(point.areaId);
    if (best && best.propertyId === point.propertyId) {
      point.isBestMatch = true;
    }
  }

  const builderHeadquarters: MapPointFeature[] = [];
  for (const [key, b] of builderBuckets.entries()) {
    const lat = average(b.lats);
    const lng = average(b.lngs);
    if (lat == null || lng == null) continue;
    const name =
      scored.find((s) => (s.listing.builderName || "").trim().toLowerCase() === key)
        ?.listing.builderName ?? key;
    builderHeadquarters.push({
      id: `hq-${key.replace(/\s+/g, "-")}`,
      name,
      lat,
      lng,
      href: b.href,
      score: average(b.score),
      builderName: name,
      kind: "builder",
    });
    if (builderHeadquarters.length >= 24) break;
  }

  if (typeof console !== "undefined") {
    const byArea = new Map<string, number>();
    for (const p of verifiedListings) {
      const key = p.areaId ?? "(unassigned)";
      byArea.set(key, (byArea.get(key) ?? 0) + 1);
    }
    console.info("[AreaIQ Map Pipeline]", {
      stage: "map-layers",
      scoredFromSupabase: scored.length,
      afterCoordResolve: verifiedListings.length,
      liveCoords,
      inferredCoords,
      estimatedCoords,
      skippedNoArea,
      byArea: Object.fromEntries(byArea),
      mohaliCount: byArea.get("mohali") ?? 0,
      bestMohali: bestByArea.get("mohali")?.name ?? null,
      whyZero:
        verifiedListings.length === 0
          ? scored.length === 0
            ? "No listings returned from Supabase"
            : "All listings failed area assignment AND coordinate resolve"
          : null,
    });
  }

  return {
    verifiedListings,
    builderHeadquarters,
    premiumProjects: premiumProjects.slice(0, 80),
    majorRoads: buildMajorRoadLines(),
    airport: {
      id: CHANDIGARH_AIRPORT.id,
      name: CHANDIGARH_AIRPORT.name,
      lat: CHANDIGARH_AIRPORT.lat,
      lng: CHANDIGARH_AIRPORT.lng,
      kind: "airport",
    },
    // No upcoming-infra table yet — keep empty (UI shows collecting state)
    upcomingInfrastructure: [],
    builderLinks: buildBuilderLinks(verifiedListings),
  };
}

export function buildMarketPulse(
  listings: ListingProperty[],
  scored: ScoredListing[],
): MarketPulseMetric[] {
  const avgAreaIq = average(
    scored.map((s) => s.areaIq).filter((n): n is number => n != null),
  );
  const avgGrowth = average(
    listings.map((l) => l.growthScore).filter((g): g is number => g != null),
  );
  const counts = buildTricityMapNodes(listings, scored).map((n) => n.listingCount);
  const active = counts.filter((c) => c > 0);
  const median =
    active.length === 0
      ? null
      : [...active].sort((a, b) => a - b)[Math.floor(active.length / 2)] ?? null;
  const total = listings.length;
  const demandRatio =
    median != null && median > 0 ? Math.min(1, total / (median * active.length || 1)) : null;
  const supplyRatio =
    median != null && total > 0 ? Math.min(1, (median * active.length) / (total * 1.5)) : null;
  const momentum = momentumFromGrowth(avgGrowth);

  return [
    {
      id: "confidence",
      label: "Confidence",
      value: avgAreaIq != null ? `${Math.round(avgAreaIq)}%` : null,
      numeric: avgAreaIq != null ? Math.round(avgAreaIq) : null,
      band: bandFromScore(avgAreaIq),
      href: "/ask?q=Market+confidence+Tricity",
    },
    {
      id: "demand",
      label: "Demand",
      value: labelBand(bandFromRatio(demandRatio)),
      numeric: demandRatio != null ? Math.round(demandRatio * 100) : null,
      band: bandFromRatio(demandRatio),
      href: "/ask?q=Demand+hotspots+Tricity",
    },
    {
      id: "supply",
      label: "Supply",
      value: labelBand(bandFromRatio(supplyRatio)),
      numeric: supplyRatio != null ? Math.round(supplyRatio * 100) : null,
      band: bandFromRatio(supplyRatio),
      href: "/ask?q=Inventory+supply+Tricity",
    },
    {
      id: "momentum",
      label: "Momentum",
      value: labelMomentum(momentum),
      numeric: avgGrowth != null ? Math.round(avgGrowth) : null,
      band: momentum,
      href: "/ask?q=Price+momentum+Tricity",
    },
    {
      id: "inventory",
      label: "Inventory",
      value: total > 0 ? String(total) : null,
      numeric: total > 0 ? total : null,
      href: "/properties",
    },
  ];
}

export function buildLiveActivity(
  listings: ListingProperty[],
  scored: ScoredListing[],
): LiveActivityItem[] {
  const items: LiveActivityItem[] = [];

  for (const s of scored.slice(0, 24)) {
    const l = s.listing;
    const place = l.city || l.location || "Tricity";
    if (l.reraVerified) {
      items.push({
        id: `rera-${l.id}`,
        kind: "rera",
        label: "RERA signal",
        detail: `${l.name} · ${place}`,
        href: `/property/${l.id}`,
      });
    }
    if (l.builderName && l.builderName.toLowerCase() !== "unknown") {
      items.push({
        id: `builder-${l.id}`,
        kind: "builder",
        label: "Builder listed",
        detail: `${l.builderName} · ${place}`,
        href: `/ask?q=${encodeURIComponent(`${l.builderName} builder review`)}`,
      });
    }
    if (s.legal != null && s.legal >= 80) {
      items.push({
        id: `legal-${l.id}`,
        kind: "legal",
        label: "Legal strength",
        detail: `${l.name} · ${Math.round(s.legal)}%`,
        href: `/property/${l.id}`,
      });
    }
    if (s.areaIq != null && s.areaIq >= 75) {
      items.push({
        id: `score-${l.id}`,
        kind: "score",
        label: "High AreaIQ",
        detail: `${l.name} · ${Math.round(s.areaIq)}`,
        href: `/property/${l.id}`,
      });
    }
    items.push({
      id: `listing-${l.id}`,
      kind: "listing",
      label: "Live listing",
      detail: `${l.name} · ${formatInrAmount(l.price)}`,
      href: `/property/${l.id}`,
    });
  }

  // Dedupe by id, keep order, cap
  const seen = new Set<string>();
  return items
    .filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    })
    .slice(0, 18);
}

export function buildHeatmapCells(nodes: TricityMapNode[]): HeatmapCell[] {
  const priced = nodes.filter((n) => n.averagePrice != null);
  const prices = priced.map((n) => n.averagePrice as number);
  const ranks = relativeRanks(prices);

  return nodes.map((n) => {
    const rel =
      n.averagePrice != null ? (ranks.get(n.averagePrice) ?? null) : null;
    return {
      id: n.id,
      name: n.name,
      averagePrice: n.averagePrice,
      monthlyGrowthProxy:
        n.avgGrowthScore != null ? Math.round(n.avgGrowthScore) : null,
      outlook: bandFromScore(n.avgGrowthScore),
      tone: heatTone(rel),
      listingCount: n.listingCount,
      href: n.href,
    };
  });
}

export function buildBuilderLeaderboard(
  scored: ScoredListing[],
): BuilderLeaderboardRow[] {
  const byBuilder = new Map<string, ScoredListing[]>();
  for (const s of scored) {
    const name = (s.listing.builderName || "").trim();
    if (!name || name.toLowerCase() === "unknown") continue;
    const list = byBuilder.get(name) ?? [];
    list.push(s);
    byBuilder.set(name, list);
  }

  return [...byBuilder.entries()]
    .map(([name, rows]) => {
      const areaIq = average(rows.map((r) => r.areaIq).filter((n): n is number => n != null));
      const legal = average(rows.map((r) => r.legal).filter((n): n is number => n != null));
      const builder = average(
        rows.map((r) => r.builder).filter((n): n is number => n != null),
      );
      const reraPct =
        rows.length > 0
          ? (rows.filter((r) => r.listing.reraVerified).length / rows.length) * 100
          : null;
      const score = average(
        [areaIq, builder].filter((n): n is number => n != null),
      );
      return {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        rank: 0,
        name,
        score: score != null ? Math.round(score) : null,
        projects: rows.length,
        trustPct: legal != null ? Math.round(legal) : null,
        deliveryPct: reraPct != null ? Math.round(reraPct) : null,
        href: `/ask?q=${encodeURIComponent(`${name} builder review Tricity`)}`,
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.projects - a.projects)
    .slice(0, 8)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function buildInvestmentGauges(
  scored: ScoredListing[],
  listings: ListingProperty[],
): InvestmentGauge[] {
  const areaIq = average(scored.map((s) => s.areaIq).filter((n): n is number => n != null));
  const legal = average(scored.map((s) => s.legal).filter((n): n is number => n != null));
  const builder = average(scored.map((s) => s.builder).filter((n): n is number => n != null));
  const growth = average(
    listings.map((l) => l.growthScore).filter((g): g is number => g != null),
  );
  const rental = average(
    listings.map((l) => l.rentalYield).filter((y): y is number => y != null),
  );
  // Liquidity proxy: share of listings with images + price (resale readiness signal)
  const liquidShare =
    listings.length > 0
      ? (listings.filter((l) => l.price > 0 && l.imageUrl).length / listings.length) * 100
      : null;

  return [
    {
      id: "areaiq",
      label: "AreaIQ",
      value: areaIq != null ? Math.round(areaIq) : null,
      href: "/ask?q=AreaIQ+score+explained",
    },
    {
      id: "liquidity",
      label: "Liquidity",
      value: liquidShare != null ? Math.round(liquidShare) : null,
      href: "/ask?q=Liquidity+resale+Tricity",
    },
    {
      id: "growth",
      label: "Growth",
      value: growth != null ? Math.round(growth) : null,
      href: "/ask?q=Growth+areas+Tricity",
    },
    {
      id: "rental",
      label: "Rental",
      value: rental != null ? Math.round(Math.min(100, rental * 12)) : null,
      href: "/ask?q=Rental+yield+Tricity",
    },
    {
      id: "legal",
      label: "Legal",
      value: legal != null ? Math.round(legal) : null,
      href: "/ask?q=Legal+compliance+Tricity",
    },
    {
      id: "builder",
      label: "Builder",
      value: builder != null ? Math.round(builder) : null,
      href: "/ask?q=Builder+trust+Tricity",
    },
  ];
}

export function buildAreaComparison(nodes: TricityMapNode[]): AreaComparisonRow[] {
  const withListings = nodes.filter((n) => n.listingCount > 0);
  const maxListings = Math.max(...withListings.map((n) => n.listingCount), 1);

  return (withListings.length > 0 ? withListings : nodes).map((n) => ({
    id: n.id,
    area: n.name,
    price: n.averagePrice != null ? Math.round(n.averagePrice) : null,
    roi: n.avgGrowthScore != null ? Math.round(n.avgGrowthScore) : null,
    rental: n.avgRentalYield != null ? Number(n.avgRentalYield.toFixed(1)) : null,
    builder: n.avgBuilderScore != null ? Math.round(n.avgBuilderScore) : null,
    demand: Math.round((n.listingCount / maxListings) * 100),
    score: n.avgAreaIqScore != null ? Math.round(n.avgAreaIqScore) : null,
    href: n.href,
  }));
}

export function buildTrendingLocations(
  nodes: TricityMapNode[],
  scored: ScoredListing[],
): TrendingLocationCard[] {
  return [...nodes]
    .filter((n) => n.listingCount > 0)
    .sort(
      (a, b) =>
        (b.avgGrowthScore ?? 0) - (a.avgGrowthScore ?? 0) ||
        b.listingCount - a.listingCount,
    )
    .slice(0, 6)
    .map((n) => {
      const sample = scored.find((s) => matchZone(s.listing) === n.id);
      const verified = scored.filter(
        (s) =>
          matchZone(s.listing) === n.id &&
          (s.listing.reraVerified ||
            s.listing.aiVerified ||
            (s.listing.legalCompliance?.verifiedCount ?? 0) > 0),
      ).length;
      return {
        id: n.id,
        name: n.name,
        score: n.avgAreaIqScore != null ? Math.round(n.avgAreaIqScore) : null,
        growth: n.avgGrowthScore != null ? Math.round(n.avgGrowthScore) : null,
        averagePrice: n.averagePrice,
        verifiedProjects: verified,
        imageUrl: sample?.listing.imageUrl ?? null,
        href: n.href,
      };
    });
}

export function buildIntelligenceGauges(
  scored: ScoredListing[],
  listings: ListingProperty[],
  pulse: MarketPulseMetric[],
): InvestmentGauge[] {
  const areaIq = average(scored.map((s) => s.areaIq).filter((n): n is number => n != null));
  const legal = average(scored.map((s) => s.legal).filter((n): n is number => n != null));
  const builder = average(scored.map((s) => s.builder).filter((n): n is number => n != null));
  const growth = average(
    listings.map((l) => l.growthScore).filter((g): g is number => g != null),
  );
  // Price prediction proxy: blend of AreaIQ + growth coverage confidence
  const prediction =
    areaIq != null && growth != null
      ? Math.round(areaIq * 0.55 + growth * 0.45)
      : areaIq != null
        ? Math.round(areaIq)
        : growth != null
          ? Math.round(growth)
          : null;
  const demandMetric = pulse.find((p) => p.id === "demand");

  return [
    {
      id: "prediction",
      label: "Price Prediction",
      value: prediction,
      href: "/ask?q=Price+prediction+Tricity",
    },
    {
      id: "builder-trust",
      label: "Builder Trust",
      value: builder != null ? Math.round(builder) : null,
      href: "/ask?q=Builder+trust+Tricity",
    },
    {
      id: "legal",
      label: "Legal",
      value: legal != null ? Math.round(legal) : null,
      href: "/ask?q=Legal+risk+Tricity",
    },
    {
      id: "growth",
      label: "Growth",
      value: growth != null ? Math.round(growth) : null,
      href: "/ask?q=Growth+outlook+Tricity",
    },
    {
      id: "demand",
      label: "Demand",
      value: demandMetric?.numeric ?? null,
      href: "/ask?q=Demand+outlook+Tricity",
    },
    {
      id: "areaiq",
      label: "AreaIQ Score",
      value: areaIq != null ? Math.round(areaIq) : null,
      href: "/ask?q=AreaIQ+intelligence",
    },
  ];
}

export function buildChartSeries(
  nodes: TricityMapNode[],
  listings: ListingProperty[],
  scored: ScoredListing[],
): TerminalChartSeries {
  const inventoryByArea = nodes
    .filter((n) => n.listingCount > 0)
    .map((n) => ({ name: n.name, value: n.listingCount }));

  const bands = [
    { name: "<40L", min: 0, max: 4_000_000 },
    { name: "40–70L", min: 4_000_000, max: 7_000_000 },
    { name: "70L–1Cr", min: 7_000_000, max: 10_000_000 },
    { name: "1–2Cr", min: 10_000_000, max: 20_000_000 },
    { name: "2Cr+", min: 20_000_000, max: Infinity },
  ];
  const priceBands = bands.map((b) => ({
    name: b.name,
    value: listings.filter((l) => l.price >= b.min && l.price < b.max).length,
  }));

  const yieldBuckets = [
    { name: "<2%", min: 0, max: 2 },
    { name: "2–3%", min: 2, max: 3 },
    { name: "3–4%", min: 3, max: 4 },
    { name: "4%+", min: 4, max: Infinity },
  ];
  const withYield = listings.filter((l) => l.rentalYield != null);
  const yieldDistribution = yieldBuckets.map((b) => ({
    name: b.name,
    value: withYield.filter(
      (l) => (l.rentalYield as number) >= b.min && (l.rentalYield as number) < b.max,
    ).length,
  }));

  const areaIq = average(scored.map((s) => s.areaIq).filter((n): n is number => n != null));
  const legal = average(scored.map((s) => s.legal).filter((n): n is number => n != null));
  const builder = average(scored.map((s) => s.builder).filter((n): n is number => n != null));
  const growth = average(
    listings.map((l) => l.growthScore).filter((g): g is number => g != null),
  );
  const rental = average(
    listings.map((l) => l.rentalYield).filter((y): y is number => y != null),
  );

  const scoreRadials = [
    { name: "AreaIQ", value: areaIq != null ? Math.round(areaIq) : 0 },
    { name: "Legal", value: legal != null ? Math.round(legal) : 0 },
    { name: "Builder", value: builder != null ? Math.round(builder) : 0 },
    { name: "Growth", value: growth != null ? Math.round(growth) : 0 },
    {
      name: "Rental",
      value: rental != null ? Math.round(Math.min(100, rental * 12)) : 0,
    },
  ].filter((p) => p.value > 0);

  // Snapshot confidence by area (not a time series)
  const marketConfidence = nodes
    .filter((n) => n.avgAreaIqScore != null)
    .map((n) => ({
      name: n.name,
      value: Math.round(n.avgAreaIqScore as number),
    }));

  return {
    inventoryByArea,
    priceBands,
    yieldDistribution,
    scoreRadials,
    marketConfidence,
  };
}

export function buildStructuredSearchDefaults(
  listings: ListingProperty[],
): StructuredSearchDefaults {
  const cityCounts = new Map<string, number>();
  for (const l of listings) {
    const city = (l.city || "").trim();
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const topCities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      label: name,
      value: name,
    }));

  const zoneFallback = INTELLIGENCE_MAP_AREAS.map((z) => ({
    id: z.id,
    label: z.name,
    value: z.name,
  }));

  return {
    locations: topCities.length > 0 ? topCities : zoneFallback,
    budgets: [
      { id: "u40", label: "Under ₹40L", value: "0-4000000" },
      { id: "40-70", label: "₹40–70L", value: "4000000-7000000" },
      { id: "70-100", label: "₹70L–1Cr", value: "7000000-10000000" },
      { id: "1-2", label: "₹1–2Cr", value: "10000000-20000000" },
      { id: "2p", label: "₹2Cr+", value: "20000000-" },
    ],
    bedrooms: [
      { id: "1", label: "1 BHK", value: "1" },
      { id: "2", label: "2 BHK", value: "2" },
      { id: "3", label: "3 BHK", value: "3" },
      { id: "4", label: "4+ BHK", value: "4" },
    ],
    propertyTypes: [
      { id: "apartment", label: "Apartment", value: "apartment" },
      { id: "villa", label: "Villa", value: "villa" },
      { id: "plot", label: "Plot", value: "plot" },
      { id: "builder-floor", label: "Builder Floor", value: "builder-floor" },
      { id: "commercial", label: "Commercial", value: "commercial" },
    ],
    goals: [
      { id: "live", label: "Live in", value: "family home" },
      { id: "invest", label: "Invest", value: "best investment" },
      { id: "rent", label: "Rental income", value: "highest rental yield" },
      { id: "nri", label: "NRI", value: "NRI property investment" },
    ],
  };
}

export function buildTerminalBundle(listings: ListingProperty[]): TerminalBundle {
  const scored = listings.map(scoreListing);
  const mapNodes = buildTricityMapNodes(listings, scored);
  const pulse = buildMarketPulse(listings, scored);

  return {
    heroStats: buildHeroStats(listings, scored),
    mapNodes,
    mapLayers: buildIntelligenceMapLayers(scored),
    pulse,
    activity: buildLiveActivity(listings, scored),
    heatmap: buildHeatmapCells(mapNodes),
    builders: buildBuilderLeaderboard(scored),
    investmentGauges: buildInvestmentGauges(scored, listings),
    areaComparison: buildAreaComparison(mapNodes),
    trending: buildTrendingLocations(mapNodes, scored),
    intelligenceGauges: buildIntelligenceGauges(scored, listings, pulse),
    charts: buildChartSeries(mapNodes, listings, scored),
    searchDefaults: buildStructuredSearchDefaults(listings),
  };
}

export { formatInrAmount as formatPriceShort };
