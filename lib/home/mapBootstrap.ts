/**
 * Production map bootstrap — diagnostics + style fallback chain.
 * Never leave the Intelligence Map blank.
 */

/** Loose style type — avoids tight coupling to MapLibre StyleSpecification revisions. */
export type MapStyleSpec = {
  version: 8;
  name?: string;
  sources: Record<string, unknown>;
  layers: Array<Record<string, unknown>>;
};

export type MapProviderId =
  | "openfreemap-liberty"
  | "openfreemap-positron"
  | "osm-raster"
  | "carto-raster"
  | "static-svg"
  | "area-cards";

export type MapDiagStage =
  | "map_created"
  | "style_requested"
  | "style_loaded"
  | "sources_loaded"
  | "layers_loaded"
  | "first_tile"
  | "map_idle"
  | "fallback"
  | "error"
  | "resized"
  | "destroyed";

type DiagEntry = {
  at: number;
  stage: MapDiagStage;
  ok: boolean;
  detail?: string;
};

const diagLog: DiagEntry[] = [];
let lastProvider: MapProviderId | null = null;
let lastStyleUrl: string | null = null;
let lastError: string | null = null;

export function mapDiag(
  stage: MapDiagStage,
  ok: boolean,
  detail?: string,
): void {
  const entry: DiagEntry = { at: Date.now(), stage, ok, detail };
  diagLog.push(entry);
  if (diagLog.length > 80) diagLog.shift();
  const mark = ok ? "✓" : "✗";
  const msg = `[AreaIQ Map] ${mark} ${stage}${detail ? ` — ${detail}` : ""}`;
  if (ok) console.info(msg);
  else console.warn(msg);
  if (!ok) lastError = detail ?? stage;
}

export function setMapProviderMeta(
  provider: MapProviderId,
  styleUrl: string | null,
): void {
  lastProvider = provider;
  lastStyleUrl = styleUrl;
}

/** Vector styles to try first (production-ready public OpenFreeMap). */
export const VECTOR_STYLE_CHAIN: { id: MapProviderId; url: string }[] = [
  {
    id: "openfreemap-liberty",
    url: "https://tiles.openfreemap.org/styles/liberty",
  },
  {
    id: "openfreemap-positron",
    url: "https://tiles.openfreemap.org/styles/positron",
  },
];

/** Raster styles — always render roads/labels if vector fails. */
export const OSM_RASTER_STYLE: MapStyleSpec = {
  version: 8,
  name: "AreaIQ OSM Raster",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export const CARTO_RASTER_STYLE: MapStyleSpec = {
  version: 8,
  name: "AreaIQ Carto Light",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "carto-raster",
      type: "raster",
      source: "carto",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export async function probeStyleUrl(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      signal: ctrl.signal,
      cache: "no-store",
    });
    window.clearTimeout(t);
    if (!res.ok) {
      mapDiag("style_requested", false, `${url} → HTTP ${res.status}`);
      return false;
    }
    const json = (await res.json()) as { version?: number; layers?: unknown[] };
    const ok = json?.version === 8 && Array.isArray(json.layers) && json.layers.length > 0;
    mapDiag("style_requested", ok, ok ? url : `${url} invalid style body`);
    return ok;
  } catch (err) {
    mapDiag(
      "style_requested",
      false,
      `${url} → ${err instanceof Error ? err.message : "fetch failed"}`,
    );
    return false;
  }
}

export async function resolveInitialStyle(): Promise<{
  provider: MapProviderId;
  style: string | MapStyleSpec;
}> {
  for (const candidate of VECTOR_STYLE_CHAIN) {
    const ok = await probeStyleUrl(candidate.url);
    if (ok) {
      setMapProviderMeta(candidate.id, candidate.url);
      return { provider: candidate.id, style: candidate.url };
    }
  }

  // Raster fallbacks don't need a remote style.json
  mapDiag("fallback", true, "vector unavailable → OSM raster");
  setMapProviderMeta("osm-raster", "inline:osm-raster");
  return { provider: "osm-raster", style: OSM_RASTER_STYLE };
}

export function forceMapResize(map: { resize: () => void } | null): void {
  if (!map) return;
  requestAnimationFrame(() => {
    try {
      map.resize();
      mapDiag("resized", true, "rAF");
    } catch (err) {
      mapDiag(
        "resized",
        false,
        err instanceof Error ? err.message : "resize failed",
      );
    }
  });
}

export function installAreaIQMapDebug(
  getSnapshot: () => Record<string, unknown>,
): () => void {
  if (process.env.NODE_ENV === "production") return () => undefined;
  const w = window as Window & {
    AreaIQMapDebug?: () => Record<string, unknown>;
  };
  w.AreaIQMapDebug = () => {
    const snap = {
      provider: lastProvider,
      styleUrl: lastStyleUrl,
      lastError,
      diagnostics: [...diagLog],
      ...getSnapshot(),
    };
    console.table(
      diagLog.map((d) => ({
        stage: d.stage,
        ok: d.ok ? "✓" : "✗",
        detail: d.detail ?? "",
        t: new Date(d.at).toISOString(),
      })),
    );
    console.info("[AreaIQ Map Debug]", snap);
    return snap;
  };
  return () => {
    delete w.AreaIQMapDebug;
  };
}

export function getMapDiagLog(): DiagEntry[] {
  return [...diagLog];
}
