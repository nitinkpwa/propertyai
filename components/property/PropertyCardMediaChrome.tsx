"use client";

import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import PropertyCardBrandMark from "@/components/property/PropertyCardBrandMark";

/**
 * Four-zone property image overlay chrome.
 *
 * TOP-LEFT     scores / status chips
 * TOP-RIGHT    AreaIQ logo (always clear, highest z)
 * BOTTOM-LEFT  builder badge
 * BOTTOM-RIGHT documents / trust badge
 */
export default function PropertyCardMediaChrome({
  topLeft,
  builderName,
  bottomRight,
  brandMarkSize = 26,
  className = "",
}: {
  topLeft?: ReactNode;
  builderName?: string | null;
  bottomRight?: ReactNode;
  brandMarkSize?: number;
  className?: string;
}) {
  const builder = builderName?.trim() || "";

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

      {/* BOTTOM-LEFT — builder badge */}
      {builder ? (
        <div className="absolute bottom-2 left-2 z-20 max-w-[min(46%,11.5rem)] sm:bottom-3 sm:left-3 sm:max-w-[min(48%,13rem)]">
          <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm sm:gap-1.5 sm:px-2 sm:py-1 sm:text-[10px]">
            <Building2 className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" aria-hidden />
            <span className="truncate">{builder}</span>
          </span>
        </div>
      ) : null}

      {/* BOTTOM-RIGHT — documents / trust */}
      {bottomRight ? (
        <div className="pointer-events-auto absolute bottom-2 right-2 z-20 flex max-w-[min(46%,12rem)] justify-end sm:bottom-3 sm:right-3 sm:max-w-[min(48%,13.5rem)]">
          {bottomRight}
        </div>
      ) : null}
    </div>
  );
}
