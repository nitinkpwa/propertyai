/** Viewport-aware onboarding spotlight + tooltip placement.
 *
 * Coordinate system (canonical):
 * - Overlay is `position: fixed` covering the viewport.
 * - All geometry comes from `Element.getBoundingClientRect()` (viewport coords).
 * - NEVER add window.scrollX / scrollY for fixed overlays.
 */

export type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type SafeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ViewportMode = "mobile" | "tablet" | "desktop";

export type PlacementSide = "bottom" | "top" | "right" | "left" | "center";

export type TooltipLayout = {
  top: number;
  left: number;
  width: number;
  side: PlacementSide;
  mode: "floating" | "sheet" | "center";
};

const GAP = 14;
const DESKTOP_CARD_W = 400;
const DESKTOP_CARD_MIN_W = 360;
const DESKTOP_CARD_MAX_W = 440;
const MOBILE_SHEET_MAX_VH = 0.42;
const SMALL_TARGET_MAX = 120;

function cssVarPx(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getViewportSize(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1200, height: 800 };
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
  };
}

export function getViewportMode(): ViewportMode {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function getSafeInsets(mode: ViewportMode = getViewportMode()): SafeInsets {
  const safeTop = cssVarPx("--safe-top", 0);
  const safeBottom = cssVarPx("--safe-bottom", 0);
  const navbar = cssVarPx("--navbar-height", 64) || 64;
  const notification = cssVarPx("--notification-height", 0);
  const bottomnav =
    mode === "desktop" ? 0 : cssVarPx("--bottomnav-height", 64) || 64;

  return {
    top: Math.max(12, safeTop + navbar + notification + 8),
    right: 16,
    bottom: Math.max(12, safeBottom + bottomnav + (mode === "mobile" ? 8 : 12)),
    left: 16,
  };
}

export function getMobileSheetMaxHeight(
  vh = typeof window !== "undefined" ? getViewportSize().height : 800,
): number {
  return Math.round(vh * MOBILE_SHEET_MAX_VH);
}

/** Canonical target geometry in VIEWPORT coordinates (for fixed overlays). */
export function getTargetRect(targetElement: Element): Rect {
  const r = targetElement.getBoundingClientRect();
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
    right: r.right,
    bottom: r.bottom,
  };
}

export function padRect(rect: Rect, pad = 8): Rect {
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    right: rect.right + pad,
    bottom: rect.bottom + pad,
  };
}

export function isTourDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("tourDebug") === "1";
  } catch {
    return false;
  }
}

export function logTargetDebug(
  step: string,
  target: string,
  rect: Rect,
): void {
  if (!isTourDebugEnabled()) return;
  const vp = getViewportSize();
  console.log({
    step,
    target,
    rect: {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    },
    viewport: { width: vp.width, height: vp.height },
  });
}

/** True when the element is painted and has a non-zero box. */
export function isUsableTarget(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const opacity = style.opacity === "" ? 1 : Number(style.opacity);
  if (Number.isFinite(opacity) && opacity === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** Intersects the layout/visual viewport (not fully off-screen). */
export function isRectInViewport(rect: Rect, pad = 0): boolean {
  const { width: vw, height: vh } = getViewportSize();
  return (
    rect.bottom > -pad &&
    rect.right > -pad &&
    rect.top < vh + pad &&
    rect.left < vw + pad
  );
}

/**
 * Cap huge section highlights so they stay usable.
 * NEVER relocate small controls (buttons/menus) — that creates blank spotlights.
 * Soft edge clamp only as a last-resort safety net (does not invent coordinates).
 */
export function clampSpotlightRect(
  rect: Rect,
  safe: SafeInsets,
  opts?: { maxHeight?: number; maxWidth?: number; sheetReserve?: number },
): Rect {
  const { width: vw, height: vh } = getViewportSize();
  const bottomLimit = vh - (opts?.sheetReserve ?? 0);
  const isSmall =
    rect.width <= SMALL_TARGET_MAX && rect.height <= SMALL_TARGET_MAX;

  if (isSmall) {
    // Keep true geometry; only a light viewport safety trim if it massively overflows.
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
    };
  }

  const maxH =
    opts?.maxHeight ??
    Math.max(160, (bottomLimit || vh) - safe.top - 24);
  const maxW = opts?.maxWidth ?? vw - safe.left - safe.right;

  let top = rect.top;
  let left = rect.left;
  let width = Math.min(rect.width, maxW);
  let height = Math.min(rect.height, maxH);

  // Prefer keeping the top of large section targets visible below chrome
  if (top < safe.top) {
    const overflow = safe.top - top;
    top = safe.top;
    height = Math.max(80, height - overflow);
  }
  if (bottomLimit > 0 && top + height > bottomLimit) {
    height = Math.max(80, bottomLimit - top);
  }
  if (left < 0) {
    width = Math.max(40, width + left);
    left = 0;
  }
  if (left + width > vw) {
    width = Math.max(40, vw - left);
  }

  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

export function calculateSpotlight(
  targetRect: Rect,
  pad = 8,
  opts?: {
    safe?: SafeInsets;
    maxHeight?: number;
    maxWidth?: number;
    sheetReserve?: number;
  },
): Rect {
  const padded = padRect(targetRect, pad);
  if (!opts) return padded;
  return clampSpotlightRect(padded, opts.safe ?? getSafeInsets(), {
    maxHeight: opts.maxHeight,
    maxWidth: opts.maxWidth,
    sheetReserve: opts.sheetReserve,
  });
}

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

/** Wait until the target's viewport position stops changing (smooth scroll). */
export async function waitForRectSettle(
  el: HTMLElement,
  opts?: { timeoutMs?: number; epsilon?: number },
): Promise<Rect> {
  const timeoutMs = opts?.timeoutMs ?? 700;
  const epsilon = opts?.epsilon ?? 1.5;
  const start = performance.now();
  let prev = getTargetRect(el);

  while (performance.now() - start < timeoutMs) {
    await waitFrames(2);
    const next = getTargetRect(el);
    if (
      Math.abs(next.top - prev.top) < epsilon &&
      Math.abs(next.left - prev.left) < epsilon &&
      Math.abs(next.width - prev.width) < epsilon &&
      Math.abs(next.height - prev.height) < epsilon
    ) {
      return next;
    }
    prev = next;
  }
  return getTargetRect(el);
}

/**
 * Scroll so the target sits in the visible band above the mobile sheet / below header.
 * Then wait for settle and return a fresh viewport rect.
 */
export async function scrollTargetIntoSafeView(
  el: HTMLElement,
  opts?: {
    mode?: ViewportMode;
    sheetReserve?: number;
    align?: "start" | "center" | "upper";
  },
): Promise<Rect> {
  const mode = opts?.mode ?? getViewportMode();
  const safe = getSafeInsets(mode);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { height: vh } = getViewportSize();
  const sheetReserve =
    opts?.sheetReserve ??
    (mode === "mobile" || mode === "tablet"
      ? getMobileSheetMaxHeight(vh) + safe.bottom
      : safe.bottom + 24);

  const availableTop = safe.top;
  const availableBottom = vh - sheetReserve;
  const availableH = Math.max(120, availableBottom - availableTop);

  const align = opts?.align ?? (mode === "mobile" ? "upper" : "center");
  const fraction = align === "start" ? 0.12 : align === "upper" ? 0.28 : 0.45;

  const rect = getTargetRect(el);

  // Fixed / sticky chrome targets: do not scroll the page away — measure in place.
  const style = window.getComputedStyle(el);
  const parentFixed = (() => {
    let node: HTMLElement | null = el;
    while (node && node !== document.body) {
      const pos = window.getComputedStyle(node).position;
      if (pos === "fixed") return true;
      node = node.parentElement;
    }
    return false;
  })();
  const isFixedChrome =
    style.position === "fixed" ||
    parentFixed ||
    (rect.height <= SMALL_TARGET_MAX &&
      rect.top >= 0 &&
      rect.top < safe.top + 24);

  if (isFixedChrome) {
    await waitFrames(2);
    return getTargetRect(el);
  }

  const desiredTop = availableTop + availableH * fraction;
  const delta = rect.top - desiredTop;

  if (Math.abs(delta) > 8) {
    const prevOverflow = document.body.style.overflow;
    // Allow programmatic scroll even if tour temporarily locks body
    document.body.style.overflow = "";
    window.scrollBy({
      top: delta,
      behavior: reduce ? "auto" : "smooth",
    });
    const settled = await waitForRectSettle(el, {
      timeoutMs: reduce ? 120 : 650,
    });
    if (prevOverflow) document.body.style.overflow = prevOverflow;
    return settled;
  }

  await waitFrames(2);
  return getTargetRect(el);
}

function overlaps(a: Rect, b: Rect, pad = 8): boolean {
  return !(
    a.left + a.width + pad <= b.left ||
    b.left + b.width + pad <= a.left ||
    a.top + a.height + pad <= b.top ||
    b.top + b.height + pad <= a.top
  );
}

function scorePlacement(
  candidate: Rect,
  target: Rect,
  safe: SafeInsets,
  vw: number,
  vh: number,
): number {
  let score = 100;
  if (candidate.top < safe.top) score -= 80;
  if (candidate.left < safe.left) score -= 80;
  if (candidate.top + candidate.height > vh - safe.bottom) score -= 80;
  if (candidate.left + candidate.width > vw - safe.right) score -= 80;
  if (overlaps(candidate, target, 6)) score -= 120;

  const cx = candidate.left + candidate.width / 2;
  const cy = candidate.top + candidate.height / 2;
  const tx = target.left + target.width / 2;
  const ty = target.top + target.height / 2;
  score -= Math.hypot(cx - tx, cy - ty) / 40;

  return score;
}

/**
 * Pick the best floating tooltip position that stays in-viewport and off the target.
 * Consumes the SAME targetRect as the spotlight (viewport coords).
 */
export function getBestTooltipPosition(args: {
  targetRect: Rect;
  tooltipSize: { width: number; height: number };
  prefer?: PlacementSide | "auto";
  safe?: SafeInsets;
}): TooltipLayout {
  const { width: vw, height: vh } = getViewportSize();
  const safe = args.safe ?? getSafeInsets();
  const width = Math.min(
    Math.max(args.tooltipSize.width, DESKTOP_CARD_MIN_W),
    DESKTOP_CARD_MAX_W,
    vw - safe.left - safe.right,
  );
  const height = Math.max(160, args.tooltipSize.height);
  const t = args.targetRect;

  const candidates: { side: PlacementSide; top: number; left: number }[] = [
    {
      side: "bottom",
      top: t.top + t.height + GAP,
      left: t.left + t.width / 2 - width / 2,
    },
    {
      side: "top",
      top: t.top - GAP - height,
      left: t.left + t.width / 2 - width / 2,
    },
    {
      side: "right",
      top: t.top + t.height / 2 - height / 2,
      left: t.left + t.width + GAP,
    },
    {
      side: "left",
      top: t.top + t.height / 2 - height / 2,
      left: t.left - GAP - width,
    },
  ];

  const prefer = args.prefer && args.prefer !== "auto" ? args.prefer : null;
  const smallTarget = t.height < 72 || t.width < 140;

  if (!prefer && smallTarget) {
    candidates.sort((a, b) => {
      const aSide = a.side === "right" || a.side === "left" ? 0 : 1;
      const bSide = b.side === "right" || b.side === "left" ? 0 : 1;
      return aSide - bSide;
    });
  } else if (prefer && prefer !== "center") {
    candidates.sort((a, b) => (a.side === prefer ? -1 : b.side === prefer ? 1 : 0));
  }

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const clamped = {
      top: Math.min(Math.max(c.top, safe.top), vh - safe.bottom - height),
      left: Math.min(Math.max(c.left, safe.left), vw - safe.right - width),
      width,
      height,
      right: 0,
      bottom: 0,
    };
    clamped.right = clamped.left + clamped.width;
    clamped.bottom = clamped.top + clamped.height;
    let score = scorePlacement(clamped, t, safe, vw, vh);
    if (prefer && c.side === prefer) score += 25;
    if (smallTarget && (c.side === "right" || c.side === "left")) score += 18;
    if (score > bestScore) {
      bestScore = score;
      best = { side: c.side, top: clamped.top, left: clamped.left };
    }
  }

  return {
    top: best.top,
    left: best.left,
    width,
    side: best.side,
    mode: "floating",
  };
}

export function getCenterTooltipLayout(tooltipWidth = 420): TooltipLayout {
  const { width: vw, height: vh } = getViewportSize();
  const safe = getSafeInsets();
  const width = Math.min(tooltipWidth, vw - safe.left - safe.right, DESKTOP_CARD_MAX_W);
  const height = 280;
  return {
    top: Math.max(safe.top, (vh - height) / 2),
    left: Math.max(safe.left, (vw - width) / 2),
    width,
    side: "center",
    mode: "center",
  };
}

export function getMobileSheetLayout(): TooltipLayout {
  const { width: vw } = getViewportSize();
  const safe = getSafeInsets("mobile");
  const width = Math.min(vw - 24, vw - safe.left - safe.right);
  return {
    top: 0,
    left: Math.max(12, (vw - width) / 2),
    width,
    side: "bottom",
    mode: "sheet",
  };
}

export { DESKTOP_CARD_W, GAP, MOBILE_SHEET_MAX_VH };
