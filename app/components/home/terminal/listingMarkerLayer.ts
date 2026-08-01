/**
 * Premium HTML listing markers + clusters for the AreaIQ Intelligence Map.
 * Zoom-aware cards, viewport-virtualized via querySourceFeatures.
 */

import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { Marker as MapMarker } from "maplibre-gl";
import type { MapPointFeature } from "@/lib/home/terminalTypes";
import {
  markerZoomTier,
  scoreBandColor,
  type MarkerZoomTier,
} from "@/lib/home/areaListingMarkers";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

const STYLE_ID = "areaiq-listing-marker-styles-v2";

function ensureStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.areaiq-pin {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transform: translateY(-2px);
  transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
  will-change: transform;
  z-index: 4;
}
.areaiq-pin:hover { transform: translateY(-6px) scale(1.05); z-index: 12; }
.areaiq-pin.is-best { z-index: 28; transform: translateY(-4px) scale(1.14); }
.areaiq-pin.is-best:hover { transform: translateY(-8px) scale(1.18); }
.areaiq-pin.is-selected { z-index: 26; }
.areaiq-pin.is-nearby { opacity: 0.55; filter: grayscale(0.85); z-index: 2; }
.areaiq-pin.is-nearby:hover { opacity: 0.85; filter: grayscale(0.4); }

.areaiq-pin-compact {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--score, #4AAA27);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(15,23,42,0.22);
}
.areaiq-pin.is-verified .areaiq-pin-compact {
  box-shadow: 0 0 0 2px rgba(74,170,39,0.4), 0 0 12px rgba(74,170,39,0.55), 0 4px 12px rgba(15,23,42,0.2);
}
.areaiq-pin.is-best .areaiq-pin-compact {
  width: 34px;
  height: 34px;
  font-size: 11px;
  animation: areaiq-best-pulse 2.8s ease-in-out infinite;
}

.areaiq-pin-medium {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 6px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--score, #4AAA27);
  box-shadow: 0 8px 18px rgba(15,23,42,0.16);
  min-width: 86px;
}
.areaiq-pin.is-verified .areaiq-pin-medium {
  box-shadow: 0 0 0 2px rgba(74,170,39,0.35), 0 0 14px rgba(74,170,39,0.45), 0 8px 18px rgba(15,23,42,0.16);
}
.areaiq-pin.is-best .areaiq-pin-medium {
  transform: scale(1.06);
  animation: areaiq-best-pulse 2.8s ease-in-out infinite;
}
.areaiq-pin-medium .score-dot {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--score, #4AAA27);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.areaiq-pin-medium .price {
  font-size: 11px;
  font-weight: 800;
  color: #111827;
  white-space: nowrap;
}

.areaiq-pin-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: #fff;
  border: 2px solid var(--score, #4AAA27);
  box-shadow: 0 10px 26px rgba(15,23,42,0.18);
  width: 148px;
  text-align: left;
}
.areaiq-pin.is-verified .areaiq-pin-card {
  box-shadow: 0 0 0 2px rgba(74,170,39,0.35), 0 0 18px rgba(74,170,39,0.5), 0 10px 26px rgba(15,23,42,0.18);
}
.areaiq-pin.is-best .areaiq-pin-card {
  width: 162px;
  border-width: 2.5px;
  animation: areaiq-best-pulse 2.8s ease-in-out infinite;
}
@keyframes areaiq-best-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(74,170,39,0.22), 0 0 16px rgba(74,170,39,0.4), 0 10px 28px rgba(15,23,42,0.18); }
  50% { box-shadow: 0 0 0 5px rgba(74,170,39,0.4), 0 0 28px rgba(74,170,39,0.65), 0 12px 32px rgba(15,23,42,0.22); }
}
@media (prefers-reduced-motion: reduce) {
  .areaiq-pin.is-best .areaiq-pin-compact,
  .areaiq-pin.is-best .areaiq-pin-medium,
  .areaiq-pin.is-best .areaiq-pin-card { animation: none; }
}
.areaiq-pin-thumb {
  width: 100%;
  height: 72px;
  object-fit: cover;
  background: #E8EEE6;
  display: block;
}
.areaiq-pin-thumb-fallback {
  width: 100%;
  height: 72px;
  background: linear-gradient(145deg, #E8F5E1, #F3F5F7);
}
.areaiq-pin-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 8px 8px;
  min-width: 0;
}
.areaiq-pin-name {
  font-size: 11px;
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.areaiq-pin-price {
  font-size: 11px;
  font-weight: 800;
  color: #111827;
  line-height: 1.1;
}
.areaiq-pin-score-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 2px;
}
.areaiq-pin-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  background: var(--score, #4AAA27);
}
.areaiq-pin-verified {
  font-size: 9px;
  font-weight: 800;
  color: #326F1A;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.areaiq-pin-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  border-radius: 999px;
  background: #326F1A;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 8px;
  box-shadow: 0 2px 8px rgba(50,111,26,0.35);
  z-index: 2;
}
.areaiq-pin-tip {
  width: 10px;
  height: 10px;
  margin-top: -5px;
  background: #fff;
  border-right: 2px solid var(--score, #4AAA27);
  border-bottom: 2px solid var(--score, #4AAA27);
  transform: rotate(45deg);
}
.areaiq-cluster {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1F2937, #326F1A);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.01em;
  border: 2px solid #fff;
  box-shadow: 0 8px 22px rgba(15,23,42,0.3);
  cursor: pointer;
  transition: transform 160ms ease;
}
.areaiq-cluster:hover { transform: scale(1.07); }
`;
  document.head.appendChild(style);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clusterLabel(count: number): string {
  return `${count} Propert${count === 1 ? "y" : "ies"}`;
}

function paintListingEl(
  root: HTMLElement,
  point: MapPointFeature,
  tier: MarkerZoomTier,
  selectedId: string | null,
): void {
  const color = point.isNearby ? "#9CA3AF" : scoreBandColor(point.score);
  root.className = [
    "areaiq-pin",
    `tier-${tier}`,
    point.verified && !point.isNearby ? "is-verified" : "",
    point.isBestMatch && !point.isNearby ? "is-best" : "",
    point.isNearby ? "is-nearby" : "",
    selectedId && point.propertyId === selectedId ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  root.style.setProperty("--score", color);
  root.setAttribute("aria-label", point.name);

  const price =
    point.price != null && point.price > 0
      ? formatInrAmount(point.price)
      : "—";
  const score =
    point.score != null && Number.isFinite(point.score)
      ? String(Math.round(point.score))
      : "—";

  const ribbon =
    point.isBestMatch && !point.isNearby
      ? `<span class="areaiq-pin-badge">Best Match</span>`
      : "";

  if (tier === "compact") {
    root.innerHTML = `
      ${ribbon}
      <div class="areaiq-pin-compact">${escapeHtml(score)}</div>
    `;
    return;
  }

  if (tier === "medium") {
    root.innerHTML = `
      ${ribbon}
      <div class="areaiq-pin-medium">
        <span class="score-dot">${escapeHtml(score)}</span>
        <span class="price">${escapeHtml(price)}</span>
      </div>
      <div class="areaiq-pin-tip" aria-hidden="true"></div>
    `;
    return;
  }

  const thumb =
    point.imageUrl && !point.isNearby
      ? `<img class="areaiq-pin-thumb" src="${escapeHtml(point.imageUrl)}" alt="" loading="lazy" decoding="async" />`
      : `<div class="areaiq-pin-thumb-fallback" aria-hidden="true"></div>`;

  root.innerHTML = `
    ${ribbon}
    <div class="areaiq-pin-card">
      ${thumb}
      <div class="areaiq-pin-meta">
        <span class="areaiq-pin-name">${escapeHtml(point.name)}</span>
        <span class="areaiq-pin-price">${escapeHtml(price)}</span>
        <div class="areaiq-pin-score-row">
          <span class="areaiq-pin-score">★ ${escapeHtml(score)}</span>
          ${
            point.verified && !point.isNearby
              ? `<span class="areaiq-pin-verified">Verified</span>`
              : ""
          }
        </div>
      </div>
    </div>
    <div class="areaiq-pin-tip" aria-hidden="true"></div>
  `;
}

function expandCluster(
  map: MapLibreMap,
  sourceId: string,
  clusterId: number,
  coords: [number, number],
): void {
  const src = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!src || typeof src.getClusterExpansionZoom !== "function") {
    map.easeTo({
      center: coords,
      zoom: Math.min(map.getZoom() + 1.8, 15.5),
      duration: 750,
      essential: true,
    });
    return;
  }
  const zoomTo = (zoom: number) => {
    map.easeTo({
      center: coords,
      zoom: Math.min(zoom + 0.35, 16.2),
      duration: 750,
      essential: true,
    });
  };
  try {
    const result = src.getClusterExpansionZoom(clusterId) as
      | number
      | Promise<number>;
    if (typeof result === "number") zoomTo(result);
    else
      void Promise.resolve(result)
        .then(zoomTo)
        .catch(() => {
          map.easeTo({
            center: coords,
            zoom: Math.min(map.getZoom() + 1.8, 15.5),
            duration: 750,
            essential: true,
          });
        });
  } catch {
    map.easeTo({
      center: coords,
      zoom: Math.min(map.getZoom() + 1.8, 15.5),
      duration: 750,
      essential: true,
    });
  }
}

type Managed = {
  marker: Marker;
  key: string;
  tier: MarkerZoomTier;
  propertyId?: string;
};

export type ListingMarkerController = {
  setListings: (listings: MapPointFeature[]) => void;
  setSelectedId: (id: string | null) => void;
  refresh: () => void;
  destroy: () => void;
};

export function createListingMarkerController(
  map: MapLibreMap,
  sourceId: string,
  onSelectListing: (propertyId: string) => void,
): ListingMarkerController {
  ensureStyles();
  const managed = new Map<string, Managed>();
  let byId = new Map<string, MapPointFeature>();
  let selectedId: string | null = null;
  let raf = 0;
  let lastZoomBucket = -1;

  const clear = () => {
    for (const m of managed.values()) m.marker.remove();
    managed.clear();
  };

  const sync = () => {
    if (!map.getSource(sourceId) || !map.isStyleLoaded()) return;

    const zoom = map.getZoom();
    const tier = markerZoomTier(zoom);
    const zoomBucket = Math.floor(zoom * 2);
    const tierChanged = zoomBucket !== lastZoomBucket;
    lastZoomBucket = zoomBucket;

    const features = map.querySourceFeatures(sourceId);
    const nextKeys = new Set<string>();

    // Prefer selected + best over others when many unclustered
    const unclustered: Array<{
      propertyId: string;
      coords: [number, number];
      point: MapPointFeature;
    }> = [];

    for (const f of features) {
      const geom = f.geometry;
      if (!geom || geom.type !== "Point") continue;
      const coords = geom.coordinates as [number, number];
      const props = f.properties ?? {};

      if (props.cluster) {
        const clusterId = Number(props.cluster_id);
        const count = Number(props.point_count) || 0;
        const key = `c-${clusterId}`;
        nextKeys.add(key);
        const label = clusterLabel(count);

        if (!managed.has(key)) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "areaiq-cluster";
          el.textContent = label;
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            expandCluster(map, sourceId, clusterId, coords);
          });
          const marker = new MapMarker({ element: el, anchor: "center" })
            .setLngLat(coords)
            .addTo(map);
          managed.set(key, { marker, key, tier });
        } else {
          const entry = managed.get(key)!;
          entry.marker.setLngLat(coords);
          const el = entry.marker.getElement();
          if (el.textContent !== label) el.textContent = label;
        }
        continue;
      }

      const propertyId = String(props.propertyId ?? "");
      if (!propertyId) continue;
      const point = byId.get(propertyId);
      if (!point) continue;
      unclustered.push({ propertyId, coords, point });
    }

    // Soft cap for extreme unclustered density (keeps 500+ via clustering)
    const MAX_HTML = 180;
    let visible = unclustered;
    if (unclustered.length > MAX_HTML) {
      visible = [...unclustered].sort((a, b) => {
        const ap =
          (a.point.propertyId === selectedId ? 3 : 0) +
          (a.point.isBestMatch ? 2 : 0) +
          (a.point.isNearby ? -1 : 0) +
          (a.point.score ?? 0) / 100;
        const bp =
          (b.point.propertyId === selectedId ? 3 : 0) +
          (b.point.isBestMatch ? 2 : 0) +
          (b.point.isNearby ? -1 : 0) +
          (b.point.score ?? 0) / 100;
        return bp - ap;
      }).slice(0, MAX_HTML);
    }

    for (const { propertyId, coords, point } of visible) {
      const key = `p-${propertyId}`;
      nextKeys.add(key);

      if (!managed.has(key)) {
        const el = document.createElement("button");
        el.type = "button";
        paintListingEl(el, point, tier, selectedId);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectListing(propertyId);
        });
        const marker = new MapMarker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat(coords)
          .addTo(map);
        if (point.isBestMatch) el.style.zIndex = "30";
        if (selectedId === propertyId) el.style.zIndex = "32";
        managed.set(key, { marker, key, tier, propertyId });
      } else {
        const entry = managed.get(key)!;
        entry.marker.setLngLat(coords);
        const el = entry.marker.getElement();
        if (tierChanged || entry.tier !== tier) {
          paintListingEl(el, point, tier, selectedId);
          entry.tier = tier;
        } else {
          el.classList.toggle("is-selected", selectedId === propertyId);
        }
        if (selectedId === propertyId) el.style.zIndex = "32";
        else if (point.isBestMatch) el.style.zIndex = "30";
        else if (point.isNearby) el.style.zIndex = "2";
        else el.style.zIndex = "4";
      }
    }

    for (const [key, entry] of managed) {
      if (!nextKeys.has(key)) {
        entry.marker.remove();
        managed.delete(key);
      }
    }
  };

  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  };

  map.on("render", schedule);
  map.on("moveend", schedule);
  map.on("zoom", schedule);
  map.on("zoomend", schedule);
  map.on("sourcedata", schedule);

  return {
    setListings(listings) {
      byId = new Map(
        listings
          .filter((l) => l.propertyId)
          .map((l) => [l.propertyId!, l]),
      );
      schedule();
    },
    setSelectedId(id) {
      selectedId = id;
      for (const [key, entry] of managed) {
        if (!key.startsWith("p-")) continue;
        const pid = key.slice(2);
        const el = entry.marker.getElement();
        el.classList.toggle("is-selected", pid === id);
        el.style.zIndex = pid === id ? "32" : entry.propertyId && byId.get(entry.propertyId)?.isBestMatch ? "30" : "4";
      }
      schedule();
    },
    refresh: schedule,
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      map.off("render", schedule);
      map.off("moveend", schedule);
      map.off("zoom", schedule);
      map.off("zoomend", schedule);
      map.off("sourcedata", schedule);
      clear();
    },
  };
}
