import type { CSSProperties } from "react";
import {
  TEXT_SHADOW_BRAND,
  TEXT_SHADOW_ON_PHOTO,
  TEXT_SHADOW_PREMIUM,
} from "@/lib/design/text";

/** AreaIQ homepage design tokens */
export { BRAND_PRIMARY as IQ_GREEN } from "@/lib/design/colors";
export const IQ_BG = "#FFFFFF";
export const IQ_BG_SECONDARY = "#F7F9FB";

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

/** Soft white lift + ambient — white/light hero typography */
export const HERO_TEXT_SHADOW = TEXT_SHADOW_PREMIUM;

/** Brand green over hero media — illuminated, never black */
export const HERO_GREEN_TEXT_SHADOW = TEXT_SHADOW_BRAND;

/** Muted labels / secondary copy on hero media */
export const HERO_TEXT_SHADOW_SOFT = TEXT_SHADOW_ON_PHOTO;
