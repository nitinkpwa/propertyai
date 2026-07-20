"use client";

import Link from "next/link";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import type { ListingProperty } from "@/lib/properties/types";

interface AskIntelCompareProps {
  listings: ListingProperty[];
  onAction: (q: string) => void;
}

export function AskIntelCompare({ listings, onAction }: AskIntelCompareProps) {
  const cols = listings.slice(0, 3);
  if (cols.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-xs text-muted">
        Ask to compare two or more projects to populate this widget.
        <button
          type="button"
          onClick={() => onAction("Compare Aerocity vs New Chandigarh")}
          className="mt-2 block font-semibold text-emerald-700 hover:underline"
        >
          Compare Aerocity vs New Chandigarh →
        </button>
      </div>
    );
  }

  const rows: { label: string; render: (p: ListingProperty) => string }[] = [
    {
      label: "Price",
      render: (p) =>
        p.priceLabel || (p.price > 0 ? formatInrAmount(p.price) : "Price on Request"),
    },
    {
      label: "Area",
      render: (p) =>
        p.sizeLabel ||
        (p.area > 0 ? `${p.area.toLocaleString("en-IN")} sq ft` : "—"),
    },
    { label: "Builder", render: (p) => p.builderName },
    {
      label: "Growth",
      render: (p) => (p.growthScore !== null ? `${p.growthScore}/100` : "—"),
    },
    {
      label: "Rental",
      render: (p) => (p.rentalYield !== null ? `${p.rentalYield}%` : "—"),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-label">Compare widget</p>
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/80">
                <th className="px-2 py-2 font-semibold text-muted">Metric</th>
                {cols.map((p) => (
                  <th key={p.id} className="min-w-[90px] px-2 py-2 font-semibold text-heading-primary">
                    <Link href={p.href ?? `/property/${p.id}`} className="line-clamp-2 hover:text-emerald-700">
                      {p.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-neutral-50">
                  <td className="px-2 py-2 font-medium text-muted">{row.label}</td>
                  {cols.map((p) => (
                    <td key={`${row.label}-${p.id}`} className="px-2 py-2 tabular-nums text-body">
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          onAction(
            `Which is better: ${cols.map((c) => c.name).join(" vs ")}? Give AI verdict`,
          )
        }
        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-semibold text-emerald-800"
      >
        AreaIQ verdict
      </button>
    </div>
  );
}
