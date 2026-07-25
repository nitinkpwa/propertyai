/** Mobile Layout Engine — shared types */

export type ChromeMode =
  | "public"
  | "portal"
  | "property"
  | "ask"
  | "auth"
  | "none";

export type ChromeSlot =
  | "navbar"
  | "bottomnav"
  | "notification"
  | "sticky"
  | "actionbar";

export type OverlayLayer =
  | "base"
  | "sticky"
  | "nav"
  | "dropdown"
  | "sheet"
  | "drawer"
  | "modal"
  | "lightbox"
  | "toast"
  | "system";

export type BreakpointName = "xs" | "sm" | "md" | "lg" | "xl";

export type Orientation = "portrait" | "landscape";

export interface ViewportState {
  width: number;
  height: number;
  orientation: Orientation;
  breakpoint: BreakpointName;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChromeRegistration {
  id: string;
  slot: ChromeSlot;
  height: number;
}
