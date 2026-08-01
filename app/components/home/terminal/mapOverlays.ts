/**
 * Intelligence overlay sources/layers for MapLibre.
 * Idempotent — safe to call after style swaps.
 */

import {
  LngLatBounds,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type MapMouseEvent,
} from "maplibre-gl";
import type {
  IntelligenceMapLayers,
  MapBuilderLink,
  MapPointFeature,
  TricityMapNode,
} from "@/lib/home/terminalTypes";
import { TRICITY_MAP_MAX_ZOOM } from "@/lib/home/intelligenceMapGeo";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { mapDiag } from "@/lib/home/mapBootstrap";
import { buildBuilderLinks } from "@/lib/home/areaListingMarkers";

const IQ_GREEN = "#4AAA27";

const TONE_FILL: Record<string, string> = {
  green: "#4AAA27",
  yellow: "#D4A017",
  red: "#C45C4A",
  grey: "#9CA3AF",
};

type FC = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, string | number | boolean | null>;
    geometry:
      | { type: "Point"; coordinates: [number, number] }
      | { type: "LineString"; coordinates: [number, number][] }
      | { type: "Polygon"; coordinates: [number, number][][] };
  }>;
};

export function polygonsToGeoJSON(nodes: TricityMapNode[]): FC {
  return {
    type: "FeatureCollection",
    features: nodes.map((n) => ({
      type: "Feature" as const,
      properties: {
        id: n.id,
        name: n.name,
        tone: n.zoneTone,
        fill: TONE_FILL[n.zoneTone],
        opacity: n.hasIntelligence
          ? 0.12 + (n.marketConfidence ?? 40) / 400
          : 0.08,
        inventory: n.listingCount,
        heatWeight: n.heatWeight,
        demandGlow:
          n.demand === "high"
            ? 1
            : n.demand === "medium"
              ? 0.55
              : n.hasIntelligence
                ? 0.25
                : 0,
      },
      geometry: { type: "Polygon" as const, coordinates: [n.polygon] },
    })),
  };
}

export function centroidsToGeoJSON(nodes: TricityMapNode[]): FC {
  return {
    type: "FeatureCollection",
    features: nodes.map((n) => ({
      type: "Feature" as const,
      properties: {
        id: n.id,
        name: n.name,
        inventory: n.listingCount,
        heatWeight: Math.max(0.05, n.heatWeight),
        color: TONE_FILL[n.zoneTone],
        hasData: n.hasIntelligence ? 1 : 0,
        verification: n.verificationConfidence ?? 0,
        demandGlow:
          n.demand === "high"
            ? 1
            : n.demand === "medium"
              ? 0.55
              : n.hasIntelligence
                ? 0.25
                : 0,
      },
      geometry: { type: "Point" as const, coordinates: [n.lng, n.lat] },
    })),
  };
}

export function pointsToGeoJSON(points: MapPointFeature[]): FC {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature" as const,
      properties: {
        id: p.id,
        propertyId: p.propertyId ?? "",
        name: p.name,
        href: p.href,
        score: p.score ?? -1,
        price: p.price ?? -1,
        builderName: p.builderName ?? "",
        kind: p.kind ?? "listing",
        areaId: p.areaId ?? "",
        imageUrl: p.imageUrl ?? "",
        bhk: p.bhk ?? -1,
        areaSize: p.areaSize ?? -1,
        areaUnit: p.areaUnit ?? "sqft",
        legalPercent: p.legalPercent ?? -1,
        builderRating: p.builderRating ?? -1,
        verified: p.verified ? 1 : 0,
        isBestMatch: p.isBestMatch ? 1 : 0,
        isNearby: p.isNearby ? 1 : 0,
        askHref: p.askHref ?? "",
        bookVisitHref: p.bookVisitHref ?? "",
      },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
}

export function builderLinksToGeoJSON(links: MapBuilderLink[]): FC {
  return {
    type: "FeatureCollection",
    features: links.map((l) => ({
      type: "Feature" as const,
      properties: {
        id: l.id,
        builderName: l.builderName,
        color: l.color,
      },
      geometry: { type: "LineString" as const, coordinates: l.coordinates },
    })),
  };
}

export function roadsToGeoJSON(roads: IntelligenceMapLayers["majorRoads"]): FC {
  return {
    type: "FeatureCollection",
    features: roads.map((r) => ({
      type: "Feature" as const,
      properties: { id: r.id, name: r.name },
      geometry: { type: "LineString" as const, coordinates: r.coordinates },
    })),
  };
}

export function airportToGeoJSON(
  airport: IntelligenceMapLayers["airport"],
): FC {
  if (!airport) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: airport.name },
        geometry: {
          type: "Point",
          coordinates: [airport.lng, airport.lat],
        },
      },
    ],
  };
}

function ensureSource(
  map: MapLibreMap,
  id: string,
  spec: Parameters<MapLibreMap["addSource"]>[1],
): void {
  if (map.getSource(id)) return;
  map.addSource(id, spec);
}

function ensureLayer(
  map: MapLibreMap,
  layer: Parameters<MapLibreMap["addLayer"]>[0],
): void {
  if ("id" in layer && map.getLayer(layer.id)) return;
  map.addLayer(layer);
}

export type OverlayHandlers = {
  onSelectArea: (id: string) => void;
  onSelectListing?: (propertyId: string) => void;
  onHoverTip: (
    tip: {
      x: number;
      y: number;
      title: string;
      subtitle: string;
      href?: string;
    } | null,
  ) => void;
};

/** Mount or remount intelligence overlays after any style load. */
export function mountIntelligenceOverlays(
  map: MapLibreMap,
  nodes: TricityMapNode[],
  layers: IntelligenceMapLayers,
  handlers: OverlayHandlers,
): void {
  try {
    ensureSource(map, "area-polygons", {
      type: "geojson",
      data: polygonsToGeoJSON(nodes),
    });
    ensureSource(map, "area-centroids", {
      type: "geojson",
      data: centroidsToGeoJSON(nodes),
    });
    ensureSource(map, "listings", {
      type: "geojson",
      data: pointsToGeoJSON(layers.verifiedListings),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    ensureSource(map, "premium", {
      type: "geojson",
      data: pointsToGeoJSON(layers.premiumProjects),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40,
    });
    ensureSource(map, "builders", {
      type: "geojson",
      data: pointsToGeoJSON(layers.builderHeadquarters),
    });
    ensureSource(map, "roads", {
      type: "geojson",
      data: roadsToGeoJSON(layers.majorRoads),
    });
    ensureSource(map, "airport", {
      type: "geojson",
      data: airportToGeoJSON(layers.airport),
    });
    ensureSource(map, "builder-links", {
      type: "geojson",
      data: builderLinksToGeoJSON(layers.builderLinks ?? []),
    });
    mapDiag("sources_loaded", true, "intelligence overlays");

    // Layer stack (bottom → top): zones → heat → roads → builder links →
    // area labels → builder HQ → airport. HTML listing markers sit above all.
    ensureLayer(map, {
      id: "zone-fill",
      type: "fill",
      source: "area-polygons",
      paint: {
        "fill-color": ["get", "fill"],
        "fill-opacity": ["*", ["get", "opacity"], 0.7],
      },
    });
    ensureLayer(map, {
      id: "zone-outline",
      type: "line",
      source: "area-polygons",
      paint: {
        "line-color": ["get", "fill"],
        "line-width": 1.1,
        "line-opacity": 0.5,
      },
    });
    ensureLayer(map, {
      id: "heat-fade",
      type: "heatmap",
      source: "area-centroids",
      paint: {
        "heatmap-weight": ["get", "heatWeight"],
        "heatmap-intensity": 0.7,
        "heatmap-radius": 36,
        "heatmap-opacity": 0.22,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(74,170,39,0)",
          0.35,
          "rgba(168,212,142,0.18)",
          0.7,
          "rgba(74,170,39,0.28)",
          1,
          "rgba(50,111,26,0.4)",
        ],
      },
    });
    ensureLayer(map, {
      id: "roads-glow",
      type: "line",
      source: "roads",
      paint: {
        "line-color": IQ_GREEN,
        "line-width": 5,
        "line-opacity": 0.06,
        "line-blur": 3,
      },
    });
    ensureLayer(map, {
      id: "roads-line",
      type: "line",
      source: "roads",
      paint: {
        "line-color": IQ_GREEN,
        "line-width": 1.4,
        "line-opacity": 0.28,
      },
      layout: { "line-cap": "round", "line-join": "round" },
    });
    ensureLayer(map, {
      id: "builder-links",
      type: "line",
      source: "builder-links",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 1.6,
        "line-opacity": 0.42,
        "line-dasharray": [1.2, 1.6],
      },
      layout: { "line-cap": "round", "line-join": "round" },
    });
    ensureLayer(map, {
      id: "area-glow",
      type: "circle",
      source: "area-centroids",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "inventory"],
          0,
          14,
          20,
          32,
        ],
        "circle-color": ["get", "color"],
        "circle-opacity": ["*", ["get", "demandGlow"], 0.08],
        "circle-blur": 0.85,
      },
    });
    ensureLayer(map, {
      id: "area-bubbles",
      type: "circle",
      source: "area-centroids",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "inventory"],
          0,
          5,
          1,
          7,
          8,
          11,
          25,
          16,
        ],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.35,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#FFFFFF",
      },
    });
    ensureLayer(map, {
      id: "area-labels",
      type: "symbol",
      source: "area-centroids",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.6],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#374151",
        "text-opacity": 0.75,
        "text-halo-color": "rgba(255,255,255,0.92)",
        "text-halo-width": 1.2,
      },
    });

    const addClusters = (source: string, color: string, prefix: string) => {
      ensureLayer(map, {
        id: `${prefix}-clusters`,
        type: "circle",
        source,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": color,
          "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 25, 26],
          "circle-opacity": 0.88,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
      ensureLayer(map, {
        id: `${prefix}-cluster-count`,
        type: "symbol",
        source,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
        },
        paint: { "text-color": "#FFFFFF" },
      });
      ensureLayer(map, {
        id: `${prefix}-points`,
        type: "circle",
        source,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 5.5,
          "circle-color": color,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });
    };

    // Listings use premium HTML markers (listingMarkerLayer). Keep
    // invisible hit targets for fallback hover; hide painted circles.
    addClusters("listings", "#326F1A", "listings");
    for (const id of [
      "listings-clusters",
      "listings-cluster-count",
      "listings-points",
    ]) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", "none");
      }
    }
    addClusters("premium", IQ_GREEN, "premium");

    ensureLayer(map, {
      id: "builder-hq",
      type: "circle",
      source: "builders",
      paint: {
        "circle-radius": 8,
        "circle-color": "#111827",
        "circle-stroke-width": 2.5,
        "circle-stroke-color": IQ_GREEN,
        "circle-opacity": 0.92,
      },
    });
    ensureLayer(map, {
      id: "airport-glow",
      type: "circle",
      source: "airport",
      paint: {
        "circle-radius": 18,
        "circle-color": IQ_GREEN,
        "circle-opacity": 0.15,
        "circle-blur": 0.8,
      },
    });
    ensureLayer(map, {
      id: "airport-point",
      type: "circle",
      source: "airport",
      paint: {
        "circle-radius": 7,
        "circle-color": "#326F1A",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    mapDiag("layers_loaded", true, String(map.getStyle()?.layers?.length ?? 0));

    // Interaction handlers — guard against duplicates via named namespace flag
    const flag = "__areaiqHandlers" as const;
    const mapAny = map as MapLibreMap & { [flag]?: boolean };
    if (!mapAny[flag]) {
      mapAny[flag] = true;

      const pickArea = (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) handlers.onSelectArea(id);
      };
      map.on("click", "zone-fill", pickArea);
      map.on("click", "area-bubbles", pickArea);
      map.on("click", "area-labels", pickArea);

      map.on("dblclick", (e: MapMouseEvent) => {
        map.easeTo({
          center: e.lngLat,
          zoom: Math.min(TRICITY_MAP_MAX_ZOOM, map.getZoom() + 2.2),
          duration: 900,
        });
      });

      const tipFromProps = (e: MapLayerMouseEvent, fallback: string) => {
        const f = e.features?.[0];
        if (!f?.properties) return null;
        const p = f.properties;
        const score = Number(p.score);
        const price = Number(p.price);
        const parts: string[] = [];
        if (Number.isFinite(score) && score >= 0) parts.push(`Score ${Math.round(score)}`);
        if (Number.isFinite(price) && price > 0) parts.push(formatInrAmount(price));
        if (p.builderName) parts.push(String(p.builderName));
        return {
          x: e.point.x,
          y: e.point.y,
          title: String(p.name ?? fallback),
          subtitle: parts.join(" · ") || "Live listing",
          href: p.href ? String(p.href) : undefined,
        };
      };

      for (const layerId of ["listings-points", "premium-points", "builder-hq"]) {
        map.on("mouseenter", layerId, (e) => {
          map.getCanvas().style.cursor = "pointer";
          handlers.onHoverTip(tipFromProps(e, "Point"));
        });
        map.on("mousemove", layerId, (e) => {
          handlers.onHoverTip(tipFromProps(e, "Point"));
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
          handlers.onHoverTip(null);
        });
      }

      map.on("mouseenter", "area-bubbles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "area-bubbles", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "zone-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "zone-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      const goHref = (e: MapLayerMouseEvent) => {
        const href = e.features?.[0]?.properties?.href as string | undefined;
        if (href) window.location.href = href;
      };
      map.on("click", "builder-hq", goHref);
      map.on("click", "premium-points", goHref);

      map.on("click", "listings-points", (e) => {
        const propertyId = e.features?.[0]?.properties?.propertyId as
          | string
          | undefined;
        if (propertyId && handlers.onSelectListing) {
          handlers.onSelectListing(propertyId);
          return;
        }
        goHref(e);
      });

      map.on("click", "listings-clusters", (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const clusterId = f.properties?.cluster_id as number | undefined;
        const coords = f.geometry.coordinates as [number, number];
        const src = map.getSource("listings") as
          | { getClusterExpansionZoom?: (id: number) => Promise<number> }
          | undefined;
        if (clusterId != null && src?.getClusterExpansionZoom) {
          void src.getClusterExpansionZoom(clusterId).then((zoom) => {
            map.easeTo({
              center: coords,
              zoom: Math.min(zoom + 0.35, 16),
              duration: 750,
              essential: true,
            });
          });
        }
      });
    }
  } catch (err) {
    mapDiag(
      "layers_loaded",
      false,
      err instanceof Error ? err.message : "overlay mount failed",
    );
    throw err;
  }
}

export function syncOverlayData(
  map: MapLibreMap,
  nodes: TricityMapNode[],
  layers: IntelligenceMapLayers,
  areaListings?: MapPointFeature[],
  builderLinks?: MapBuilderLink[],
): void {
  const set = (id: string, data: FC) => {
    const src = map.getSource(id) as { setData?: (d: FC) => void } | undefined;
    src?.setData?.(data);
  };
  const pins = areaListings ?? layers.verifiedListings;
  const links =
    builderLinks ??
    buildBuilderLinks(pins.filter((p) => !p.isNearby));
  set("area-polygons", polygonsToGeoJSON(nodes));
  set("area-centroids", centroidsToGeoJSON(nodes));
  set("listings", pointsToGeoJSON(pins));
  set("premium", pointsToGeoJSON(layers.premiumProjects));
  set("builders", pointsToGeoJSON(layers.builderHeadquarters));
  set("roads", roadsToGeoJSON(layers.majorRoads));
  set("airport", airportToGeoJSON(layers.airport));
  set("builder-links", builderLinksToGeoJSON(links));
}

/** Highlight selected zone and fade peers. */
export function applyAreaHighlight(
  map: MapLibreMap,
  activeId: string | null,
): void {
  if (!activeId) return;
  try {
    if (map.getLayer("zone-outline")) {
      map.setPaintProperty("zone-outline", "line-width", [
        "case",
        ["==", ["get", "id"], activeId],
        3.4,
        0.7,
      ]);
      map.setPaintProperty("zone-outline", "line-opacity", [
        "case",
        ["==", ["get", "id"], activeId],
        1,
        0.22,
      ]);
    }
    if (map.getLayer("zone-fill")) {
      map.setPaintProperty("zone-fill", "fill-opacity", [
        "case",
        ["==", ["get", "id"], activeId],
        ["min", 0.42, ["+", ["get", "opacity"], 0.18]],
        ["*", ["get", "opacity"], 0.28],
      ]);
    }
    if (map.getLayer("area-bubbles")) {
      map.setPaintProperty("area-bubbles", "circle-opacity", [
        "case",
        ["==", ["get", "id"], activeId],
        0.28,
        0.1,
      ]);
    }
    if (map.getLayer("area-labels")) {
      map.setPaintProperty("area-labels", "text-opacity", [
        "case",
        ["==", ["get", "id"], activeId],
        0.85,
        0.25,
      ]);
    }
  } catch {
    /* mid style-swap */
  }
}

/** Smoothly fit camera to inventory — tight framing, minimal empty map. */
export function fitCameraToArea(
  map: MapLibreMap,
  node: TricityMapNode,
  listings: MapPointFeature[],
): void {
  try {
    const bounds = new LngLatBounds();
    let hasPoint = false;

    // Prefer primary area inventory; include nearby only when empty
    const primary = listings.filter((l) => !l.isNearby);
    const fitSet = primary.length > 0 ? primary : listings;

    for (const l of fitSet) {
      if (
        typeof l.lat === "number" &&
        typeof l.lng === "number" &&
        Number.isFinite(l.lat) &&
        Number.isFinite(l.lng)
      ) {
        bounds.extend([l.lng, l.lat]);
        hasPoint = true;
      }
    }

    if (!hasPoint && node.polygon?.length) {
      for (const [lng, lat] of node.polygon) {
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          bounds.extend([lng, lat]);
          hasPoint = true;
        }
      }
    }

    if (!hasPoint) {
      map.easeTo({
        center: [node.lng, node.lat],
        zoom: 12.4,
        duration: 900,
        essential: true,
      });
      return;
    }

    const count = fitSet.length;
    map.fitBounds(bounds, {
      padding: { top: 108, bottom: 72, left: 40, right: 40 },
      maxZoom: count <= 1 ? 15.2 : count <= 3 ? 14.4 : 13.8,
      duration: 1000,
      essential: true,
    });
  } catch {
    map.easeTo({
      center: [node.lng, node.lat],
      zoom: 12.4,
      duration: 900,
      essential: true,
    });
  }
}
