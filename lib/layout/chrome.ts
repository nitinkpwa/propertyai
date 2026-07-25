import type { ChromeMode, ChromeSlot } from "./types";

/** Canonical chrome heights (px). Safe-area is added separately via CSS. */
export const CHROME = {
  navbar: 64,
  bottomnav: 64,
  notification: 44,
  /** Default property mobile action bar (price strip + actions); live height registered via ResizeObserver */
  actionbar: 120,
  sticky: 0,
} as const;

export const CSS_VARS = {
  safeTop: "--safe-top",
  safeRight: "--safe-right",
  safeBottom: "--safe-bottom",
  safeLeft: "--safe-left",
  navbarHeight: "--navbar-height",
  bottomnavHeight: "--bottomnav-height",
  notificationHeight: "--notification-height",
  stickyHeight: "--sticky-height",
  actionbarHeight: "--actionbar-height",
  keyboardHeight: "--keyboard-height",
  chromeTop: "--chrome-top",
  chromeBottom: "--chrome-bottom",
  /** Legacy aliases kept in sync for gradual migration */
  topbarH: "--topbar-h",
  bottomnavH: "--bottomnav-h",
  smartBarH: "--smart-bar-h",
} as const;

const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/connect/login",
] as const;

const PORTAL_PREFIXES = [
  "/admin",
  "/seller",
  "/buyer",
  "/connect/dashboard",
] as const;

export function resolveChromeMode(pathname: string): ChromeMode {
  if (!pathname) return "public";
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "auth";
  }
  if (pathname.startsWith("/property/")) return "property";
  if (pathname.startsWith("/ask")) return "ask";
  if (PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "portal";
  }
  return "public";
}

/** Whether MainContent should reserve bottom chrome padding */
export function modeNeedsBottomPad(mode: ChromeMode): boolean {
  return mode === "public";
}

/** Whether MainContent should reserve top chrome padding (pages that don't self-pad) */
export function modeNeedsTopPad(mode: ChromeMode): boolean {
  return false;
}

export function defaultSlotHeight(slot: ChromeSlot): number {
  switch (slot) {
    case "navbar":
      return CHROME.navbar;
    case "bottomnav":
      return CHROME.bottomnav;
    case "notification":
      return CHROME.notification;
    case "actionbar":
      return CHROME.actionbar;
    case "sticky":
      return CHROME.sticky;
    default:
      return 0;
  }
}

/**
 * Compute chrome-top / chrome-bottom from registered slot heights.
 * Bottom: max(bottomnav, actionbar) — mutually exclusive surfaces share the slot.
 */
export function computeChromeInsets(slots: Partial<Record<ChromeSlot, number>>): {
  top: number;
  bottom: number;
} {
  const navbar = slots.navbar ?? 0;
  const notification = slots.notification ?? 0;
  const sticky = slots.sticky ?? 0;
  const bottomnav = slots.bottomnav ?? 0;
  const actionbar = slots.actionbar ?? 0;

  return {
    top: navbar + notification + sticky,
    bottom: Math.max(bottomnav, actionbar),
  };
}

/** Utility class strings — components consume these instead of magic offsets */
export const layoutClass = {
  ptLayout: "pt-layout",
  pbLayout: "pb-layout",
  pbNav: "pb-nav",
  ptChrome: "pt-chrome",
  topChrome: "top-chrome",
  bottomChrome: "bottom-chrome",
  stickyBelowNav: "sticky-below-nav",
  insetChromeBottom: "inset-chrome-bottom",
  safeTop: "pt-safe",
  safeBottom: "pb-safe",
} as const;
