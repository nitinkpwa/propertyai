"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Building2,
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
import { BandDot, ProgressBar } from "./primitives";

function fmtBand(v: string): string {
  if (v === "unknown") return "Collecting Intelligence";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function MetricRow({
  label,
  value,
  accent,
  band,
}: {
  label: string;
  value: string;
  accent?: boolean;
  band?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 py-2.5 last:border-0">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {band ? <BandDot band={band} /> : null}
        {label}
      </span>
      <span
        className="text-sm font-bold tabular-nums text-heading-primary"
        style={accent ? { color: IQ_GREEN } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function Collecting() {
  return <span className="text-sm font-semibold text-muted">Collecting Intelligence</span>;
}

export default function IntelligenceDrawer({
  node,
  listings = [],
  selectedListing = null,
  onSelectListing,
}: {
  node: TricityMapNode | null;
  listings?: MapPointFeature[];
  selectedListing?: MapPointFeature | null;
  onSelectListing?: (propertyId: string | null) => void;
}) {
  if (!node) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-3xl border border-neutral-200/80 bg-white p-6 text-sm text-muted">
        Select an area
      </div>
    );
  }

  const ranked = [...listings].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <div className="border-b border-neutral-100 bg-gradient-to-br from-[#F3FAEF] via-white to-white px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4AAA27]">
          Live Intelligence
        </p>
        <AnimatePresence mode="wait">
          <motion.h3
            key={node.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="mt-1 text-2xl font-bold tracking-tight text-heading-primary"
          >
            {node.name}
          </motion.h3>
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {selectedListing ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-[#F3FAEF] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#326F1A]">
                      Selected Listing
                    </p>
                    <p className="mt-0.5 truncate text-sm font-bold text-heading-primary">
                      {selectedListing.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {selectedListing.builderName || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectListing?.(null)}
                    className="text-[10px] font-semibold text-muted hover:text-heading-primary"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-bold tabular-nums" style={{ color: scoreBandColor(selectedListing.score) }}>
                    Score {selectedListing.score ?? "—"}
                  </span>
                  <span className="font-semibold text-heading-primary">
                    {selectedListing.price != null
                      ? formatInrAmount(selectedListing.price)
                      : "—"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link
                    href={selectedListing.bookVisitHref || selectedListing.href}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg text-[11px] font-bold text-white no-underline"
                    style={{ backgroundColor: IQ_GREEN }}
                  >
                    Book Visit
                  </Link>
                  <Link
                    href={selectedListing.href}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-[11px] font-semibold text-label no-underline"
                  >
                    View Property
                  </Link>
                </div>
              </div>
            ) : null}

            {!node.hasIntelligence ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-[#F7F9FB] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-heading-primary">
                  Collecting Intelligence
                </p>
                <p className="mt-2 text-xs text-muted">
                  Area remains visible — metrics unlock from live inventory.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#F3FAEF] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      AreaIQ Score
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color: IQ_GREEN }}>
                      {node.avgAreaIqScore != null ? (
                        <AnimatedCounter value={Math.round(node.avgAreaIqScore)} />
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F7F9FB] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      Grade
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-heading-primary">
                      {node.investmentGrade ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <MetricRow
                    label="Market Confidence"
                    value={
                      node.marketConfidence != null
                        ? `${node.marketConfidence}%`
                        : "Collecting Intelligence"
                    }
                    accent
                  />
                  <MetricRow
                    label="Demand"
                    value={fmtBand(node.demand)}
                    band={node.demand}
                  />
                  <MetricRow
                    label="Supply"
                    value={fmtBand(node.supply)}
                    band={node.supply}
                  />
                  <MetricRow
                    label="Inventory"
                    value={String(node.listingCount)}
                  />
                  <MetricRow
                    label="Verified Listings"
                    value={String(node.verifiedCount)}
                  />
                  <MetricRow
                    label="Builders"
                    value={String(node.builderCount)}
                  />
                  <MetricRow
                    label="Avg Price"
                    value={
                      node.averagePrice != null
                        ? formatInrAmount(node.averagePrice)
                        : "Collecting Intelligence"
                    }
                    accent
                  />
                  <MetricRow
                    label="Rental Yield"
                    value={
                      node.avgRentalYield != null
                        ? `${node.avgRentalYield.toFixed(1)}%`
                        : "Collecting Intelligence"
                    }
                  />
                  <MetricRow
                    label="Growth"
                    value={
                      node.avgGrowthScore != null
                        ? String(Math.round(node.avgGrowthScore))
                        : "Collecting Intelligence"
                    }
                  />
                  <MetricRow
                    label="Legal"
                    value={
                      node.legalConfidence != null
                        ? `${node.legalConfidence}%`
                        : "Collecting Intelligence"
                    }
                  />
                  <MetricRow
                    label="Risk"
                    value={fmtBand(node.risk)}
                    band={node.risk === "low" ? "high" : node.risk === "high" ? "low" : node.risk}
                  />
                  <div className="border-b border-neutral-100 py-2.5 last:border-0">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Price Trend
                      </span>
                      <Collecting />
                    </div>
                    <p className="text-[10px] text-muted">
                      Snapshot only — no fabricated time series.
                    </p>
                  </div>
                </div>

                {node.topProject ? (
                  <div className="mt-4 rounded-2xl border border-neutral-100 bg-[#F7F9FB] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      Best Property
                    </p>
                    <Link
                      href={node.topProject.href}
                      className="mt-1 block text-sm font-bold text-heading-primary no-underline hover:text-emerald-700"
                    >
                      {node.topProject.name}
                    </Link>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted">
                      <span>
                        Score{" "}
                        <strong className="text-heading-primary">
                          {node.topProject.score ?? "—"}
                        </strong>
                      </span>
                      <span>
                        {node.topProject.price != null
                          ? formatInrAmount(node.topProject.price)
                          : "—"}
                      </span>
                    </div>
                    {node.topProject.score != null ? (
                      <div className="mt-2">
                        <ProgressBar value={node.topProject.score} />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {ranked.length > 0 ? (
                  <div className="mt-5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Mapped Listings
                    </p>
                    <ul className="space-y-1.5">
                      {ranked.slice(0, 8).map((listing) => {
                        const on =
                          selectedListing?.propertyId === listing.propertyId;
                        return (
                          <li key={listing.id}>
                            <button
                              type="button"
                              onClick={() =>
                                onSelectListing?.(listing.propertyId ?? null)
                              }
                              className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                                on
                                  ? "bg-[#F3FAEF] ring-1 ring-emerald-200"
                                  : "hover:bg-[#F7F9FB]"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold text-heading-primary">
                                  {listing.name}
                                  {listing.isBestMatch ? (
                                    <span className="ml-1 text-[9px] font-bold uppercase text-[#326F1A]">
                                      Best
                                    </span>
                                  ) : null}
                                </span>
                                <span className="block truncate text-[10px] text-muted">
                                  {listing.builderName || "—"}
                                  {listing.price != null
                                    ? ` · ${formatInrAmount(listing.price)}`
                                    : ""}
                                </span>
                              </span>
                              <span
                                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                style={{
                                  backgroundColor: scoreBandColor(listing.score),
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
                  <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#F7F9FB] px-3 py-4 text-center">
                    <p className="text-xs font-semibold text-heading-primary">
                      AreaIQ is expanding coverage here.
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      Nearby verified projects stay visible on the map in grey.
                    </p>
                  </div>
                )}

                {node.recentActivity.length > 0 ? (
                  <div className="mt-5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Recent Activity
                    </p>
                    <ul className="space-y-2">
                      {node.recentActivity.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={a.href}
                            className="flex items-start gap-2 rounded-xl px-2 py-1.5 text-xs no-underline hover:bg-[#F3FAEF]"
                          >
                            <ShieldCheck
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              style={{ color: IQ_GREEN }}
                              aria-hidden
                            />
                            <span>
                              <span className="font-semibold text-heading-primary">
                                {a.label}
                              </span>
                              <span className="mt-0.5 block text-muted">{a.detail}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Suggested
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {node.suggestedQuestions.map((q) => (
                      <Link
                        key={q.id}
                        href={q.href}
                        className="rounded-xl border border-neutral-100 px-3 py-2 text-xs font-medium text-body no-underline hover:border-emerald-200 hover:bg-[#F3FAEF]"
                      >
                        {q.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid gap-2 border-t border-neutral-100 bg-[#F7F9FB] p-4">
        <Link
          href={node.href}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white no-underline"
          style={{ backgroundColor: IQ_GREEN }}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          Ask AreaIQ
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={node.listingsHref}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-label no-underline hover:bg-neutral-50"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            Explore
          </Link>
          <Link
            href={node.compareHref}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-label no-underline hover:bg-neutral-50"
          >
            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
            Compare
          </Link>
        </div>
        <div className="flex items-center justify-center gap-3 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3 w-3" aria-hidden />
            {node.builderCount} builders
          </span>
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3 w-3" aria-hidden />
            {node.listingCount} listings
          </span>
        </div>
      </div>
    </div>
  );
}
