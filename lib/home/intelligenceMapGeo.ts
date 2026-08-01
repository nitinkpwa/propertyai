/**
 * Geographic anchors for the homepage Intelligence Map.
 * Area centroids + road corridors come from AreaIQ PLACE_GRAPH (deterministic).
 * Airport is a fixed real landmark for map context — not a market statistic.
 */

import { getPlaceById } from "@/lib/location/synonyms";

export type MapAreaDef = {
  id: string;
  name: string;
  placeId: string;
  aliases: string[];
  lat: number;
  lng: number;
};

/** Required Tricity intelligence nodes — coords from PLACE_GRAPH only. */
const AREA_SPECS: { id: string; placeId: string; extraAliases?: string[] }[] = [
  { id: "chandigarh", placeId: "chandigarh" },
  { id: "mohali", placeId: "mohali" },
  { id: "aerocity", placeId: "aerocity" },
  { id: "airport-road", placeId: "airport-road" },
  { id: "pr7", placeId: "pr7" },
  { id: "zirakpur", placeId: "zirakpur" },
  { id: "panchkula", placeId: "panchkula" },
  { id: "new-chandigarh", placeId: "new-chandigarh", extraAliases: ["mullanpur"] },
  { id: "kharar", placeId: "kharar" },
  { id: "kurali", placeId: "kurali" },
  { id: "derabassi", placeId: "derabassi", extraAliases: ["dera bassi"] },
];

function requirePlaceCoords(placeId: string): { lat: number; lng: number; name: string; aliases: string[] } {
  const place = getPlaceById(placeId);
  if (!place || place.lat == null || place.lng == null) {
    throw new Error(`PLACE_GRAPH missing coords for ${placeId}`);
  }
  return {
    lat: place.lat,
    lng: place.lng,
    name: place.displayName,
    aliases: place.aliases,
  };
}

export const INTELLIGENCE_MAP_AREAS: MapAreaDef[] = AREA_SPECS.map((spec) => {
  const place = requirePlaceCoords(spec.placeId);
  return {
    id: spec.id,
    name: place.name,
    placeId: spec.placeId,
    aliases: [...place.aliases, ...(spec.extraAliases ?? [])],
    lat: place.lat,
    lng: place.lng,
  };
});

/** Sort aliases longest-first so "airport road" wins over "airport". */
export const MAP_AREA_MATCHERS = INTELLIGENCE_MAP_AREAS.map((a) => ({
  id: a.id,
  aliases: [...a.aliases].sort((x, y) => y.length - x.length),
})).sort(
  (a, b) => (b.aliases[0]?.length ?? 0) - (a.aliases[0]?.length ?? 0),
);

export const TRICITY_MAP_CENTER = { lat: 30.705, lng: 76.76 } as const;
export const TRICITY_MAP_ZOOM = 10.55;
export const TRICITY_MAP_MIN_ZOOM = 9.2;
export const TRICITY_MAP_MAX_ZOOM = 15.5;

/** Radius (km) for approximate locality polygons — cities larger than corridors. */
const AREA_RADIUS_KM: Record<string, number> = {
  chandigarh: 4.2,
  mohali: 3.8,
  panchkula: 3.4,
  zirakpur: 3.2,
  "new-chandigarh": 3.6,
  kharar: 3.0,
  kurali: 2.6,
  derabassi: 2.8,
  aerocity: 2.2,
  "airport-road": 2.0,
  pr7: 2.0,
};

/** Build a closed regular polygon around a centroid (deterministic geo approx). */
export function buildAreaPolygon(
  lat: number,
  lng: number,
  areaId: string,
  sides = 8,
): [number, number][] {
  const radiusKm = AREA_RADIUS_KM[areaId] ?? 2.4;
  const ring: [number, number][] = [];
  const latRad = (lat * Math.PI) / 180;
  const degLat = radiusKm / 110.574;
  const degLng = radiusKm / (111.32 * Math.cos(latRad));
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    ring.push([
      lng + degLng * Math.cos(angle),
      lat + degLat * Math.sin(angle),
    ]);
  }
  ring.push(ring[0]!);
  return ring;
}

/** Chandigarh International Airport (IXC) — real landmark. */
export const CHANDIGARH_AIRPORT = {
  id: "ixc",
  name: "Chandigarh Airport",
  lat: 30.6735,
  lng: 76.7885,
} as const;

type RoadDef = {
  id: string;
  name: string;
  placeIds: string[];
};

const ROAD_SPECS: RoadDef[] = [
  {
    id: "airport-road-corridor",
    name: "Airport Road",
    placeIds: ["mohali", "airport-road", "aerocity"],
  },
  {
    id: "pr7-corridor",
    name: "PR7",
    placeIds: ["aerocity", "pr7", "zirakpur"],
  },
  {
    id: "nh21-corridor",
    name: "NH21",
    placeIds: ["kurali", "nh-21", "kharar", "chandigarh-highway"],
  },
  {
    id: "chandigarh-highway-corridor",
    name: "Chandigarh Highway",
    placeIds: ["kurali", "kharar", "chandigarh-highway", "mohali"],
  },
  {
    id: "vip-road-corridor",
    name: "VIP Road",
    placeIds: ["zirakpur", "vip-road", "peer-muchalla"],
  },
];

export type RoadLine = {
  id: string;
  name: string;
  coordinates: [number, number][];
};

export function buildMajorRoadLines(): RoadLine[] {
  return ROAD_SPECS.map((road) => {
    const coordinates: [number, number][] = [];
    for (const pid of road.placeIds) {
      const place = getPlaceById(pid);
      if (place?.lng != null && place?.lat != null) {
        coordinates.push([place.lng, place.lat]);
      }
    }
    return { id: road.id, name: road.name, coordinates };
  }).filter((r) => r.coordinates.length >= 2);
}

/** Primary vector style (OpenFreeMap Liberty). */
export const AREAIQ_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export {
  OSM_RASTER_STYLE as AREAIQ_MAP_STYLE_FALLBACK,
} from "./mapBootstrap";
