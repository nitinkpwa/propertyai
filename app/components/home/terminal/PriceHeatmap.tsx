"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { HeatmapCell } from "@/lib/home/terminalTypes";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { TerminalSectionHeader, SkeletonBlock } from "./primitives";
import { useTerminalData } from "./useTerminalData";

const TONE_BG: Record<string, string> = {
  green: "bg-emerald-100 hover:bg-emerald-200/80",
  yellow: "bg-amber-100 hover:bg-amber-200/80",
  red: "bg-rose-100 hover:bg-rose-200/80",
  neutral: "bg-neutral-100 hover:bg-neutral-200/80",
};

const TONE_DOT: Record<string, string> = {
  green: "#4AAA27",
  yellow: "#D4A017",
  red: "#C45C4A",
  neutral: "#A3A3A3",
};

export default function PriceHeatmap() {
  const { loading, bundle } = useTerminalData();
  const cells = bundle?.heatmap ?? [];
  const [hover, setHover] = useState<string | null>(null);
  const active = cells.find((c) => c.id === hover) ?? null;

  return (
    <div>
      <TerminalSectionHeader
        eyebrow="Heatmap"
        title="Price heat"
        action={{ label: "Outlook", href: "/ask?q=Tricity+price+heatmap" }}
      />
      {loading && cells.length === 0 ? (
        <SkeletonBlock className="h-56" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {cells.map((cell: HeatmapCell) => (
              <motion.button
                key={cell.id}
                type="button"
                onMouseEnter={() => setHover(cell.id)}
                onFocus={() => setHover(cell.id)}
                onClick={() => setHover(cell.id)}
                whileHover={{ scale: 1.02 }}
                className={`relative aspect-[4/3] rounded-2xl border border-white/60 p-3 text-left transition-colors ${TONE_BG[cell.tone]}`}
              >
                <span
                  className="absolute right-3 top-3 h-2 w-2 rounded-full"
                  style={{ backgroundColor: TONE_DOT[cell.tone] }}
                  aria-hidden
                />
                <p className="text-sm font-bold text-heading-primary">{cell.name}</p>
                <p className="mt-2 text-lg font-bold tabular-nums text-heading-primary">
                  {cell.averagePrice != null
                    ? formatInrAmount(cell.averagePrice)
                    : "—"}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {cell.listingCount} listings
                </p>
              </motion.button>
            ))}
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Hover detail
            </p>
            {active ? (
              <>
                <p className="mt-2 text-lg font-bold text-heading-primary">
                  {active.name}
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Avg</dt>
                    <dd className="font-semibold tabular-nums">
                      {active.averagePrice != null
                        ? formatInrAmount(active.averagePrice)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Growth</dt>
                    <dd className="font-semibold tabular-nums">
                      {active.monthlyGrowthProxy ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Outlook</dt>
                    <dd className="font-semibold capitalize">
                      {active.outlook === "unknown" ? "—" : active.outlook}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={active.href}
                  className="mt-4 inline-flex text-xs font-semibold text-[#4AAA27] no-underline"
                >
                  Ask AreaIQ →
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">Tap a zone</p>
            )}
            <div className="mt-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
              <span className="inline-flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-emerald-400" /> Low
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-amber-400" /> Mid
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-rose-400" /> High
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
