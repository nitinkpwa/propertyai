/** Score bands + helpers for AreaIQ Intelligence Map listing markers. */

import type {
  MapBuilderLink,
  MapPointFeature,
  TricityMapNode,
} from "@/lib/home/terminalTypes";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

export type ScoreBand =
  | "green"
  | "lightGreen"
  | "yellow"
  | "orange"
  | "red"
  | "grey";

export type MarkerZoomTier = "compact" | "medium" | "full";

export const SCORE_BAND_COLOR: Record<ScoreBand, string> = {
  green: "#2F9E44",
  lightGreen: "#8BC34A",
  yellow: "#E2B93D",
  orange: "#E07A3D",
  red: "#C45C4A",
  grey: "#9CA3AF",
};

export function scoreBand(score: number | null | undefined): ScoreBand {
  if (score == null || !Number.isFinite(score)) return "grey";
  if (score >= 85) return "green";
  if (score >= 75) return "lightGreen";
  if (score >= 65) return "yellow";
  if (score >= 55) return "orange";
  return "red";
}

export function scoreBandColor(score: number | null | undefined): string {
  return SCORE_BAND_COLOR[scoreBand(score)];
}

export function markerZoomTier(zoom: number): MarkerZoomTier {
  if (zoom > 15) return "full";
  if (zoom >= 12) return "medium";
  return "compact";
}

export function listingsForArea(
  listings: MapPointFeature[],
  areaId: string | null,
): MapPointFeature[] {
  if (!areaId) return listings;
  return listings.filter((l) => l.areaId === areaId && !l.isNearby);
}

/**
 * Rank listings for the floating “best in area” card.
 * Score → verified docs → confidence (legal %) → stable id (newer proxy).
 */
export function compareBestListings(
  a: MapPointFeature,
  b: MapPointFeature,
): number {
  const scoreA = a.score ?? -1;
  const scoreB = b.score ?? -1;
  if (scoreB !== scoreA) return scoreB - scoreA;

  const verA = a.verified ? 1 : 0;
  const verB = b.verified ? 1 : 0;
  if (verB !== verA) return verB - verA;

  const confA = a.legalPercent ?? -1;
  const confB = b.legalPercent ?? -1;
  if (confB !== confA) return confB - confA;

  // Prefer lexicographically greater property ids as a stable “newer” proxy
  return (b.propertyId ?? b.id).localeCompare(a.propertyId ?? a.id);
}

export function rankAreaListings(
  listings: MapPointFeature[],
): MapPointFeature[] {
  return [...listings].sort(compareBestListings);
}

export function pickBestAreaListing(
  listings: MapPointFeature[],
): MapPointFeature | null {
  if (listings.length === 0) return null;
  return rankAreaListings(listings)[0] ?? null;
}

/** Approximate Haversine distance in km between two WGS84 points. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Max search radius for “Nearby” inventory when an area has 0 in-area listings.
 * Far enough for adjacent Tricity micromarkets; short enough to exclude
 * unrelated belts (e.g. Kharar inventory must not appear under Dhakoli).
 */
export const NEARBY_PROPERTY_RADIUS_KM = 12;

/** Reject missing, NaN, null-island, and out-of-region coordinates. */
export function isValidMapCoord(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return false;
  // Rough northern-India / Tricity sanity band
  if (lat < 28 || lat > 33 || lng < 74 || lng > 80) return false;
  return true;
}

/**
 * Display label from the same Haversine distance used for filtering.
 * < 10 km → one decimal; ≥ 10 km → whole kilometres.
 */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

export type NearbyPropertyMatch = {
  listing: MapPointFeature;
  distanceKm: number;
};

export type GetNearbyPropertiesOptions = {
  /** Override default {@link NEARBY_PROPERTY_RADIUS_KM}. */
  radiusKm?: number;
  limit?: number;
  excludePropertyIds?: Iterable<string>;
  /** Default true — Nearby card only shows verified inventory. */
  verifiedOnly?: boolean;
};

/**
 * Geographic nearby filter for Intelligence Map.
 * Validates coords → Haversine distance → radius filter → sort ascending.
 * Never returns a global “best listing” fallback outside the radius.
 */
export function getNearbyProperties(
  area: { lat: number; lng: number } | null | undefined,
  properties: MapPointFeature[],
  options: GetNearbyPropertiesOptions = {},
): NearbyPropertyMatch[] {
  if (!area || !isValidMapCoord(area.lat, area.lng)) return [];

  const radiusKm = options.radiusKm ?? NEARBY_PROPERTY_RADIUS_KM;
  const limit = options.limit ?? 12;
  const verifiedOnly = options.verifiedOnly !== false;
  const exclude = new Set(
    options.excludePropertyIds
      ? [...options.excludePropertyIds].filter(Boolean)
      : [],
  );

  const matches: NearbyPropertyMatch[] = [];
  for (const listing of properties) {
    const pid = listing.propertyId;
    if (!pid || exclude.has(pid)) continue;
    if (listing.isNearby) continue;
    if (!isValidMapCoord(listing.lat, listing.lng)) continue;
    if (verifiedOnly && !listing.verified) continue;

    const d = distanceKm(area, listing);
    if (!Number.isFinite(d) || d > radiusKm) continue;
    matches.push({ listing, distanceKm: d });
  }

  matches.sort((a, b) => a.distanceKm - b.distanceKm || a.listing.id.localeCompare(b.listing.id));
  return matches.slice(0, Math.max(0, limit));
}

/** Nearby verified inventory for empty / expanding coverage areas (map pins). */
export function nearbyListingsForArea(
  all: MapPointFeature[],
  node: TricityMapNode | null,
  areaListings: MapPointFeature[],
  limit = 12,
): MapPointFeature[] {
  if (!node || !isValidMapCoord(node.lat, node.lng)) return [];

  const inArea = new Set(
    areaListings.map((l) => l.propertyId).filter((id): id is string => Boolean(id)),
  );

  return getNearbyProperties(node, all, {
    excludePropertyIds: inArea,
    verifiedOnly: true,
    limit,
  }).map(({ listing }) => ({
    ...listing,
    id: `near-${listing.propertyId}`,
    isNearby: true,
    isBestMatch: false,
  }));
}

/** Primary area pins + grey nearby context (empty areas). */
export function mapRenderableListings(
  all: MapPointFeature[],
  node: TricityMapNode | null,
  areaId: string | null,
): { primary: MapPointFeature[]; nearby: MapPointFeature[]; all: MapPointFeature[] } {
  const primary = listingsForArea(all, areaId).map((l) => ({
    ...l,
    isNearby: false,
  }));
  const nearby =
    primary.length === 0
      ? nearbyListingsForArea(all, node, primary)
      : [];
  return { primary, nearby, all: [...primary, ...nearby] };
}

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function builderAccentColor(builderName: string): string {
  const hue = hashHue(builderName.toLowerCase().trim());
  return `hsla(${hue}, 42%, 42%, 0.55)`;
}

/** Faint links between projects sharing a builder (2+). */
export function buildBuilderLinks(
  listings: MapPointFeature[],
): MapBuilderLink[] {
  const groups = new Map<string, MapPointFeature[]>();
  for (const l of listings) {
    if (l.isNearby) continue;
    const name = (l.builderName || "").trim();
    if (!name || name.toLowerCase() === "unknown") continue;
    const key = name.toLowerCase();
    const bucket = groups.get(key) ?? [];
    bucket.push(l);
    groups.set(key, bucket);
  }

  const links: MapBuilderLink[] = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => a.lng - b.lng || a.lat - b.lat,
    );
    const name = sorted[0].builderName || "Builder";
    links.push({
      id: `blink-${name.toLowerCase().replace(/\s+/g, "-")}`,
      builderName: name,
      color: builderAccentColor(name),
      coordinates: sorted.map((p) => [p.lng, p.lat] as [number, number]),
    });
    if (links.length >= 40) break;
  }
  return links;
}

export type AreaMapSummary = {
  name: string;
  verifiedCount: number;
  averagePriceLabel: string;
  bestScoreLabel: string;
  builderCount: number;
  mappedCount: number;
  empty: boolean;
};

export function buildAreaMapSummary(
  node: TricityMapNode | null,
  mappedListings: MapPointFeature[],
): AreaMapSummary | null {
  if (!node) return null;
  const primary = mappedListings.filter((l) => !l.isNearby);
  const scores = primary
    .map((l) => l.score)
    .filter((n): n is number => n != null && Number.isFinite(n));
  const bestFromMap = scores.length > 0 ? Math.max(...scores) : null;
  const best =
    bestFromMap ??
    node.topProject?.score ??
    (node.avgAreaIqScore != null ? Math.round(node.avgAreaIqScore) : null);

  return {
    name: node.name,
    verifiedCount: node.verifiedCount,
    averagePriceLabel:
      node.averagePrice != null ? formatInrAmount(node.averagePrice) : "—",
    bestScoreLabel: best != null ? String(best) : "—",
    builderCount: node.builderCount,
    mappedCount: primary.length,
    empty: primary.length === 0,
  };
}
