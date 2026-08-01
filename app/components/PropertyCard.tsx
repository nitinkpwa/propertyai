"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { BRAND_PRIMARY as EMERALD } from "@/lib/design/colors";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import {
  calculateLegalCompliance,
  type LegalComplianceResult,
  type LegalVerificationFlags,
} from "@/lib/properties/legalCompliance";
import { useComparedProperty } from "@/lib/buyer/useComparedProperty";
import BottomSheet from "@/components/ui/BottomSheet";
import Badge from "@/components/ui/Badge";
import Price from "@/components/ui/Price";
import Gallery from "@/components/ui/Gallery";
import LegalTrustBadge from "@/components/property/LegalTrustBadge";

export type BHKOption = 1 | 2 | 3 | 4 | 5;

export interface PropertyCardProps {
  id: string;
  name: string;
  location: string;
  city?: string;
  price: number;
  priceLabel?: string | null;
  rateLabel?: string | null;
  sizeLabel?: string | null;
  builderName: string;
  bhk: number;
  area: number;
  areaUnit?: "sqft" | "sqyd";
  growthScore: number | null;
  rentalYield: number | null;
  imageUrl?: string | null;
  /** Extra gallery urls for mobile swipe */
  imageUrls?: string[] | null;
  imageAlt?: string;
  aiVerified?: boolean;
  reraVerified?: boolean;
  /** Legal verification flags from DB / meta — used for Trust badge. */
  legalFlags?: Partial<LegalVerificationFlags> | null;
  /** Precomputed compliance (preferred). */
  legalCompliance?: LegalComplianceResult | null;
  /** Optional listing coordinates from DB (never invented). */
  lat?: number | null;
  lng?: number | null;
  featured?: boolean;
  isFavorite?: boolean;
  isCompared?: boolean;
  href?: string;
  onFavoriteToggle?: (id: string, favorited: boolean) => void;
  onCompareToggle?: (id: string, compared: boolean) => void;
  onViewDetails?: (id: string) => void;
}

function formatArea(area: number, unit: "sqft" | "sqyd"): string {
  const safe = typeof area === "number" && Number.isFinite(area) ? area : 0;
  return `${safe.toLocaleString("en-IN")} ${unit === "sqyd" ? "sq yd" : "sq ft"}`;
}

function growthTone(score: number | null): {
  bar: string;
  text: string;
  bg: string;
} {
  if (score === null) return { bar: "bg-neutral-300", text: "text-muted", bg: "bg-neutral-50" };
  if (score >= 75) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (score >= 50) return { bar: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" };
  return { bar: "bg-neutral-400", text: "text-body", bg: "bg-neutral-50" };
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.4L19 9.2l-5.2 1.8L12 16.4l-1.8-5.4L5 9.2l5.2-1.8L12 2z" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M16 3h5v5M4 21L20.5 4.5M21 16v5h-5M4 21l5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PropertyCard({
  id,
  name,
  location,
  city,
  price,
  priceLabel,
  rateLabel,
  sizeLabel,
  builderName,
  bhk,
  area,
  areaUnit = "sqft",
  growthScore,
  rentalYield,
  imageUrl,
  imageUrls,
  imageAlt,
  aiVerified = false,
  reraVerified: _reraVerified = false,
  legalFlags = null,
  legalCompliance: legalComplianceProp = null,
  featured = false,
  isFavorite: isFavoriteProp = false,
  isCompared: isComparedProp = false,
  href = `/property/${id}`,
  onFavoriteToggle,
  onCompareToggle,
  onViewDetails,
}: PropertyCardProps) {
  const legalCompliance =
    legalComplianceProp ?? calculateLegalCompliance(legalFlags ?? null);
  const isControlled = onFavoriteToggle !== undefined;
  const [internalFavorite, setInternalFavorite] = useState(isFavoriteProp);
  const isFavorite = isControlled ? isFavoriteProp : internalFavorite;
  const {
    compared: storeCompared,
    toggle: toggleCompare,
    busy: compareBusy,
  } = useComparedProperty(id);
  const isCompareControlled = onCompareToggle !== undefined;
  const isCompared = isCompareControlled ? isComparedProp : storeCompared;
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!isControlled) {
      setInternalFavorite(isFavoriteProp);
    }
  }, [isFavoriteProp, isControlled]);

  const locationLabel = city ? `${location}, ${city}` : location;
  const clampedScore =
    growthScore !== null ? Math.min(100, Math.max(0, growthScore)) : null;
  const growth = clampedScore !== null ? growthTone(clampedScore) : growthTone(0);
  const displayPrice = priceLabel || (price > 0 ? formatInrAmount(price) : "Price on Request");

  const galleryImages =
    imageUrls && imageUrls.length > 0
      ? imageUrls.map((src) => ({ src, alt: imageAlt ?? name }))
      : imageUrl
        ? [{ src: imageUrl, alt: imageAlt ?? name }]
        : [];

  const handleFavorite = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      const next = !isFavorite;
      if (isControlled) {
        onFavoriteToggle?.(id, next);
      } else {
        setInternalFavorite(next);
      }
    },
    [id, isFavorite, isControlled, onFavoriteToggle],
  );

  const handleCompare = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (compareBusy) return;

      if (isCompareControlled) {
        onCompareToggle?.(id, !isCompared);
        return;
      }

      await toggleCompare();
    },
    [id, isCompared, isCompareControlled, onCompareToggle, toggleCompare, compareBusy],
  );

  const handleViewDetails = useCallback(
    (e: React.MouseEvent) => {
      if (onViewDetails) {
        e.preventDefault();
        onViewDetails(id);
      }
    },
    [id, onViewDetails],
  );

  return (
    <>
      <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-200 active:scale-[0.99] lg:active:scale-100 lg:duration-300 lg:hover:-translate-y-0.5 lg:hover:border-neutral-300/80 lg:hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_20px_48px_rgba(0,0,0,0.08)]">
        {/* Mobile: 16:9 swipe gallery · Desktop: 4/3 single */}
        <div className="relative lg:hidden">
          {galleryImages.length > 0 ? (
            <Gallery images={galleryImages} aspect="16/9" />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-emerald-50/40 text-3xl">
              🏠
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
            <LegalTrustBadge compliance={legalCompliance} size="sm" className="pointer-events-auto" />
            {aiVerified ? <Badge variant="verified">Verified</Badge> : null}
            {featured ? <Badge variant="featured">Featured</Badge> : null}
          </div>
        </div>

        <div className="relative hidden aspect-[4/3] overflow-hidden bg-neutral-100 lg:block">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt ?? name}
              fill
              sizes="(max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-emerald-50/40">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm backdrop-blur-sm">
                🏠
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <div className="flex flex-wrap gap-1.5">
              <LegalTrustBadge compliance={legalCompliance} />
              {aiVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold tracking-wide text-heading-secondary shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md">
                  <span className="text-emerald-500">
                    <SparkIcon />
                  </span>
                  AreaIQ Intelligence
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleFavorite}
              aria-label={isFavorite ? "Remove from saved" : "Save property"}
              aria-pressed={isFavorite}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 ${
                isFavorite
                  ? "border-rose-200 text-rose-500"
                  : "border-transparent text-body hover:text-rose-500"
              }`}
            >
              <HeartIcon filled={isFavorite} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Mobile-first hierarchy: Price → Builder → Location → Config → Area */}
          <div className="mb-3 flex-1 lg:contents">
            <div className="lg:hidden">
              <Price value={displayPrice} size="xl" />
              {rateLabel && areaUnit === "sqyd" ? (
                <p className="mt-1 text-sm text-muted">{rateLabel}</p>
              ) : null}
              <p className="mt-2 text-sm font-medium text-label">by {builderName}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0" aria-hidden>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="line-clamp-1">{locationLabel}</span>
              </p>
              <h3 className="mt-2 line-clamp-2 text-base font-semibold text-heading-primary">{name}</h3>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-lg bg-neutral-100 px-2.5 py-1 font-semibold text-body">
                  {bhk > 0 ? `${bhk} BHK` : "—"}
                </span>
                <span className="rounded-lg bg-neutral-100 px-2.5 py-1 font-medium text-body">
                  {sizeLabel || (area > 0 ? formatArea(area, areaUnit) : "—")}
                </span>
                <span
                  className="rounded-lg px-2.5 py-1 font-semibold tabular-nums"
                  style={{
                    backgroundColor: legalCompliance.colors.background,
                    color: legalCompliance.colors.text,
                  }}
                >
                  {legalCompliance.compliancePercentage}% {legalCompliance.label}
                </span>
              </div>
            </div>

            <div className="mb-3 hidden flex-1 lg:block">
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-heading-primary sm:text-base">
                {name}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0" aria-hidden>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="line-clamp-1">{locationLabel}</span>
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted">
                by {builderName}
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight text-heading-primary sm:text-xl">
                    {displayPrice}
                  </p>
                  {rateLabel && areaUnit === "sqyd" ? (
                    <p className="mt-0.5 text-xs font-medium text-muted">{rateLabel}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-body">
                  {bhk > 0 ? `${bhk} BHK` : "—"}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted">
                {sizeLabel || (area > 0 ? formatArea(area, areaUnit) : "—")}
              </p>
              <p
                className="mt-2 text-xs font-semibold tabular-nums"
                style={{ color: legalCompliance.colors.text }}
              >
                {legalCompliance.compliancePercentage}% {legalCompliance.label}
              </p>
            </div>
          </div>

          {/* Intelligence metrics — desktop */}
          <div className="mb-4 hidden grid-cols-2 gap-2.5 lg:grid">
            <div className={`rounded-xl px-3 py-2.5 ${growthScore !== null ? growth.bg : "bg-neutral-50"}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-label">
                AreaIQ Growth
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-lg font-bold tabular-nums ${growthScore !== null ? growth.text : "text-muted"}`}>
                  {growthScore !== null ? clampedScore : "N/A"}
                </span>
                {growthScore !== null ? (
                  <span className="text-xs font-medium text-muted">/ 100</span>
                ) : null}
              </div>
              {growthScore !== null ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/70">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${growth.bar}`}
                    style={{ width: `${clampedScore}%` }}
                  />
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">Insufficient data</p>
              )}
            </div>

            <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-label">
                Rental Yield
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-heading-primary">
                {typeof rentalYield === "number"
                  ? `${rentalYield % 1 === 0 ? rentalYield.toFixed(0) : rentalYield.toFixed(1)}%`
                  : "N/A"}
              </p>
              <p className="mt-2 text-xs font-medium text-muted">
                {typeof rentalYield === "number" ? "AreaIQ calculated" : "Insufficient data"}
              </p>
            </div>
          </div>

          {/* Actions: mobile View + More · desktop Compare + View */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCompare}
              aria-pressed={isCompared}
              className={`hidden flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] lg:inline-flex ${
                isCompared
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-neutral-200 bg-white text-body hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <CompareIcon />
              {isCompared ? "Added" : "Compare"}
            </button>

            <Link
              href={href}
              onClick={handleViewDetails}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl px-3 text-base font-semibold text-white shadow-[0_2px_8px_rgba(74,170,39,0.3)] transition-all duration-200 active:scale-[0.98] lg:min-h-0 lg:py-2.5 lg:text-sm lg:hover:brightness-105"
              style={{ backgroundColor: EMERALD }}
            >
              View
            </Link>

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="inline-flex min-h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-body lg:hidden"
              aria-label="More actions"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="5" cy="12" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="19" cy="12" r="1.75" />
              </svg>
            </button>
          </div>
        </div>
      </article>

      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Property actions"
        ariaLabel="Property actions"
      >
        <div className="space-y-1 pb-2">
          <button
            type="button"
            onClick={() => {
              handleFavorite();
              setMoreOpen(false);
            }}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-heading-primary active:bg-neutral-50"
          >
            <HeartIcon filled={isFavorite} />
            {isFavorite ? "Remove from saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              handleCompare();
              setMoreOpen(false);
            }}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-heading-primary active:bg-neutral-50"
          >
            <CompareIcon />
            {isCompared ? "Remove from compare" : "Compare"}
          </button>
          <Link
            href={href}
            onClick={() => setMoreOpen(false)}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-base font-medium text-brand-dark"
          >
            View full details
          </Link>
        </div>
      </BottomSheet>
    </>
  );
}
