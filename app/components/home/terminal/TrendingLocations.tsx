"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import PropertyCardBrandMark from "@/components/property/PropertyCardBrandMark";
import type { TrendingLocationCard } from "@/lib/home/terminalTypes";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { IQ_GREEN } from "../theme";
import { SkeletonBlock } from "./primitives";
import { useTerminalData } from "./useTerminalData";

/** Equal card geometry — desktop shows exactly 3 at ~20–24px gaps */
const CARD_GAP = "gap-5 lg:gap-6";
const CARD_WIDTH =
  "w-[min(320px,88vw)] sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)]";
const CARD_HEIGHT = "h-[340px] sm:h-[330px] lg:h-[348px]";

function MetricCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/55 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 truncate text-[17px] font-bold leading-none tracking-tight tabular-nums text-white sm:text-[18px] lg:text-[19px]">
        {value}
      </p>
    </div>
  );
}

function HotLocationsHeader() {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4AAA27]">
          Trending
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-heading-primary sm:text-3xl">
          Hot locations
        </h2>
      </div>
      <Link
        href="/properties"
        className="mb-0.5 shrink-0 text-sm font-semibold text-[#4AAA27] no-underline transition-colors duration-200 hover:text-emerald-700"
      >
        Explore all →
      </Link>
    </div>
  );
}

function HotLocationCard({ card }: { card: TrendingLocationCard }) {
  return (
    <div className={`${CARD_WIDTH} ${CARD_HEIGHT} shrink-0 snap-start`}>
      <Link
        href={card.href}
        className="group relative block h-full overflow-hidden rounded-[22px] border border-neutral-200/70 bg-neutral-900 no-underline shadow-[0_10px_28px_rgba(15,23,42,0.08)] outline-none transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.14)] focus-visible:ring-2 focus-visible:ring-[#4AAA27]/70 focus-visible:ring-offset-2"
      >
        {/* ZONE 1 — Bright property image */}
        <div className="absolute inset-0 overflow-hidden">
          {card.imageUrl ? (
            <Image
              src={card.imageUrl}
              alt={card.name}
              fill
              sizes="(max-width: 640px) 88vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-600 to-emerald-800" />
          )}

          {/* Subtle fade only in lower ~40% — keep image bright */}
          <div
            className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/40 via-black/10 to-transparent"
            aria-hidden
          />
        </div>

        {/* AreaIQ mark — top-right, above everything, clear of content */}
        <div className="pointer-events-none absolute right-3 top-3 z-40">
          <PropertyCardBrandMark
            size={20}
            className="!rounded-full !border-white !bg-white shadow-[0_2px_12px_rgba(0,0,0,0.18)]"
          />
        </div>

        {/* ZONE 2 + 3 — Title then floating intelligence panel */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2.5 p-3 sm:gap-3 sm:p-3.5">
          {/* ZONE 2 — Location identity with local readability scrim */}
          <div
            className="flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.12) 70%, transparent 100%)",
            }}
          >
            <MapPin
              className="h-4 w-4 shrink-0 text-white"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))" }}
              aria-hidden
            />
            <h3
              className="truncate text-[20px] font-bold leading-tight tracking-tight text-white sm:text-[21px] lg:text-[22px]"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
            >
              {card.name}
            </h3>
          </div>

          {/* ZONE 3 — Glass intelligence panel */}
          <div
            className="rounded-[18px] border border-white/18 px-4 py-4 sm:px-[18px] sm:py-[17px]"
            style={{
              background:
                "linear-gradient(165deg, rgba(16,20,18,0.55) 0%, rgba(8,11,10,0.72) 100%)",
              backdropFilter: "blur(20px) saturate(1.25)",
              WebkitBackdropFilter: "blur(20px) saturate(1.25)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(74,170,39,0.1), 0 12px 32px rgba(0,0,0,0.22)",
            }}
          >
            <div className="grid grid-cols-2 gap-x-5 gap-y-0">
              <MetricCell label="Score" value={card.score ?? "—"} />
              <MetricCell
                label="Growth"
                value={
                  card.growth != null ? (
                    <span style={{ color: IQ_GREEN }}>{card.growth}</span>
                  ) : (
                    <span className="text-white/75">—</span>
                  )
                }
              />

              <div
                className="col-span-2 my-3.5 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"
                aria-hidden
              />

              <MetricCell
                label="Avg price"
                value={
                  card.averagePrice != null
                    ? formatInrAmount(card.averagePrice)
                    : "—"
                }
              />
              <MetricCell label="Verified" value={card.verifiedProjects} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function TrendingLocations() {
  const { loading, bundle } = useTerminalData();
  const cards = bundle?.trending ?? [];

  return (
    <div>
      <HotLocationsHeader />

      {loading && cards.length === 0 ? (
        <div className={`flex overflow-hidden ${CARD_GAP}`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              className={`${CARD_WIDTH} ${CARD_HEIGHT} shrink-0 rounded-[22px]`}
            />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-[#F7F9FB] px-4 py-10 text-center text-sm text-muted">
          No trending zones yet —{" "}
          <Link href="/ask" className="font-semibold text-[#4AAA27] no-underline">
            Ask AreaIQ
          </Link>
        </div>
      ) : (
        <div
          className={`-mx-4 flex overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:px-0 ${CARD_GAP}`}
          style={{ scrollbarWidth: "thin" }}
        >
          {cards.map((card: TrendingLocationCard) => (
            <HotLocationCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
