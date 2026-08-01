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

/** Approximate distance in km between two WGS84 points. */
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
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.max(100, Math.round(km * 1000))} m away`;
  return `${km.toFixed(1)} km away`;
}

/** Nearby verified inventory for empty / expanding coverage areas. */
export function nearbyListingsForArea(
  all: MapPointFeature[],
  node: TricityMapNode | null,
  areaListings: MapPointFeature[],
  limit = 12,
): MapPointFeature[] {
  if (!node) return [];
  const inArea = new Set(
    areaListings.map((l) => l.propertyId).filter(Boolean) as string[],
  );
  const candidates = all.filter(
    (l) =>
      l.propertyId &&
      !inArea.has(l.propertyId) &&
      Number.isFinite(l.lat) &&
      Number.isFinite(l.lng),
  );
  if (candidates.length === 0) return [];

  const ranked = candidates
    .map((l) => ({
      listing: l,
      dist:
        (l.lat - node.lat) * (l.lat - node.lat) +
        (l.lng - node.lng) * (l.lng - node.lng),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map(({ listing }) => ({
      ...listing,
      id: `near-${listing.propertyId}`,
      isNearby: true,
      isBestMatch: false,
    }));

  return ranked;
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
