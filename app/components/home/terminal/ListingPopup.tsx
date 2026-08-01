"use client";

import Link from "next/link";
import { MessageSquare, ShieldCheck, X } from "lucide-react";
import type { MapPointFeature } from "@/lib/home/terminalTypes";
import { scoreBandColor } from "@/lib/home/areaListingMarkers";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { IQ_GREEN } from "../theme";

export default function ListingPopup({
  listing,
  onClose,
}: {
  listing: MapPointFeature;
  onClose: () => void;
}) {
  const scoreColor = scoreBandColor(listing.score);
  const price =
    listing.price != null && listing.price > 0
      ? formatInrAmount(listing.price)
      : "—";
  const bhk = listing.bhk != null && listing.bhk > 0 ? `${listing.bhk} BHK` : "—";
  const area =
    listing.areaSize != null && listing.areaSize > 0
      ? `${Math.round(listing.areaSize).toLocaleString("en-IN")} ${listing.areaUnit ?? "sqft"}`
      : "—";
  const legal =
    listing.legalPercent != null && listing.legalPercent >= 0
      ? `${listing.legalPercent}%`
      : "—";

  return (
    <div className="absolute bottom-5 left-1/2 z-[5] w-[min(100%-1.5rem,340px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:left-auto sm:right-4 sm:translate-x-0">
      <div className="relative h-36 w-full bg-[#EEF2EE]">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- live listing CDN URLs vary by host
          <img
            src={listing.imageUrl}
            alt={listing.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-semibold text-muted">
            AreaIQ Listing
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-heading-primary shadow"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {listing.isBestMatch ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#326F1A] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Best Match
          </span>
        ) : null}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-heading-primary">
              {listing.name}
            </h4>
            <p className="mt-0.5 truncate text-xs text-muted">
              {listing.builderName || "Builder collecting"}
            </p>
          </div>
          {listing.verified ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F3FAEF] px-2 py-1 text-[10px] font-bold text-[#326F1A]">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Verified
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#F7F9FB] px-2 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted">
              Price
            </p>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-heading-primary">
              {price}
            </p>
          </div>
          <div className="rounded-xl bg-[#F7F9FB] px-2 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted">
              BHK
            </p>
            <p className="mt-0.5 text-xs font-bold text-heading-primary">{bhk}</p>
          </div>
          <div className="rounded-xl bg-[#F7F9FB] px-2 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted">
              Area
            </p>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-heading-primary">
              {area}
            </p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-xl px-2 py-2" style={{ backgroundColor: `${scoreColor}18` }}>
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted">
              AreaIQ
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color: scoreColor }}>
              {listing.score ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-[#F7F9FB] px-2 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted">
              Legal %
            </p>
            <p className="text-lg font-bold tabular-nums text-heading-primary">
              {legal}
            </p>
          </div>
          <div className="rounded-xl bg-[#F7F9FB] px-2 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted">
              Builder
            </p>
            <p className="text-lg font-bold tabular-nums text-heading-primary">
              {listing.builderRating != null && listing.builderRating >= 0
                ? listing.builderRating
                : "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={listing.bookVisitHref || listing.href}
            className="inline-flex min-h-10 items-center justify-center rounded-xl text-xs font-bold text-white no-underline"
            style={{ backgroundColor: IQ_GREEN }}
          >
            Book Visit
          </Link>
          <Link
            href={listing.askHref || `/ask?q=${encodeURIComponent(listing.name)}`}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-label no-underline hover:bg-neutral-50"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            Ask AreaIQ
          </Link>
        </div>
        <Link
          href={listing.href}
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-emerald-200 bg-[#F3FAEF] text-xs font-bold text-[#326F1A] no-underline hover:bg-[#E8F5E1]"
        >
          View Property
        </Link>
      </div>
    </div>
  );
}
