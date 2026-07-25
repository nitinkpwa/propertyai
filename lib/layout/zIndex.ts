import type { OverlayLayer } from "./types";

/**
 * Named overlay / chrome z-index hierarchy.
 * Components must use these values or `.z-layout-*` classes — never raw z-[N].
 */
export const Z_INDEX = {
  base: 0,
  sticky: 20,
  nav: 40,
  dropdown: 50,
  sheet: 60,
  drawer: 65,
  modal: 70,
  lightbox: 100,
  toast: 110,
  system: 200,
} as const satisfies Record<OverlayLayer, number>;

export type ZIndexLayer = keyof typeof Z_INDEX;

/** Tailwind-compatible class names bound to CSS vars in globals.css */
export const zClass: Record<Exclude<OverlayLayer, "base">, string> = {
  sticky: "z-layout-sticky",
  nav: "z-layout-nav",
  dropdown: "z-layout-dropdown",
  sheet: "z-layout-sheet",
  drawer: "z-layout-drawer",
  modal: "z-layout-modal",
  lightbox: "z-layout-lightbox",
  toast: "z-layout-toast",
  system: "z-layout-system",
};

export function zStyle(layer: OverlayLayer): { zIndex: number } {
  return { zIndex: Z_INDEX[layer] };
}
