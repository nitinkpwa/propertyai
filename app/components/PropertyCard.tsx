"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const EMERALD = "#22C55E";

export type BHKOption = 1 | 2 | 3 | 4 | 5;

export interface PropertyCardProps {
  id: string;
  name: string;
  location: string;
  city?: string;
  price: number;
  builderName: string;
  bhk: number;
  area: number;
  areaUnit?: "sqft" | "sqyd";
  growthScore: number | null;
  rentalYield: number | null;
  imageUrl?: string | null;
  imageAlt?: string;
  aiVerified?: boolean;
  reraVerified?: boolean;
  isFavorite?: boolean;
  isCompared?: boolean;
  href?: string;
  onFavoriteToggle?: (id: string, favorited: boolean) => void;
  onCompareToggle?: (id: string, compared: boolean) => void;
  onViewDetails?: (id: string) => void;
}

function formatPrice(price: number): string {
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  if (price >= 100_000) {
    const lakhs = price / 100_000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2).replace(/\.?0+$/, "")} L`;
  }
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatArea(area: number, unit: "sqft" | "sqyd"): string {
  return `${area.toLocaleString("en-IN")} ${unit === "sqyd" ? "sq yd" : "sq ft"}`;
}

function growthTone(score: number | null): {
  bar: string;
  text: string;
  bg: string;
} {
  if (score === null) return { bar: "bg-neutral-300", text: "text-neutral-400", bg: "bg-neutral-50" };
  if (score >= 75) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (score >= 50) return { bar: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" };
  return { bar: "bg-neutral-400", text: "text-neutral-600", bg: "bg-neutral-50" };
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

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
  builderName,
  bhk,
  area,
  areaUnit = "sqft",
  growthScore,
  rentalYield,
  imageUrl,
  imageAlt,
  aiVerified = false,
  reraVerified = false,
  isFavorite: isFavoriteProp = false,
  isCompared: isComparedProp = false,
  href = `/property/${id}`,
  onFavoriteToggle,
  onCompareToggle,
  onViewDetails,
}: PropertyCardProps) {
  const isControlled = onFavoriteToggle !== undefined;
  const [internalFavorite, setInternalFavorite] = useState(isFavoriteProp);
  const isFavorite = isControlled ? isFavoriteProp : internalFavorite;
  const [isCompared, setIsCompared] = useState(isComparedProp);

  useEffect(() => {
    if (!isControlled) {
      setInternalFavorite(isFavoriteProp);
    }
  }, [isFavoriteProp, isControlled]);

  const locationLabel = city ? `${location}, ${city}` : location;
  const clampedScore =
    growthScore !== null ? Math.min(100, Math.max(0, growthScore)) : null;
  const growth = clampedScore !== null ? growthTone(clampedScore) : growthTone(0);

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
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
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const next = !isCompared;
      setIsCompared(next);
      onCompareToggle?.(id, next);
    },
    [id, isCompared, onCompareToggle],
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
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neutral-300/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_20px_48px_rgba(0,0,0,0.08)]">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? name}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-emerald-50/40">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm backdrop-blur-sm">
              🏠
            </div>
          </div>
        )}

        {/* Badges + heart */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            {aiVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md">
                <span className="text-emerald-500">
                  <SparkIcon />
                </span>
                AI Verified
              </span>
            )}
            {reraVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md">
                <span className="text-blue-600">
                  <ShieldIcon />
                </span>
                RERA
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
                : "border-transparent text-neutral-600 hover:text-rose-500"
            }`}
          >
            <HeartIcon filled={isFavorite} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex-1">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-neutral-900 sm:text-base">
            {name}
          </h3>

          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="line-clamp-1">{locationLabel}</span>
          </p>

          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
            by {builderName}
          </p>

          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
              {formatPrice(price)}
            </p>
            <span className="shrink-0 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
              {bhk > 0 ? `${bhk} BHK` : "—"}
            </span>
          </div>

          <p className="mt-1.5 text-sm text-neutral-500">{formatArea(area, areaUnit)}</p>
        </div>

        {/* Intelligence metrics */}
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <div className={`rounded-xl px-3 py-2.5 ${growthScore !== null ? growth.bg : "bg-neutral-50"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              AreaIQ Growth
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-lg font-bold tabular-nums ${growthScore !== null ? growth.text : "text-neutral-400"}`}>
                {growthScore !== null ? clampedScore : "N/A"}
              </span>
              {growthScore !== null ? (
                <span className="text-xs font-medium text-neutral-400">/ 100</span>
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
              <p className="mt-2 text-[10px] text-neutral-400">Insufficient data</p>
            )}
          </div>

          <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Rental Yield
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900">
              {rentalYield !== null
                ? `${rentalYield % 1 === 0 ? rentalYield.toFixed(0) : rentalYield.toFixed(1)}%`
                : "N/A"}
            </p>
            <p className="mt-2 text-[11px] font-medium text-neutral-400">
              {rentalYield !== null ? "AreaIQ calculated" : "Insufficient data"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCompare}
            aria-pressed={isCompared}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
              isCompared
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            <CompareIcon />
            {isCompared ? "Added" : "Compare"}
          </button>

          <Link
            href={href}
            onClick={handleViewDetails}
            className="inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)] transition-all duration-200 hover:shadow-[0_4px_14px_rgba(34,197,94,0.4)] hover:brightness-105 active:scale-[0.98]"
            style={{ backgroundColor: EMERALD }}
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
