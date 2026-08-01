/**
 * Geographic anchors for the homepage Intelligence Map.
 * Area centroids + chips come from the AreaIQ Area Registry / PLACE_GRAPH.
 * Airport is a fixed real landmark for map context — not a market statistic.
 */

import { getPlaceById } from "@/lib/location/synonyms";
import {
  getMapAreaRadiusKm,
  getMapAreas,
} from "@/lib/location/registry";

export { getMapAreaRadiusKm };

export type MapAreaDef = {
  id: string;
  name: string;
  placeId: string;
  aliases: string[];
  lat: number;
  lng: number;
};

/** Required Tricity intelligence nodes — derived from Area Registry (`surfaces: map`). */
export const INTELLIGENCE_MAP_AREAS: MapAreaDef[] = getMapAreas().map((a) => ({
  id: a.id,
  name: a.name,
  placeId: a.placeId,
  aliases: a.aliases,
  lat: a.lat,
  lng: a.lng,
}));

/** Sort aliases longest-first so "panchkula extension 2" wins over "panchkula". */
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

/** Build a closed regular polygon around a centroid (deterministic geo approx). */
export function buildAreaPolygon(
  lat: number,
  lng: number,
  areaId: string,
  sides = 8,
): [number, number][] {
  const radiusKm = getMapAreaRadiusKm(areaId);
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
  {
    id: "panchkula-extension-corridor",
    name: "Panchkula Extension",
    placeIds: [
      "panchkula",
      "panchkula-extension-1",
      "amravati-enclave",
      "panchkula-extension-2",
    ],
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
