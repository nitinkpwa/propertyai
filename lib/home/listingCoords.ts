/**
 * Ensure every map listing has coordinates.
 * Prefer live DB lat/lng → Place Graph inference → area centroid + stable offset.
 * Never invent fake property attributes — only positions for map display.
 */

import type { ListingProperty } from "@/lib/properties/types";
import { inferCoordsFromLabel } from "@/lib/location/resolve";
import {
  INTELLIGENCE_MAP_AREAS,
  getMapAreaRadiusKm,
} from "@/lib/home/intelligenceMapGeo";

export type ResolvedListingCoords = {
  lat: number;
  lng: number;
  /** live = DB; inferred = place graph; estimated = area centroid + hash offset */
  source: "live" | "inferred" | "estimated";
};

function stableUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Deterministic offset around a centroid (Airbnb/Zillow-style missing-pin spread). */
export function offsetAroundCentroid(
  lat: number,
  lng: number,
  seed: string,
  radiusKm = 1.2,
): { lat: number; lng: number } {
  const u = stableUnit(seed);
  const v = stableUnit(`${seed}:b`);
  const angle = u * Math.PI * 2;
  const dist = Math.sqrt(v) * radiusKm; // denser near center
  const latRad = (lat * Math.PI) / 180;
  const dLat = dist / 110.574;
  const dLng = dist / (111.32 * Math.cos(latRad) || 1);
  return {
    lat: lat + dLat * Math.sin(angle),
    lng: lng + dLng * Math.cos(angle),
  };
}

function areaCentroid(areaId: string | null): { lat: number; lng: number; id: string } | null {
  if (!areaId) return null;
  const area = INTELLIGENCE_MAP_AREAS.find((a) => a.id === areaId);
  if (!area) return null;
  return { lat: area.lat, lng: area.lng, id: area.id };
}

/**
 * Resolve display coordinates for a listing.
 * `areaId` should be the matched Intelligence Map zone when known.
 */
export function resolveListingCoords(
  listing: ListingProperty,
  areaId: string | null,
): ResolvedListingCoords {
  if (
    typeof listing.lat === "number" &&
    Number.isFinite(listing.lat) &&
    typeof listing.lng === "number" &&
    Number.isFinite(listing.lng)
  ) {
    return { lat: listing.lat, lng: listing.lng, source: "live" };
  }

  const labels = [
    listing.location,
    listing.city,
    listing.name,
    [listing.city, listing.location].filter(Boolean).join(" "),
  ].filter((s): s is string => Boolean(s && String(s).trim()));

  for (const label of labels) {
    const inferred = inferCoordsFromLabel(label);
    if (inferred) {
      const spread = offsetAroundCentroid(
        inferred.lat,
        inferred.lng,
        listing.id,
        0.55,
      );
      return { lat: spread.lat, lng: spread.lng, source: "inferred" };
    }
  }

  const centroid =
    areaCentroid(areaId) ??
    (() => {
      // Last resort: first map area matching city token
      const city = (listing.city || "").trim().toLowerCase();
      if (!city) return null;
      return (
        INTELLIGENCE_MAP_AREAS.find((a) => a.name.toLowerCase() === city) ??
        INTELLIGENCE_MAP_AREAS.find((a) =>
          a.aliases.some((al) => city.includes(al.toLowerCase())),
        ) ??
        null
      );
    })();

  if (centroid) {
    const radius = Math.min(getMapAreaRadiusKm(centroid.id) * 0.45, 1.6);
    const spread = offsetAroundCentroid(
      centroid.lat,
      centroid.lng,
      listing.id,
      radius,
    );
    return { lat: spread.lat, lng: spread.lng, source: "estimated" };
  }

  // Absolute fallback — Tricity center (still show the pin)
  const spread = offsetAroundCentroid(30.705, 76.76, listing.id, 2.5);
  return { lat: spread.lat, lng: spread.lng, source: "estimated" };
}

export type CoordCachePayload = {
  id: string;
  lat: number;
  lng: number;
  source: ResolvedListingCoords["source"];
};

/** Collect inferred/estimated coords that should be persisted (not live DB values). */
export function collectCoordsToCache(
  items: CoordCachePayload[],
): Array<{ id: string; lat: number; lng: number }> {
  return items
    .filter((i) => i.source === "inferred" || i.source === "estimated")
    .map(({ id, lat, lng }) => ({ id, lat, lng }));
}

/** Fire-and-forget persist (browser). */
export function persistListingCoords(
  items: Array<{ id: string; lat: number; lng: number }>,
): void {
  if (typeof window === "undefined" || items.length === 0) return;
  const body = JSON.stringify({ coords: items.slice(0, 80) });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/properties/cache-coords", blob);
      return;
    }
  } catch {
    /* fall through */
  }
  void fetch("/api/properties/cache-coords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* non-blocking */
  });
}
