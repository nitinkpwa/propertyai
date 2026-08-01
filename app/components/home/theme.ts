import type { CSSProperties } from "react";
import {
  TEXT_SHADOW_BRAND,
  TEXT_SHADOW_ON_PHOTO,
  TEXT_SHADOW_PREMIUM,
} from "@/lib/design/text";

/** AreaIQ homepage design tokens — Bloomberg terminal surface */
export { BRAND_PRIMARY as IQ_GREEN } from "@/lib/design/colors";
export const IQ_BG = "#FFFFFF";
export const IQ_BG_SECONDARY = "#F7F9FB";
export const IQ_TERMINAL_BORDER = "border-neutral-200/80";
export const IQ_TERMINAL_SHADOW =
  "shadow-[0_2px_12px_rgba(0,0,0,0.03)]";

/** Premium glass card — light sections */
export const GLASS_CARD_CLASS =
  "rounded-2xl border border-neutral-200/80 bg-white/80 text-body shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]";

/** Premium hero glass panel — Apple / Linear / Arc style */
export const HERO_GLASS_STYLE: CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "28px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
};

/** Floating map chrome — translucent white over live map */
export const MAP_GLASS_STYLE: CSSProperties = {
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 28px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.03)",
};

/** Dark frosted glass for map chrome on imagery */
export const MAP_GLASS_DARK_STYLE: CSSProperties = {
  background: "rgba(18,22,20,0.48)",
  backdropFilter: "blur(22px) saturate(1.2)",
  WebkitBackdropFilter: "blur(22px) saturate(1.2)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.08) inset, 0 16px 48px rgba(0,0,0,0.28)",
};

export const MAP_RADIUS = {
  panel: "28px",
  card: "24px",
  property: "24px",
  button: "16px",
  map: "26px",
  pill: "999px",
} as const;

/** Soft white lift + ambient — white/light hero typography */
export const HERO_TEXT_SHADOW = TEXT_SHADOW_PREMIUM;

/** Brand green over hero media — illuminated, never black */
export const HERO_GREEN_TEXT_SHADOW = TEXT_SHADOW_BRAND;

/** Muted labels / secondary copy on hero media */
export const HERO_TEXT_SHADOW_SOFT = TEXT_SHADOW_ON_PHOTO;
