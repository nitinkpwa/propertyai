"use client";

import Link from "next/link";
import type { AreaComparisonRow } from "@/lib/home/terminalTypes";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { ProgressBar, SkeletonBlock, TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";

function CellBar({
  value,
  max,
  suffix = "",
  price,
}: {
  value: number | null;
  max: number;
  suffix?: string;
  price?: boolean;
}) {
  if (value == null) {
    return <span className="text-sm text-muted">—</span>;
  }
  const label = price ? formatInrAmount(value) : `${value}${suffix}`;
  return (
    <div className="min-w-[88px]">
      <p className="text-xs font-bold tabular-nums text-heading-primary">{label}</p>
      <div className="mt-1">
        <ProgressBar value={value} max={max || 100} />
      </div>
    </div>
  );
}

export default function AreaComparisonTable() {
  const { loading, bundle } = useTerminalData();
  const rows = bundle?.areaComparison ?? [];

  const maxPrice = Math.max(...rows.map((r) => r.price ?? 0), 1);
  const maxRoi = Math.max(...rows.map((r) => r.roi ?? 0), 1);
  const maxRental = Math.max(...rows.map((r) => r.rental ?? 0), 1);
  const maxBuilder = Math.max(...rows.map((r) => r.builder ?? 0), 1);
  const maxDemand = Math.max(...rows.map((r) => r.demand ?? 0), 1);
  const maxScore = Math.max(...rows.map((r) => r.score ?? 0), 1);

  return (
    <div>
      <TerminalSectionHeader
        eyebrow="Compare"
        title="Area comparison"
        action={{ label: "Full compare", href: "/ask?q=Compare+Tricity+areas" }}
      />
      {loading && rows.length === 0 ? (
        <SkeletonBlock className="h-64" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-muted">
          No area data yet —{" "}
          <Link href="/ask" className="font-semibold text-[#4AAA27] no-underline">
            Ask AreaIQ
          </Link>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">ROI</th>
                <th className="px-3 py-2">Rental</th>
                <th className="px-3 py-2">Builder</th>
                <th className="px-3 py-2">Demand</th>
                <th className="px-3 py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: AreaComparisonRow) => (
                <tr
                  key={row.id}
                  className="rounded-xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                >
                  <td className="rounded-l-xl border border-r-0 border-neutral-100 px-3 py-3">
                    <Link
                      href={row.href}
                      className="text-sm font-bold text-heading-primary no-underline hover:text-emerald-700"
                    >
                      {row.area}
                    </Link>
                  </td>
                  <td className="border-y border-neutral-100 px-3 py-3">
                    <CellBar value={row.price} max={maxPrice} price />
                  </td>
                  <td className="border-y border-neutral-100 px-3 py-3">
                    <CellBar value={row.roi} max={maxRoi} />
                  </td>
                  <td className="border-y border-neutral-100 px-3 py-3">
                    <CellBar value={row.rental} max={maxRental} suffix="%" />
                  </td>
                  <td className="border-y border-neutral-100 px-3 py-3">
                    <CellBar value={row.builder} max={maxBuilder} />
                  </td>
                  <td className="border-y border-neutral-100 px-3 py-3">
                    <CellBar value={row.demand} max={maxDemand} />
                  </td>
                  <td className="rounded-r-xl border border-l-0 border-neutral-100 px-3 py-3">
                    <CellBar value={row.score} max={maxScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
