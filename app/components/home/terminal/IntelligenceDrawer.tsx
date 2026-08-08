"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  GitCompareArrows,
  MessageSquare,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { MapPointFeature, TricityMapNode } from "@/lib/home/terminalTypes";
import { scoreBandColor } from "@/lib/home/areaListingMarkers";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import AnimatedCounter from "../AnimatedCounter";
import { IQ_GREEN } from "../theme";

function fmtBand(v: string): string {
  if (v === "unknown") return "—";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function MetricCard({
  label,
  value,
  trend,
  accent,
}: {
  label: string;
  value: ReactNode;
  trend?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[20px] px-1 py-3 transition-colors duration-200">
      <p className="text-[10px] font-normal uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </p>
      <p
        className="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums text-neutral-900"
        style={accent ? { color: IQ_GREEN } : undefined}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-normal text-neutral-400">
        {trend ?? "\u00a0"}
      </p>
    </div>
  );
}

function scoreStatus(score: number | null | undefined): string {
  if (score == null) return "Collecting";
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Fair";
  return "Developing";
}

export default function IntelligenceDrawer({
  node,
  listings = [],
  selectedListing = null,
  onSelectListing,
  variant = "panel",
}: {
  node: TricityMapNode | null;
  listings?: MapPointFeature[];
  selectedListing?: MapPointFeature | null;
  onSelectListing?: (propertyId: string | null) => void;
  /** floating = glass parent; panel = solid homepage card */
  variant?: "panel" | "floating";
}) {
  const floating = variant === "floating";

  if (!node) {
    return (
      <div
        className={`flex h-full min-h-[280px] items-center justify-center p-8 text-sm text-neutral-400 ${
          floating
            ? ""
            : "rounded-[24px] border border-neutral-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
        }`}
      >
        Select an area
      </div>
    );
  }

  const ranked = [...listings].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );

  return (
    <div
      className={`flex h-full flex-col overflow-hidden ${
        floating
          ? ""
          : "rounded-[24px] border border-neutral-200/60 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.07)]"
      }`}
    >
      {!floating ? (
        <div className="px-6 pb-2 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Intelligence
          </p>
          <AnimatePresence mode="wait">
            <motion.h3
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900"
            >
              {node.name}
            </motion.h3>
          </AnimatePresence>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1 sm:px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {selectedListing ? (
              <div className="rounded-[20px] bg-black/[0.03] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                      Selected
                    </p>
                    <p className="mt-1 truncate text-[15px] font-semibold text-neutral-900">
                      {selectedListing.name}
                    </p>
                    <p className="truncate text-[12px] text-neutral-400">
                      {selectedListing.builderName || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectListing?.(null)}
                    className="text-[11px] font-medium text-neutral-400 transition hover:text-neutral-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-xl font-semibold tabular-nums text-neutral-900">
                    {selectedListing.price != null
                      ? formatInrAmount(selectedListing.price)
                      : "—"}
                  </p>
                  <p
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: scoreBandColor(selectedListing.score) }}
                  >
                    {selectedListing.score ?? "—"}★
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href={selectedListing.bookVisitHref || selectedListing.href}
                    className="inline-flex min-h-10 items-center justify-center rounded-[14px] text-[12px] font-semibold text-white no-underline"
                    style={{ backgroundColor: IQ_GREEN }}
                  >
                    Book Visit
                  </Link>
                  <Link
                    href={selectedListing.href}
                    className="inline-flex min-h-10 items-center justify-center rounded-[14px] bg-black/[0.05] text-[12px] font-semibold text-neutral-700 no-underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            ) : null}

            {!node.hasIntelligence ? (
              <div className="rounded-[20px] bg-black/[0.03] px-5 py-10 text-center">
                <p className="text-sm font-semibold text-neutral-800">
                  Collecting intelligence
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-neutral-400">
                  This area stays on the map — metrics unlock from live inventory.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <MetricCard
                    label="AreaIQ Score"
                    accent
                    value={
                      node.avgAreaIqScore != null ? (
                        <AnimatedCounter value={Math.round(node.avgAreaIqScore)} />
                      ) : (
                        "—"
                      )
                    }
                    trend={scoreStatus(
                      node.avgAreaIqScore != null
                        ? Math.round(node.avgAreaIqScore)
                        : null,
                    )}
                  />
                  <MetricCard
                    label="Grade"
                    value={node.investmentGrade ?? "—"}
                    trend="Investment grade"
                  />
                  <MetricCard
                    label="Confidence"
                    accent
                    value={
                      node.marketConfidence != null
                        ? `${node.marketConfidence}%`
                        : "—"
                    }
                    trend={
                      node.marketConfidence != null && node.marketConfidence >= 70
                        ? "High"
                        : "Live market"
                    }
                  />
                  <MetricCard
                    label="Avg Price"
                    value={
                      node.averagePrice != null
                        ? formatInrAmount(node.averagePrice)
                        : "—"
                    }
                    trend={`${node.listingCount} listings`}
                  />
                  <MetricCard
                    label="Demand"
                    value={fmtBand(node.demand)}
                    trend={`Supply · ${fmtBand(node.supply)}`}
                  />
                  <MetricCard
                    label="Builders"
                    value={String(node.builderCount)}
                    trend={`${node.verifiedCount} verified`}
                  />
                </div>

                {node.topProject ? (
                  <div className="rounded-[20px] bg-black/[0.03] p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                      Best match
                    </p>
                    <Link
                      href={node.topProject.href}
                      className="mt-1.5 block text-[15px] font-semibold text-neutral-900 no-underline transition hover:opacity-70"
                    >
                      {node.topProject.name}
                    </Link>
                    <div className="mt-2 flex items-center justify-between text-[13px]">
                      <span
                        className="font-semibold tabular-nums"
                        style={{
                          color: scoreBandColor(node.topProject.score),
                        }}
                      >
                        {node.topProject.score ?? "—"}★
                      </span>
                      <span className="font-semibold tabular-nums text-neutral-900">
                        {node.topProject.price != null
                          ? formatInrAmount(node.topProject.price)
                          : "—"}
                      </span>
                    </div>
                  </div>
                ) : null}

                {ranked.length > 0 ? (
                  <div>
                    <p className="mb-2.5 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                      On map
                    </p>
                    <ul className="space-y-1">
                      {ranked.slice(0, 6).map((listing) => {
                        const on =
                          selectedListing?.propertyId === listing.propertyId;
                        return (
                          <li key={listing.id}>
                            <button
                              type="button"
                              onClick={() =>
                                onSelectListing?.(listing.propertyId ?? null)
                              }
                              className={`flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-2.5 text-left transition-all duration-200 ${
                                on
                                  ? "bg-[#4AAA27]/10"
                                  : "hover:bg-black/[0.03]"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold text-neutral-900">
                                  {listing.name}
                                </span>
                                <span className="block truncate text-[11px] text-neutral-400">
                                  {listing.builderName || "—"}
                                  {listing.price != null
                                    ? ` · ${formatInrAmount(listing.price)}`
                                    : ""}
                                </span>
                              </span>
                              <span
                                className="shrink-0 text-[13px] font-semibold tabular-nums"
                                style={{
                                  color: scoreBandColor(listing.score),
                                }}
                              >
                                {listing.score ?? "—"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-[20px] bg-black/[0.03] px-4 py-6 text-center">
                    <p className="text-[13px] font-semibold text-neutral-800">
                      No verified projects nearby
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Nearby verified inventory will appear here.
                    </p>
                  </div>
                )}

                {node.suggestedQuestions.length > 0 ? (
                  <div>
                    <p className="mb-2.5 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                      Ask next
                    </p>
                    <div className="flex flex-col gap-1">
                      {node.suggestedQuestions.slice(0, 3).map((q) => (
                        <Link
                          key={q.id}
                          href={q.href}
                          className="rounded-[16px] px-3 py-2.5 text-[13px] font-medium text-neutral-600 no-underline transition hover:bg-black/[0.03] hover:text-neutral-900"
                        >
                          {q.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 space-y-2 px-5 pb-5 pt-2">
        <Link
          href={node.href}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[16px] text-[13px] font-semibold text-white no-underline shadow-sm transition-transform duration-200 hover:scale-[1.01]"
          style={{ backgroundColor: IQ_GREEN }}
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Ask AreaIQ
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={node.listingsHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[16px] bg-black/[0.04] text-[12px] font-medium text-neutral-600 no-underline transition duration-200 hover:bg-black/[0.06]"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            Explore
          </Link>
          <Link
            href={node.compareHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[16px] bg-black/[0.04] text-[12px] font-medium text-neutral-600 no-underline transition duration-200 hover:bg-black/[0.06]"
          >
            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
            Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
