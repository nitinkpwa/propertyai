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
const STYLE_ID = "areaiq-listing-marker-styles-v6";

/** Compact Airbnb-style price for floating bubbles */
function formatBubblePrice(price: number | null | undefined): string {
  if (price == null || price <= 0) return "—";
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    const n = cr >= 10 ? cr.toFixed(1) : cr.toFixed(2).replace(/\.?0+$/, "");
    return `₹${n}Cr`;
  }
  return `₹${Math.round(price / 100_000)}L`;
}

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
  /* Allow page scroll to start on pins; taps still fire click */
  touch-action: pan-y;
  transform: translateY(-2px);
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease;
  will-change: transform;
  z-index: 4;
}
.areaiq-pin:hover { transform: translateY(-6px) scale(1.08); z-index: 12; }
.areaiq-pin.is-best { z-index: 28; transform: translateY(-4px) scale(1.1); }
.areaiq-pin.is-best:hover { transform: translateY(-8px) scale(1.12); }
.areaiq-pin.is-selected {
  z-index: 48 !important;
  transform: translateY(-8px) scale(1.15);
}
.areaiq-pin.is-selected:hover { transform: translateY(-10px) scale(1.18); }
.areaiq-pin.is-selected.is-bounce {
  animation: areaiq-marker-bounce 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.areaiq-pin.is-nearby { opacity: 0.55; filter: grayscale(0.85); z-index: 2; }
.areaiq-pin.is-nearby:hover { opacity: 0.85; filter: grayscale(0.4); }

.areaiq-pin-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.92);
  color: #111827;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 1px 0 rgba(255,255,255,0.9) inset, 0 6px 18px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.areaiq-pin.is-verified .areaiq-pin-bubble {
  box-shadow: 0 0 0 1.5px rgba(74,170,39,0.28), 0 1px 0 rgba(255,255,255,0.9) inset, 0 6px 18px rgba(15,23,42,0.08);
}
.areaiq-pin.is-best .areaiq-pin-bubble {
  background: #111827;
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8px 22px rgba(15,23,42,0.16);
}
.areaiq-pin.is-selected .areaiq-pin-bubble {
  background: #4AAA27;
  color: #fff;
  border-color: transparent;
  box-shadow: 0 0 0 3px rgba(74,170,39,0.18), 0 10px 28px rgba(74,170,39,0.22), 0 4px 10px rgba(15,23,42,0.08);
  animation: areaiq-selected-pulse 2.6s ease-in-out infinite;
}
.areaiq-pin-bubble .score {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.72;
}
.areaiq-pin.is-best .areaiq-pin-bubble .score,
.areaiq-pin.is-selected .areaiq-pin-bubble .score { opacity: 0.9; }
.areaiq-pin-bubble--rich { padding: 4px 12px 4px 4px; gap: 7px; }
.areaiq-pin-chip-thumb {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}
.areaiq-pin-chip-icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.06);
  font-size: 13px;
  flex-shrink: 0;
}
.areaiq-pin.is-best .areaiq-pin-chip-icon,
.areaiq-pin.is-selected .areaiq-pin-chip-icon { background: rgba(255,255,255,0.18); }

.areaiq-pin-compact {
  min-width: 36px;
  min-height: 28px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.92);
  color: #111827;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 6px 18px rgba(15,23,42,0.14);
}
.areaiq-pin.is-best .areaiq-pin-compact,
.areaiq-pin.is-selected .areaiq-pin-compact {
  background: #4AAA27;
  color: #fff;
  border-color: transparent;
}
.areaiq-pin-medium { display: none; }
.areaiq-pin-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(255,255,255,0.94);
  border: 1px solid rgba(255,255,255,0.7);
  box-shadow: 0 12px 32px rgba(15,23,42,0.16);
  width: 132px;
  text-align: left;
}
.areaiq-pin.is-best .areaiq-pin-card,
.areaiq-pin.is-selected .areaiq-pin-card {
  width: 148px;
  box-shadow: 0 0 0 2px rgba(74,170,39,0.35), 0 14px 36px rgba(15,23,42,0.18);
}
@keyframes areaiq-best-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(74,170,39,0.22), 0 0 16px rgba(74,170,39,0.4), 0 10px 28px rgba(15,23,42,0.18); }
  50% { box-shadow: 0 0 0 5px rgba(74,170,39,0.4), 0 0 28px rgba(74,170,39,0.65), 0 12px 32px rgba(15,23,42,0.22); }
}
@keyframes areaiq-selected-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(74,170,39,0.16), 0 10px 28px rgba(74,170,39,0.2), 0 4px 10px rgba(15,23,42,0.06); }
  50% { box-shadow: 0 0 0 5px rgba(74,170,39,0.26), 0 14px 32px rgba(74,170,39,0.28), 0 4px 12px rgba(15,23,42,0.08); }
}
@keyframes areaiq-marker-bounce {
  0% { transform: translateY(-2px) scale(1); }
  45% { transform: translateY(-12px) scale(1.2); }
  100% { transform: translateY(-8px) scale(1.15); }
}
@media (prefers-reduced-motion: reduce) {
  .areaiq-pin.is-best .areaiq-pin-compact,
  .areaiq-pin.is-best .areaiq-pin-medium,
  .areaiq-pin.is-best .areaiq-pin-card,
  .areaiq-pin.is-selected .areaiq-pin-compact,
  .areaiq-pin.is-selected .areaiq-pin-medium,
  .areaiq-pin.is-selected .areaiq-pin-card { animation: none; }
  .areaiq-pin.is-selected.is-bounce { animation: none; }
}
.areaiq-pin-thumb {
  width: 100%;
  height: 64px;
  object-fit: cover;
  background: #E8EEE6;
  display: block;
}
.areaiq-pin-thumb-fallback {
  width: 100%;
  height: 64px;
  background: linear-gradient(145deg, #F3F5F7, #EEF2EE);
}
.areaiq-pin-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px 10px;
  min-width: 0;
}
.areaiq-pin-name {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.areaiq-pin-price {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
  letter-spacing: -0.02em;
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
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--score, #4AAA27);
}
.areaiq-pin-verified { display: none; }
.areaiq-pin-badge { display: none; }
.areaiq-pin-tip { display: none; }
.areaiq-cluster {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(17,24,39,0.88);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 8px 22px rgba(15,23,42,0.14);
  cursor: pointer;
  touch-action: pan-y;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
  backdrop-filter: blur(10px);
}
.areaiq-cluster:hover { transform: scale(1.06); }
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

  const bubblePrice = formatBubblePrice(point.price);
  const score =
    point.score != null && Number.isFinite(point.score)
      ? String(Math.round(point.score))
      : "—";

  // Compact — quiet price chip
  if (tier === "compact") {
    root.innerHTML = `
      <div class="areaiq-pin-bubble">
        <span>${escapeHtml(bubblePrice)}</span>
      </div>
    `;
    return;
  }

  // Medium — price + score chip
  if (tier === "medium") {
    root.innerHTML = `
      <div class="areaiq-pin-bubble">
        <span>${escapeHtml(bubblePrice)}</span>
        ${score !== "—" ? `<span class="score">★${escapeHtml(score)}</span>` : ""}
      </div>
    `;
    return;
  }

  // Full zoom — thumbnail + price chip
  const thumb =
    point.imageUrl && !point.isNearby
      ? `<img class="areaiq-pin-chip-thumb" src="${escapeHtml(point.imageUrl)}" alt="" loading="lazy" decoding="async" />`
      : `<span class="areaiq-pin-chip-icon" aria-hidden="true">🏢</span>`;

  root.innerHTML = `
    <div class="areaiq-pin-bubble areaiq-pin-bubble--rich">
      ${thumb}
      <span>${escapeHtml(bubblePrice)}</span>
      ${score !== "—" ? `<span class="score">★${escapeHtml(score)}</span>` : ""}
    </div>
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
        if (selectedId === propertyId) el.style.zIndex = "48";
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
        if (selectedId === propertyId) el.style.zIndex = "48";
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
      const prevId = selectedId;
      selectedId = id;
      for (const [key, entry] of managed) {
        if (!key.startsWith("p-")) continue;
        const pid = key.slice(2);
        const el = entry.marker.getElement();
        const isSel = pid === id;
        el.classList.toggle("is-selected", isSel);
        el.classList.remove("is-bounce");
        if (isSel && id && id !== prevId) {
          // Force reflow so bounce restarts on every selection change
          void el.offsetWidth;
          el.classList.add("is-bounce");
          window.setTimeout(() => el.classList.remove("is-bounce"), 220);
        }
        el.style.zIndex = isSel
          ? "48"
          : entry.propertyId && byId.get(entry.propertyId)?.isBestMatch
            ? "30"
            : "4";
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
