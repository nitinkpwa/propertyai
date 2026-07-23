"use client";

import Image from "next/image";
import Link from "next/link";
import { useSavedPropertyToggle } from "@/lib/buyer/useSavedProperty";
import { useComparedPropertyToggle } from "@/lib/buyer/useComparedProperty";
import type { ListingProperty } from "@/lib/properties/types";

import { BRAND_PRIMARY as EMERALD } from "@/lib/design/colors";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

function ScorePill({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const tone =
    value >= 75 ? "bg-emerald-50 text-emerald-700" : value >= 50 ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-body";
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${tone}`}>
      {label} {Math.round(value)}
    </span>
  );
}

interface AskPropertyCarouselProps {
  listings: ListingProperty[];
  rationales?: Record<string, string>;
  onAskAbout?: (name: string) => void;
  /** When true, omits the built-in "Live properties" label (chat uses its own section header). */
  hideHeader?: boolean;
}

export function AskPropertyCarousel({
  listings,
  rationales = {},
  onAskAbout,
  hideHeader = false,
}: AskPropertyCarouselProps) {
  const { isSaved, handleFavoriteToggle } = useSavedPropertyToggle();
  const { isCompared, handleCompareToggle } = useComparedPropertyToggle();

  if (listings.length === 0) return null;

  return (
    <div className={hideHeader ? undefined : "space-y-3"}>
      {hideHeader ? null : (
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-label">
            Live properties · {listings.length}
          </p>
        </div>
      )}
      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-1 pb-2 touch-pan-x scroll-smooth scrollbar-thin">
        {listings.map((p) => {
          const href = p.href ?? `/property/${p.id}`;
          const saved = isSaved(p.id);
          return (
            <article
              key={p.id}
              className="group w-[min(300px,82vw)] shrink-0 snap-start overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]"
            >
              <Link href={href} className="relative block aspect-[16/10] bg-neutral-100">
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.imageAlt ?? p.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="300px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-600/80 to-teal-500/60 text-4xl">
                    🏠
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                  <p className="text-sm font-bold text-white line-clamp-1">
                    {p.priceLabel || (p.price > 0 ? formatInrAmount(p.price) : "Price on Request")}
                  </p>
                  {/* Unit rate only for plots on cards; flats show total only */}
                  {p.rateLabel && p.areaUnit === "sqyd" ? (
                    <p className="text-[10px] text-white/80">{p.rateLabel}</p>
                  ) : null}
                </div>
              </Link>

              <div className="space-y-2.5 p-3">
                <div>
                  <Link
                    href={href}
                    className="line-clamp-1 text-sm font-bold text-heading-primary hover:text-emerald-700"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">
                    {p.location}
                    {p.city ? `, ${p.city}` : ""} · {p.builderName}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  <ScorePill label="AreaIQ" value={p.growthScore} />
                  <ScorePill
                    label="Invest"
                    value={
                      p.growthScore !== null && p.rentalYield !== null
                        ? Math.round((p.growthScore + Math.min(100, p.rentalYield * 12)) / 2)
                        : p.growthScore
                    }
                  />
                  <ScorePill
                    label="Rent"
                    value={p.rentalYield !== null ? Math.min(100, Math.round(p.rentalYield * 12)) : null}
                  />
                </div>

                {rationales[p.id] ? (
                  <p className="line-clamp-2 rounded-lg bg-emerald-50/70 px-2 py-1.5 text-[10px] leading-snug text-emerald-900">
                    {rationales[p.id]}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-1.5">
                  <Link
                    href={href}
                    className="rounded-lg py-1.5 text-center text-[11px] font-semibold text-white"
                    style={{ backgroundColor: EMERALD }}
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => onAskAbout?.(`Tell me more about ${p.name}`)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-[11px] font-semibold text-emerald-800"
                  >
                    Ask AreaIQ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFavoriteToggle(p.id, !saved)}
                    className="rounded-lg border border-neutral-200 py-1.5 text-[11px] font-semibold text-body"
                  >
                    {saved ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isCompared(p.id);
                      void handleCompareToggle(p.id, next);
                    }}
                    className={`rounded-lg border py-1.5 text-[11px] font-semibold ${
                      isCompared(p.id)
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-neutral-200 text-body"
                    }`}
                  >
                    {isCompared(p.id) ? "Added" : "Compare"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
