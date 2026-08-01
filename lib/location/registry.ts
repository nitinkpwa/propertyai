/**
 * AreaIQ Area Registry — single source of truth for location surfaces.
 *
 * PLACE_GRAPH holds geo + aliases.
 * This module decides where each place appears (map, forms, filters, AI, …)
 * and derives option lists for the whole platform.
 *
 * To add a micro-market later:
 * 1. Add a PlaceNode to PLACE_GRAPH with aliases + coords
 * 2. Set surfaces: ["map","forms","filters","preferred","admin","connect","ai","explore"]
 *    (and optional mapRadiusKm / suggestPriority)
 * No other files need location hardcoding.
 */

import {
  getPlaceById,
  PLACE_GRAPH,
  normalizePlaceToken,
} from "./synonyms";
import type { AreaSurface, PlaceKind, PlaceNode } from "./types";

const CITY_DEFAULT_SURFACES: AreaSurface[] = [
  "forms",
  "filters",
  "preferred",
  "admin",
  "connect",
  "ai",
  "explore",
];

/** Default map radius by kind when mapRadiusKm is unset. */
const DEFAULT_RADIUS_KM: Partial<Record<PlaceKind, number>> = {
  city: 3.4,
  micromarket: 1.8,
  locality: 2.0,
  corridor: 2.0,
  highway: 2.0,
  district: 3.6,
  sector: 1.2,
  landmark: 1.5,
};

function surfacesFor(place: PlaceNode): Set<AreaSurface> {
  if (place.surfaces?.length) return new Set(place.surfaces);
  if (place.kind === "city") return new Set(CITY_DEFAULT_SURFACES);
  return new Set();
}

function hasSurface(place: PlaceNode, surface: AreaSurface): boolean {
  return surfacesFor(place).has(surface);
}

function suggestPriorityOf(place: PlaceNode): number {
  if (typeof place.suggestPriority === "number") return place.suggestPriority;
  switch (place.kind) {
    case "micromarket":
      return 80;
    case "locality":
      return 70;
    case "sector":
      return 60;
    case "corridor":
    case "highway":
      return 55;
    case "city":
      return 40;
    default:
      return 30;
  }
}

/** All registered places that expose a given surface, sorted for UI. */
export function getPlacesForSurface(surface: AreaSurface): PlaceNode[] {
  const places = PLACE_GRAPH.filter((p) => hasSurface(p, surface));
  // Map chips keep PLACE_GRAPH order (stable geography). Other surfaces rank by suggestPriority.
  if (surface === "map") return places;
  return places.sort((a, b) => {
    const pd = suggestPriorityOf(b) - suggestPriorityOf(a);
    if (pd !== 0) return pd;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function getDisplayNamesForSurface(surface: AreaSurface): string[] {
  return getPlacesForSurface(surface).map((p) => p.displayName);
}

/** Listing / search filter location dropdown. */
export function getFilterLocationOptions(): string[] {
  return getDisplayNamesForSurface("filters");
}

/** Seller / buyer city selects. */
export function getFormCityOptions(): string[] {
  return getDisplayNamesForSurface("forms");
}

/** Admin property wizard cities. */
export function getAdminCityOptions(): string[] {
  return getDisplayNamesForSurface("admin");
}

/** Connect partner cities. */
export function getConnectCityOptions(): string[] {
  return getDisplayNamesForSurface("connect");
}

/** Buyer preferred-area chips. */
export function getPreferredAreaOptions(): string[] {
  return getDisplayNamesForSurface("preferred");
}

/** AI taxonomy / Tricity city group. */
export function getTricityCityOptions(): string[] {
  return getDisplayNamesForSurface("ai");
}

/** Homepage explore / marketing area names. */
export function getExploreAreaOptions(): string[] {
  return getDisplayNamesForSurface("explore");
}

export type RegistryMapArea = {
  id: string;
  name: string;
  placeId: string;
  aliases: string[];
  lat: number;
  lng: number;
  mapRadiusKm: number;
};

/** Intelligence Map chips — independent inventory aggregation per area. */
export function getMapAreas(): RegistryMapArea[] {
  return getPlacesForSurface("map")
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      name: p.displayName,
      placeId: p.id,
      aliases: [...p.aliases, p.displayName],
      lat: p.lat as number,
      lng: p.lng as number,
      mapRadiusKm:
        p.mapRadiusKm ?? DEFAULT_RADIUS_KM[p.kind] ?? 2.4,
    }));
}

export function getMapAreaRadiusKm(areaId: string): number {
  const place = getPlaceById(areaId);
  if (!place) return 2.4;
  return place.mapRadiusKm ?? DEFAULT_RADIUS_KM[place.kind] ?? 2.4;
}

/**
 * Autocomplete suggestions — specific micro-markets rank above parent cities
 * when the query matches (e.g. "Panchkula Ext" → Extension 1/2 before Panchkula).
 */
export function suggestAreas(
  query: string,
  limit = 8,
): { id: string; displayName: string; kind: PlaceKind; parentCity: string | null }[] {
  const q = normalizePlaceToken(query);
  if (!q) {
    return getPlacesForSurface("filters")
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        kind: p.kind,
        parentCity: p.parentCity,
      }));
  }

  const scored: { place: PlaceNode; score: number }[] = [];
  for (const place of PLACE_GRAPH) {
    const names = [place.displayName, ...place.aliases].map(normalizePlaceToken);
    let best = 0;
    for (const name of names) {
      if (!name) continue;
      if (name === q) best = Math.max(best, 1000 + suggestPriorityOf(place));
      else if (name.startsWith(q))
        best = Math.max(best, 800 + suggestPriorityOf(place) + name.length);
      else if (name.includes(q))
        best = Math.max(best, 500 + suggestPriorityOf(place) + name.length);
      else if (q.includes(name) && name.length >= 4)
        best = Math.max(best, 300 + suggestPriorityOf(place));
    }
    if (best > 0) scored.push({ place, score: best });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ place }) => ({
    id: place.id,
    displayName: place.displayName,
    kind: place.kind,
    parentCity: place.parentCity,
  }));
}

/** Resolve registry entry by place id (null if unknown). */
export function getRegisteredPlace(placeId: string): PlaceNode | undefined {
  return getPlaceById(placeId);
}
