"use client";

import Image from "next/image";
import { BRAND } from "@/lib/brand";

/** Compact AreaIQ mark for property-card media overlays. */
export default function PropertyCardBrandMark({
  className = "",
  size = 28,
}: {
  className?: string;
  /** Icon box size in px (default 28). */
  size?: number;
}) {
  return (
    <span
      className={`pointer-events-none inline-flex shrink-0 items-center justify-center rounded-lg border border-white/70 bg-white/95 p-1 shadow-[0_2px_10px_rgba(0,0,0,0.14)] backdrop-blur-md ${className}`}
      style={{ width: size + 8, height: size + 8 }}
      aria-label={BRAND.alt.logo}
      role="img"
    >
      <Image
        src={BRAND.assets.logo}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        aria-hidden
      />
    </span>
  );
}
