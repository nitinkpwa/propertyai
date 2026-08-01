/**
 * Selection helpers for the Intelligence Map floating best-property card.
 */

import type { MapPointFeature, TricityMapNode } from "@/lib/home/terminalTypes";
import {
  distanceKm,
  formatDistanceKm,
  pickBestAreaListing,
  rankAreaListings,
} from "@/lib/home/areaListingMarkers";
import { INTELLIGENCE_MAP_AREAS } from "@/lib/home/intelligenceMapGeo";

export type BestCardDiag = {
  selectedArea: string | null;
  areaName: string | null;
  nodeListingCount: number;
  returnedListings: number;
  rankedTop: string | null;
  chosenListing: string | null;
  cardMounted: boolean;
  cardHiddenReason: string | null;
  emptyWhy: string | null;
  nearestListing: string | null;
};

export type BestCardSelection = {
  best: MapPointFeature | null;
  ranked: MapPointFeature[];
  nearest: { listing: MapPointFeature; distanceLabel: string } | null;
  diag: BestCardDiag;
};

function areaAliases(areaId: string | null): string[] {
  if (!areaId) return [];
  const area = INTELLIGENCE_MAP_AREAS.find((a) => a.id === areaId);
  if (!area) return [];
  return [area.name, ...area.aliases].map((a) => a.toLowerCase());
}

/**
 * Resolve the live listing pool for an area.
 * Does NOT require "live DB geocodes" — map layers already resolve/estimate coords.
 */
export function resolveFloatCardPool(
  allListings: MapPointFeature[],
  areaId: string | null,
  areaNode: TricityMapNode | null,
): { pool: MapPointFeature[]; whyEmpty: string | null; source: string } {
  if (!areaId) {
    return { pool: [], whyEmpty: "No area selected", source: "none" };
  }

  const primary = allListings.filter((l) => !l.isNearby);

  if (primary.length === 0) {
    const nodeCount = areaNode?.listingCount ?? 0;
    return {
      pool: [],
      whyEmpty:
        nodeCount > 0
          ? `Pipeline bug: sidebar has ${nodeCount} listings but map layer is empty`
          : "No listings returned for this area",
      source: "empty-layer",
    };
  }

  const byAreaId = primary.filter((l) => l.areaId === areaId);
  if (byAreaId.length > 0) {
    return { pool: byAreaId, whyEmpty: null, source: "areaId" };
  }

  const aliases = areaAliases(areaId);
  const areaName = (areaNode?.name ?? "").toLowerCase();
  const byText = primary.filter((l) => {
    const hay = `${l.name} ${l.builderName ?? ""}`.toLowerCase();
    if (areaName && hay.includes(areaName)) return true;
    return aliases.some((a) => a.length >= 4 && hay.includes(a));
  });
  if (byText.length > 0) {
    return { pool: byText, whyEmpty: null, source: "text-fallback" };
  }

  const unassigned = primary.filter((l) => !l.areaId);
  return {
    pool: [],
    whyEmpty: `Area mismatch — ${primary.length} map listings, none for "${areaId}" (${unassigned.length} unassigned)`,
    source: "empty",
  };
}

export function selectBestPropertyCard(input: {
  areaId: string | null;
  areaNode: TricityMapNode | null;
  areaListings: MapPointFeature[];
  allListings: MapPointFeature[];
  nearbyListings: MapPointFeature[];
  /** Marker / drawer selection — preview updates to this listing. */
  selectedPropertyId?: string | null;
  hidden?: boolean;
}): BestCardSelection {
  const {
    areaId,
    areaNode,
    areaListings,
    allListings,
    nearbyListings,
    selectedPropertyId,
    hidden,
  } = input;

  let pool = areaListings.filter((l) => !l.isNearby);
  let source = "areaListings";
  let whyEmpty: string | null = null;

  if (pool.length === 0) {
    const resolved = resolveFloatCardPool(allListings, areaId, areaNode);
    pool = resolved.pool;
    source = resolved.source;
    whyEmpty = resolved.whyEmpty;
  }

  const ranked = rankAreaListings(pool);
  let best = pickBestAreaListing(pool);

  // Marker click / drawer selection overrides auto-best
  if (selectedPropertyId) {
    const selected =
      pool.find((l) => l.propertyId === selectedPropertyId) ??
      allListings.find((l) => l.propertyId === selectedPropertyId) ??
      null;
    if (selected) best = selected;
  }

  let nearest: BestCardSelection["nearest"] = null;
  if (!best && areaNode && nearbyListings.length > 0) {
    const verifiedNearby = nearbyListings.filter((l) => l.verified);
    const nearPool =
      verifiedNearby.length > 0 ? verifiedNearby : nearbyListings;
    const pick = pickBestAreaListing(nearPool);
    if (pick) {
      nearest = {
        listing: pick,
        distanceLabel: formatDistanceKm(distanceKm(areaNode, pick)),
      };
    }
  }

  const nodeListingCount = areaNode?.listingCount ?? 0;

  // Empty banner ONLY when true inventory count is zero
  if (!best && !nearest && nodeListingCount === 0) {
    whyEmpty = whyEmpty ?? "listing_count == 0";
  } else if (!best && !nearest && nodeListingCount > 0) {
    whyEmpty =
      whyEmpty ??
      `listing_count=${nodeListingCount} but map pool empty — check coordinate resolve`;
  }

  let cardHiddenReason: string | null = null;
  let cardMounted = false;
  if (!areaId) cardHiddenReason = "No areaId";
  else if (hidden) cardHiddenReason = "Hidden (marker popup open)";
  else {
    cardMounted = true;
    if (!best && nodeListingCount === 0) {
      cardHiddenReason = "Empty area — expanding coverage";
    }
  }

  const diag: BestCardDiag = {
    selectedArea: areaId,
    areaName: areaNode?.name ?? null,
    nodeListingCount,
    returnedListings: pool.length,
    rankedTop: ranked[0]?.name ?? null,
    chosenListing: best?.name ?? null,
    cardMounted,
    cardHiddenReason,
    emptyWhy: best ? null : whyEmpty,
    nearestListing: nearest?.listing.name ?? null,
  };

  if (typeof console !== "undefined") {
    console.info("[AreaIQ BestPropertyCard]", {
      ...diag,
      source,
      selectedPropertyId: selectedPropertyId ?? null,
      poolSample: pool.slice(0, 3).map((p) => ({
        name: p.name,
        areaId: p.areaId,
        score: p.score,
        lat: p.lat,
        lng: p.lng,
      })),
    });
  }

  return { best, ranked, nearest, diag };
}
