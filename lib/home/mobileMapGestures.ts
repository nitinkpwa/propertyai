/**
 * Map interaction modes for AreaIQ Intelligence Map.
 *
 * preview  — dashboard embed: page scroll always wins; no touch hijacking.
 *            Pinch zoom OK. Small pan only while the map is focused.
 * explore  — dedicated full-screen page: full pan / zoom / rotate off pitch.
 */

import type { Map as MapLibreMap } from "maplibre-gl";

export type MapInteractionMode = "preview" | "explore";

type PreviewApi = {
  setFocused: (focused: boolean) => void;
  isFocused: () => boolean;
};

/**
 * Install interaction policy for a MapLibre map.
 * Returns cleanup + optional preview focus API.
 */
export function installMapInteractionMode(
  map: MapLibreMap,
  mode: MapInteractionMode,
): { destroy: () => void; preview?: PreviewApi } {
  const container = map.getContainer();
  const canvas = map.getCanvas();
  const canvasContainer = map.getCanvasContainer();

  const setTouchAction = (value: string) => {
    canvas.style.touchAction = value;
    canvasContainer.style.touchAction = value;
    container.style.touchAction = value;
  };

  // Pinch + double-tap zoom always available
  map.touchZoomRotate.enable();
  map.doubleClickZoom.enable();
  map.dragRotate.disable();
  try {
    map.touchPitch.disable();
  } catch {
    /* older builds */
  }

  if (mode === "explore") {
    map.dragPan.enable();
    map.scrollZoom.enable();
    setTouchAction("none");
    container.classList.remove("areaiq-map--scroll-first");
    container.classList.add("areaiq-map--explore");
    container.classList.remove("areaiq-map--preview");
    container.classList.remove("areaiq-map--focused");

    return {
      destroy: () => {
        container.classList.remove("areaiq-map--explore");
        setTouchAction("");
      },
    };
  }

  // ── Preview: never trap the finger ──────────────────────────
  let focused = false;

  const applyPreviewIdle = () => {
    focused = false;
    map.dragPan.disable();
    // Keep wheel zoom off in preview so trackpads don't fight page scroll
    map.scrollZoom.disable();
    map.touchZoomRotate.enable();
    setTouchAction("pan-y");
    container.classList.add("areaiq-map--scroll-first", "areaiq-map--preview");
    container.classList.remove("areaiq-map--focused", "areaiq-map--explore");
  };

  const applyPreviewFocused = () => {
    focused = true;
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.touchZoomRotate.enable();
    setTouchAction("none");
    container.classList.add(
      "areaiq-map--scroll-first",
      "areaiq-map--preview",
      "areaiq-map--focused",
    );
  };

  applyPreviewIdle();

  const onStyleData = () => {
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    if (focused) applyPreviewFocused();
    else applyPreviewIdle();
  };
  map.on("load", onStyleData);
  map.on("styledata", onStyleData);

  // Scroll / wheel outside intentional focus → release focus
  const onWheel = () => {
    if (focused) applyPreviewIdle();
  };
  window.addEventListener("wheel", onWheel, { passive: true });

  const preview: PreviewApi = {
    setFocused: (next) => {
      if (next) applyPreviewFocused();
      else applyPreviewIdle();
    },
    isFocused: () => focused,
  };

  return {
    destroy: () => {
      window.removeEventListener("wheel", onWheel);
      map.off("load", onStyleData);
      map.off("styledata", onStyleData);
      container.classList.remove(
        "areaiq-map--scroll-first",
        "areaiq-map--preview",
        "areaiq-map--focused",
        "areaiq-map--explore",
      );
      setTouchAction("");
      try {
        map.dragPan.enable();
        map.scrollZoom.enable();
      } catch {
        /* map removed */
      }
    },
    preview,
  };
}

/** @deprecated Use installMapInteractionMode — kept for existing imports */
export function installMobileMapGestures(map: MapLibreMap): () => void {
  const { destroy } = installMapInteractionMode(map, "preview");
  return destroy;
}
