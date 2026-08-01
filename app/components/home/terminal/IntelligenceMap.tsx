"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, Plane } from "lucide-react";
import type {
  IntelligenceMapLayers,
  MapPointFeature,
  TricityMapNode,
} from "@/lib/home/terminalTypes";
import {
  TRICITY_MAP_CENTER,
  TRICITY_MAP_MAX_ZOOM,
  TRICITY_MAP_MIN_ZOOM,
  TRICITY_MAP_ZOOM,
} from "@/lib/home/intelligenceMapGeo";
import {
  buildAreaMapSummary,
  buildBuilderLinks,
  mapRenderableListings,
} from "@/lib/home/areaListingMarkers";
import {
  CARTO_RASTER_STYLE,
  OSM_RASTER_STYLE,
  forceMapResize,
  installAreaIQMapDebug,
  mapDiag,
  resolveInitialStyle,
  setMapProviderMeta,
  type MapProviderId,
} from "@/lib/home/mapBootstrap";
import { IQ_GREEN } from "../theme";
import StaticTricityMapFallback from "./StaticTricityMapFallback";
import ListingPopup from "./ListingPopup";
import {
  createListingMarkerController,
  type ListingMarkerController,
} from "./listingMarkerLayer";
import {
  applyAreaHighlight,
  fitCameraToArea,
  mountIntelligenceOverlays,
  syncOverlayData,
} from "./mapOverlays";

type LayerKey =
  | "polygons"
  | "heatmap"
  | "listings"
  | "builders"
  | "premium"
  | "roads"
  | "airport"
  | "infra"
  | "schools"
  | "hospitals"
  | "metro"
  | "commercial"
  | "luxury"
  | "rental"
  | "future";

const LAYER_LABELS: { key: LayerKey; label: string; live: boolean }[] = [
  { key: "polygons", label: "Zones", live: true },
  { key: "heatmap", label: "Heat", live: true },
  { key: "listings", label: "Listings", live: true },
  { key: "builders", label: "Builders", live: true },
  { key: "premium", label: "Luxury", live: true },
  { key: "roads", label: "Infra", live: true },
  { key: "airport", label: "Airport", live: true },
  { key: "metro", label: "Metro", live: false },
  { key: "schools", label: "Schools", live: false },
  { key: "hospitals", label: "Hospitals", live: false },
  { key: "commercial", label: "Commercial", live: false },
  { key: "rental", label: "Rental", live: false },
  { key: "future", label: "Future", live: false },
];

type HoverTip = {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  href?: string;
};

type RenderMode = "loading" | "map" | "static";

export default function IntelligenceMap({
  nodes,
  layers,
  activeId,
  selectedPropertyId,
  onSelect,
  onSelectProperty,
}: {
  nodes: TricityMapNode[];
  layers: IntelligenceMapLayers;
  activeId: string | null;
  selectedPropertyId?: string | null;
  onSelect: (id: string) => void;
  onSelectProperty?: (propertyId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const nodesRef = useRef(nodes);
  const layersRef = useRef(layers);
  const onSelectRef = useRef(onSelect);
  const onSelectPropertyRef = useRef(onSelectProperty);
  const markerCtrlRef = useRef<ListingMarkerController | null>(null);
  const pulseRef = useRef(0);
  /** 0=vector, 1=osm, 2=carto, 3=static */
  const fallbackStepRef = useRef(0);
  const idleSeenRef = useRef(false);
  const mapReadyRef = useRef(false);
  const lastFitKeyRef = useRef<string | null>(null);
  const lastSelectedPropertyRef = useRef<string | null>(null);

  const [renderMode, setRenderMode] = useState<RenderMode>("loading");
  const [mapReady, setMapReady] = useState(false);
  const [provider, setProvider] = useState<MapProviderId | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverTip, setHoverTip] = useState<HoverTip | null>(null);
  const [emptyLayerNote, setEmptyLayerNote] = useState<string | null>(null);
  const [popupListing, setPopupListing] = useState<MapPointFeature | null>(null);
  const [enabled, setEnabled] = useState<Record<LayerKey, boolean>>({
    polygons: true,
    heatmap: true,
    listings: true,
    builders: false,
    premium: false,
    // Roads/infra demoted — inventory is the hero
    roads: false,
    airport: false,
    infra: false,
    schools: false,
    hospitals: false,
    metro: false,
    commercial: false,
    luxury: false,
    rental: false,
    future: false,
  });

  nodesRef.current = nodes;
  layersRef.current = layers;
  onSelectRef.current = onSelect;
  onSelectPropertyRef.current = onSelectProperty;

  const active = useMemo(
    () => nodes.find((n) => n.id === activeId) ?? null,
    [nodes, activeId],
  );

  const renderable = useMemo(
    () => mapRenderableListings(layers.verifiedListings, active, activeId),
    [layers.verifiedListings, active, activeId],
  );

  const areaListings = renderable.primary;
  const mapPins = renderable.all;

  const areaBuilderLinks = useMemo(
    () => buildBuilderLinks(areaListings),
    [areaListings],
  );

  const areaSummary = useMemo(
    () => buildAreaMapSummary(active, areaListings),
    [active, areaListings],
  );

  // ── Bootstrap MapLibre once ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let fallbackTimer: number | undefined;
    let hardFailTimer: number | undefined;
    let removeDebug: (() => void) | undefined;

    const markStatic = (reason: string) => {
      if (cancelled) return;
      mapDiag("fallback", true, `static-svg — ${reason}`);
      setMapProviderMeta("static-svg", null);
      setProvider("static-svg");
      setFailReason(reason);
      setRenderMode("static");
      setMapReady(false);
    };

    const resizeAll = () => forceMapResize(mapRef.current);

    const onStyleReady = (instance: MapLibreMap) => {
      if (cancelled) return;
      mapDiag("style_loaded", true);

      try {
        mountIntelligenceOverlays(instance, nodesRef.current, layersRef.current, {
          onSelectArea: (id) => {
            onSelectRef.current(id);
            onSelectPropertyRef.current?.(null);
            setPopupListing(null);
          },
          onSelectListing: (propertyId) => {
            const listing =
              layersRef.current.verifiedListings.find(
                (l) => l.propertyId === propertyId,
              ) ?? null;
            setPopupListing(listing);
            onSelectPropertyRef.current?.(propertyId);
            markerCtrlRef.current?.setSelectedId(propertyId);
          },
          onHoverTip: setHoverTip,
        });

        markerCtrlRef.current?.destroy();
        markerCtrlRef.current = createListingMarkerController(
          instance,
          "listings",
          (propertyId) => {
            const listing =
              layersRef.current.verifiedListings.find(
                (l) => l.propertyId === propertyId,
              ) ?? null;
            setPopupListing(listing);
            onSelectPropertyRef.current?.(propertyId);
            markerCtrlRef.current?.setSelectedId(propertyId);
          },
        );
      } catch (err) {
        mapDiag(
          "error",
          false,
          err instanceof Error ? err.message : "overlay error",
        );
        // Base map may still be visible — keep going
      }

      const style = instance.getStyle();
      mapDiag(
        "sources_loaded",
        Boolean(style?.sources && Object.keys(style.sources).length > 0),
        `sources=${Object.keys(style?.sources ?? {}).length}`,
      );
      mapDiag(
        "layers_loaded",
        Boolean(style?.layers && style.layers.length > 0),
        `layers=${style?.layers?.length ?? 0}`,
      );

      const canvas = instance.getCanvas();
      mapDiag(
        "resized",
        canvas.clientWidth > 0 && canvas.clientHeight > 0,
        `canvas=${canvas.clientWidth}x${canvas.clientHeight}`,
      );

      setRenderMode("map");
      setMapReady(true);
      mapReadyRef.current = true;
      resizeAll();
      window.setTimeout(resizeAll, 50);
      window.setTimeout(resizeAll, 250);
      window.setTimeout(resizeAll, 800);
    };

    const advanceFallback = (instance: MapLibreMap, why: string) => {
      const step = fallbackStepRef.current;
      if (step <= 0) {
        fallbackStepRef.current = 1;
        mapDiag("fallback", true, `${why} → osm-raster`);
        setMapProviderMeta("osm-raster", "inline:osm-raster");
        setProvider("osm-raster");
        instance.setStyle(OSM_RASTER_STYLE as never);
        return;
      }
      if (step === 1) {
        fallbackStepRef.current = 2;
        mapDiag("fallback", true, `${why} → carto-raster`);
        setMapProviderMeta("carto-raster", "inline:carto");
        setProvider("carto-raster");
        instance.setStyle(CARTO_RASTER_STYLE as never);
        return;
      }
      markStatic(why);
    };

    const boot = async () => {
      const el = containerRef.current;
      if (!el || mapRef.current) return;

      // Wait one frame so layout height is real
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (cancelled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mapDiag(
        "resized",
        rect.width > 0 && rect.height > 0,
        `container=${Math.round(rect.width)}x${Math.round(rect.height)}`,
      );

      if (rect.width < 2 || rect.height < 2) {
        markStatic("zero-size container");
        return;
      }

      let initial: Awaited<ReturnType<typeof resolveInitialStyle>>;
      try {
        initial = await resolveInitialStyle();
      } catch (err) {
        mapDiag(
          "error",
          false,
          err instanceof Error ? err.message : "style resolve failed",
        );
        initial = { provider: "osm-raster", style: OSM_RASTER_STYLE };
      }

      if (cancelled || !containerRef.current) return;
      if (initial.provider === "osm-raster") fallbackStepRef.current = 1;

      try {
        map = new MapLibreMap({
          container: containerRef.current,
          style: initial.style as never,
          center: [TRICITY_MAP_CENTER.lng, TRICITY_MAP_CENTER.lat],
          zoom: TRICITY_MAP_ZOOM,
          minZoom: TRICITY_MAP_MIN_ZOOM,
          maxZoom: TRICITY_MAP_MAX_ZOOM,
          attributionControl: { compact: true },
          fadeDuration: 300,
          pitchWithRotate: false,
        });
      } catch (err) {
        mapDiag(
          "map_created",
          false,
          err instanceof Error ? err.message : "constructor failed",
        );
        markStatic("MapLibre constructor failed");
        return;
      }

      mapRef.current = map;
      setProvider(initial.provider);
      mapDiag("map_created", true, initial.provider);
      mapDiag(
        "style_requested",
        true,
        typeof initial.style === "string" ? initial.style : initial.provider,
      );

      // Register load ASAP — inline styles can fire quickly
      map.on("load", () => {
        idleSeenRef.current = false;
        onStyleReady(map!);
      });

      map.addControl(
        new NavigationControl({ visualizePitch: false, showCompass: false }),
        "bottom-right",
      );

      map.on("data", (e: { dataType?: string; isSourceLoaded?: boolean }) => {
        if (e.dataType === "source" && e.isSourceLoaded) {
          mapDiag("first_tile", true, "source data");
        }
      });

      map.on("idle", () => {
        idleSeenRef.current = true;
        mapDiag("map_idle", true);
        resizeAll();
      });

      map.on("error", (e) => {
        const msg =
          (e as { error?: { message?: string }; message?: string }).error
            ?.message ||
          (e as { message?: string }).message ||
          "map error";
        mapDiag("error", false, msg);

        if (
          /style|tile|fetch|ajax|Failed to fetch|403|404|CORS|network/i.test(msg)
        ) {
          advanceFallback(map!, msg);
        }
      });

      // Soft timeout: if never idle, force next provider
      fallbackTimer = window.setTimeout(() => {
        if (cancelled || idleSeenRef.current || mapReadyRef.current) return;
        if (!mapRef.current) return;
        advanceFallback(mapRef.current, "style/tiles timeout 5s");
      }, 5000);

      // Hard timeout: MapLibre completely dead → static SVG
      hardFailTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (!idleSeenRef.current && !mapReadyRef.current) {
          try {
            mapRef.current?.remove();
          } catch {
            /* ignore */
          }
          mapRef.current = null;
          markStatic("map never became idle");
        }
      }, 12000);

      resizeObserver = new ResizeObserver(() => resizeAll());
      resizeObserver.observe(containerRef.current);

      window.addEventListener("resize", resizeAll);
      document.addEventListener("visibilitychange", resizeAll);

      removeDebug = installAreaIQMapDebug(() => {
        const m = mapRef.current;
        const canvas = m?.getCanvas();
        const style = m?.getStyle();
        return {
          provider,
          zoom: m?.getZoom(),
          center: m?.getCenter(),
          loadedLayers: style?.layers?.map((l) => l.id) ?? [],
          loadedSources: Object.keys(style?.sources ?? {}),
          canvasSize: canvas
            ? { w: canvas.clientWidth, h: canvas.clientHeight }
            : null,
          containerSize: containerRef.current
            ? {
                w: containerRef.current.clientWidth,
                h: containerRef.current.clientHeight,
              }
            : null,
          renderMode,
          mapReady,
          failReason,
        };
      });

      // Immediate resize after construct
      forceMapResize(map);
    };

    void boot();

    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (hardFailTimer) window.clearTimeout(hardFailTimer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeAll);
      document.removeEventListener("visibilitychange", resizeAll);
      removeDebug?.();
      markerCtrlRef.current?.destroy();
      markerCtrlRef.current = null;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapDiag("destroyed", true);
        } catch {
          mapDiag("destroyed", false, "remove threw");
        }
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  // Sync overlay data + area-filtered listings (primary + grey nearby)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || renderMode !== "map") return;
    try {
      syncOverlayData(map, nodes, layers, mapPins, areaBuilderLinks);
      markerCtrlRef.current?.setListings(mapPins);
      markerCtrlRef.current?.refresh();
    } catch {
      /* sources may be mid style-swap */
    }
  }, [nodes, layers, mapPins, areaBuilderLinks, mapReady, renderMode]);

  // Highlight selection + fit camera to area inventory
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !active) return;
    applyAreaHighlight(map, active.id);

    const fitKey = `${active.id}:${mapPins.map((l) => l.propertyId).join(",")}`;
    if (lastFitKeyRef.current === fitKey) return;
    lastFitKeyRef.current = fitKey;

    const t = window.setTimeout(() => {
      fitCameraToArea(map, active, mapPins);
    }, 40);
    return () => window.clearTimeout(t);
  }, [active, mapPins, mapReady]);

  // Keep marker selected state + popup in sync with drawer
  useEffect(() => {
    markerCtrlRef.current?.setSelectedId(selectedPropertyId ?? null);
    if (!selectedPropertyId) {
      lastSelectedPropertyRef.current = null;
      setPopupListing(null);
      return;
    }
    const listing =
      areaListings.find((l) => l.propertyId === selectedPropertyId) ??
      layers.verifiedListings.find((l) => l.propertyId === selectedPropertyId) ??
      null;
    if (!listing) return;
    setPopupListing(listing);

    const changed = lastSelectedPropertyRef.current !== selectedPropertyId;
    lastSelectedPropertyRef.current = selectedPropertyId;
    if (!changed) return;

    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.easeTo({
      center: [listing.lng, listing.lat],
      zoom: Math.max(map.getZoom(), 13.4),
      duration: 700,
      essential: true,
    });
  }, [selectedPropertyId, areaListings, layers.verifiedListings, mapReady]);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = (on: boolean) => (on ? "visible" : "none") as "visible" | "none";
    const set = (id: string, on: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis(on));
    };
    set("zone-fill", enabled.polygons);
    set("zone-outline", enabled.polygons);
    set("heat-fade", enabled.heatmap);
    set("roads-glow", enabled.roads || enabled.infra);
    set("roads-line", enabled.roads || enabled.infra);
    set("airport-glow", enabled.airport);
    set("airport-point", enabled.airport);
    set("builder-hq", enabled.builders);
    set("builder-links", enabled.listings && areaListings.length > 1);
    // Soften area bubbles so inventory cards dominate
    set("area-bubbles", enabled.polygons);
    set("area-glow", enabled.heatmap);
    // Circle listing layers stay hidden — HTML markers are the surface
    for (const id of ["listings-clusters", "listings-cluster-count", "listings-points"]) {
      set(id, false);
    }
    for (const id of ["premium-clusters", "premium-cluster-count", "premium-points"]) {
      set(id, enabled.premium || enabled.luxury);
    }
    if (enabled.listings) {
      markerCtrlRef.current?.setListings(mapPins);
    } else {
      markerCtrlRef.current?.setListings([]);
    }
  }, [enabled, mapReady, mapPins, areaListings.length]);

  // Pulse (skip if reduced motion)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!mapRef.current?.getLayer("area-glow")) return;
      pulseRef.current = (pulseRef.current + 1) % 72;
      const t = pulseRef.current / 72;
      const wave = 0.14 + Math.sin(t * Math.PI * 2) * 0.1;
      try {
        mapRef.current.setPaintProperty("area-glow", "circle-opacity", [
          "*",
          ["get", "demandGlow"],
          wave,
        ]);
        if (mapRef.current.getLayer("heat-fade")) {
          mapRef.current.setPaintProperty(
            "heat-fade",
            "heatmap-opacity",
            0.32 + Math.sin(t * Math.PI * 2) * 0.1,
          );
        }
      } catch {
        /* ignore */
      }
    }, 70);
    return () => window.clearInterval(id);
  }, [mapReady]);

  const toggleLayer = (key: LayerKey, live: boolean) => {
    if (!live) {
      setEmptyLayerNote("Collecting Intelligence");
      window.setTimeout(() => setEmptyLayerNote(null), 2200);
    }
    setEnabled((e) => ({ ...e, [key]: !e[key] }));
  };

  // Static SVG fallback — never blank
  if (renderMode === "static") {
    return (
      <StaticTricityMapFallback
        nodes={nodes}
        activeId={activeId}
        onSelect={onSelect}
        reason={failReason ?? undefined}
      />
    );
  }

  return (
    <div
      className="relative h-[720px] w-full overflow-hidden rounded-3xl border border-neutral-200/80 bg-[#F3F5F7] shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:h-[780px]"
      data-map-provider={provider ?? "booting"}
    >
      <div
        ref={containerRef}
        className="areaiq-map-container absolute inset-0 h-full w-full"
        style={{ width: "100%", height: "100%", minHeight: 720 }}
        role="img"
        aria-label="AreaIQ Tricity intelligence command map"
      />

      {/* Area intelligence summary */}
      {areaSummary && mapReady ? (
        <div className="absolute left-3 right-3 top-3 z-[3] flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-white/70 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur sm:right-auto sm:max-w-[min(100%-1.5rem,520px)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-heading-primary">
              {areaSummary.name}
            </p>
            <p className="text-[11px] font-semibold text-muted">
              {areaSummary.verifiedCount} Verified Listing
              {areaSummary.verifiedCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="hidden h-8 w-px bg-neutral-200 sm:block" />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-body">
            <span>
              Average Price{" "}
              <strong className="text-heading-primary">
                {areaSummary.averagePriceLabel}
              </strong>
            </span>
            <span>
              Best Score{" "}
              <strong style={{ color: IQ_GREEN }}>
                {areaSummary.bestScoreLabel}
              </strong>
            </span>
            <span>
              Builder Count{" "}
              <strong className="text-heading-primary">
                {areaSummary.builderCount}
              </strong>
            </span>
          </div>
        </div>
      ) : null}

      {/* Layers control */}
      <div className="absolute left-3 top-[4.75rem] z-[2] max-w-[min(100%-1.5rem,340px)]">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-heading-primary shadow-md backdrop-blur"
        >
          <Layers className="h-3.5 w-3.5" style={{ color: IQ_GREEN }} aria-hidden />
          Layers
        </button>
        {menuOpen ? (
          <div className="mt-2 flex flex-wrap gap-1.5 rounded-2xl border border-neutral-200/80 bg-white/95 p-2 shadow-lg backdrop-blur">
            {LAYER_LABELS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => toggleLayer(l.key, l.live)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  enabled[l.key]
                    ? "bg-[#4AAA27] text-white"
                    : "bg-neutral-100 text-body hover:bg-neutral-200"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LAYER_LABELS.filter((l) => l.live)
              .slice(0, 6)
              .map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => toggleLayer(l.key, l.live)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm backdrop-blur ${
                    enabled[l.key]
                      ? "bg-[#4AAA27] text-white"
                      : "bg-white/90 text-body"
                  }`}
                >
                  {l.label}
                </button>
              ))}
          </div>
        )}
      </div>

      {areaSummary?.empty && mapReady && !popupListing ? (
        <div className="absolute bottom-5 left-1/2 z-[3] w-[min(100%-2rem,340px)] -translate-x-1/2 rounded-2xl border border-neutral-200/80 bg-white/96 px-4 py-3 text-center shadow-lg backdrop-blur">
          <p className="text-sm font-bold text-heading-primary">
            AreaIQ is expanding coverage here.
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {renderable.nearby.length > 0
              ? "Nearby verified projects shown in grey for context."
              : "Empty intelligence state — live listings appear when geocoded."}
          </p>
        </div>
      ) : null}

      {emptyLayerNote ? (
        <div className="absolute bottom-4 left-1/2 z-[3] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-muted shadow-md">
          {emptyLayerNote}
        </div>
      ) : null}

      {popupListing ? (
        <ListingPopup
          listing={popupListing}
          onClose={() => {
            setPopupListing(null);
            onSelectPropertyRef.current?.(null);
            markerCtrlRef.current?.setSelectedId(null);
          }}
        />
      ) : null}

      {layers.airport && enabled.airport && mapReady ? (
        <div className="pointer-events-none absolute bottom-4 left-3 z-[2] hidden items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-body shadow-sm sm:inline-flex">
          <Plane className="h-3 w-3" style={{ color: IQ_GREEN }} aria-hidden />
          {layers.airport.name}
        </div>
      ) : null}

      {hoverTip ? (
        <div
          className="pointer-events-none absolute z-[4] max-w-[220px] rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur"
          style={{
            left: Math.min(
              hoverTip.x + 14,
              (containerRef.current?.clientWidth ?? 320) - 230,
            ),
            top: Math.max(12, hoverTip.y - 10),
          }}
        >
          <p className="text-xs font-bold text-heading-primary">{hoverTip.title}</p>
          <p className="mt-0.5 text-[11px] text-muted">{hoverTip.subtitle}</p>
          {hoverTip.href ? (
            <Link
              href={hoverTip.href}
              className="pointer-events-auto mt-1 inline-flex text-[10px] font-semibold text-[#4AAA27] no-underline"
            >
              Open →
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Loading overlay — clears as soon as mapReady; never blocks forever */}
      {!mapReady ? (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-[#F3F5F7]/80">
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-muted shadow-sm">
            Loading map…
          </div>
        </div>
      ) : null}
    </div>
  );
}
