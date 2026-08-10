"use client";

import type { ReactNode } from "react";
import PropertyCardBrandMark from "@/components/property/PropertyCardBrandMark";

/**
 * Property image overlay chrome — keep the photo clean.
 *
 * TOP-LEFT     scores / status chips
 * TOP-RIGHT    AreaIQ logo (always clear, highest z)
 * BOTTOM-RIGHT documents / trust badge
 *
 * Builder name belongs in the card body, never on the image.
 */
export default function PropertyCardMediaChrome({
  topLeft,
  bottomRight,
  brandMarkSize = 26,
  className = "",
}: {
  topLeft?: ReactNode;
  bottomRight?: ReactNode;
  brandMarkSize?: number;
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* TOP-LEFT — scores / status (leave clearance for logo) */}
      {topLeft ? (
        <div className="pointer-events-auto absolute left-2 top-2 z-20 flex max-w-[min(68%,calc(100%-3.75rem))] flex-wrap gap-1 sm:left-3 sm:top-3 sm:gap-1.5">
          {topLeft}
        </div>
      ) : null}

      {/* TOP-RIGHT — AreaIQ logo only */}
      <div className="absolute right-2 top-2 z-30 sm:right-3 sm:top-3">
        <PropertyCardBrandMark size={brandMarkSize} />
      </div>

      {/* BOTTOM-RIGHT — documents / trust */}
      {bottomRight ? (
        <div className="pointer-events-auto absolute bottom-2 right-2 z-20 flex max-w-[min(46%,12rem)] justify-end sm:bottom-3 sm:right-3 sm:max-w-[min(48%,13.5rem)]">
          {bottomRight}
        </div>
      ) : null}
    </div>
  );
}
