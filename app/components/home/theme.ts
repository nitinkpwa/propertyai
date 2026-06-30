import type { CSSProperties } from "react";

/** AreaIQ homepage design tokens */
export const IQ_GREEN = "#16C784";
export const IQ_BG = "#FFFFFF";
export const IQ_BG_SECONDARY = "#F7F9FB";

/** Premium hero glass panel — Apple / Linear / Arc style */
export const HERO_GLASS_STYLE: CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "28px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
};

export const HERO_TEXT_SHADOW = "0 3px 12px rgba(0,0,0,0.35)";
