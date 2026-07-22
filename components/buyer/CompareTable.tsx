"use client";

import type { PropertyCardProps } from "@/app/components/PropertyCard";
import Badge from "@/components/ui/Badge";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { isReraApproved } from "@/lib/properties/reraStatus";

type ComparedCard = PropertyCardProps & { compareRowId: string };

interface CompareTableProps {
  items: ComparedCard[];
}

function bestIndex(values: (number | null)[], higherIsBetter = true): number | null {
  const valid = values.map((v, i) => (v !== null ? { v, i } : null)).filter(Boolean) as { v: number; i: number }[];
  if (valid.length === 0) return null;
  valid.sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
  return valid[0].i;
}

export default function CompareTable({ items }: CompareTableProps) {
  if (items.length < 2) return null;

  const priceBest = bestIndex(items.map((p) => p.price), false);
  const growthBest = bestIndex(items.map((p) => p.growthScore));
  const yieldBest = bestIndex(items.map((p) => p.rentalYield));

  const rows: {
    label: string;
    render: (p: ComparedCard) => string;
    bestIdx?: number | null;
  }[] = [
    {
      label: "Price",
      render: (p) =>
        p.priceLabel || (p.price > 0 ? formatInrAmount(p.price) : "Price on Request"),
      bestIdx: priceBest,
    },
    { label: "Location", render: (p) => `${p.location}${p.city ? `, ${p.city}` : ""}` },
    { label: "Builder", render: (p) => p.builderName ?? "—" },
    { label: "BHK", render: (p) => `${p.bhk} BHK` },
    { label: "Area", render: (p) => `${typeof p.area === "number" ? p.area.toLocaleString("en-IN") : "—"} sq ft` },
    {
      label: "Growth Score",
      render: (p) => (typeof p.growthScore === "number" ? `${p.growthScore}/100` : "N/A"),
      bestIdx: growthBest,
    },
    {
      label: "Rental Yield",
      render: (p) => (typeof p.rentalYield === "number" ? `${p.rentalYield}%` : "N/A"),
      bestIdx: yieldBest,
    },
    { label: "AreaIQ Intelligence", render: (p) => (p.aiVerified ? "Yes ✓" : "No") },
    {
      label: "RERA Verified",
      render: (p) => (isReraApproved(p) ? "Yes ✓" : "No"),
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
      <div className="border-b border-neutral-100 bg-neutral-50/80 px-4 py-3 sm:px-6">
        <p className="text-sm font-bold text-heading-primary">Professional Comparison</p>
        <p className="text-xs text-muted">Best values highlighted in green</p>
      </div>
      <div className="overflow-x-auto scroll-touch">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="sticky left-0 bg-white px-4 py-3 font-semibold text-muted sm:px-6">
                Attribute
              </th>
              {items.map((item) => (
                <th key={item.id} className="min-w-[140px] px-4 py-3 font-semibold text-heading-primary">
                  <span className="line-clamp-2">{item.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-neutral-50 last:border-0">
                <td className="sticky left-0 bg-white px-4 py-3 font-medium text-muted sm:px-6">
                  {row.label}
                </td>
                {items.map((item, idx) => {
                  const isBest = row.bestIdx === idx;
                  return (
                    <td
                      key={`${row.label}-${item.id}`}
                      className={`px-4 py-3 ${isBest ? "bg-emerald-50 font-semibold text-emerald-800" : "text-heading-secondary"}`}
                    >
                      <span className="flex items-center gap-1.5">
                        {row.render(item)}
                        {isBest ? <Badge variant="success">Best</Badge> : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-neutral-100 bg-violet-50/50 px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold text-violet-900">🤖 AI Recommendation</p>
        <p className="mt-1 text-xs text-violet-800">
          {items.length >= 2
            ? `Based on growth score and rental yield, ${items[growthBest ?? 0]?.name ?? "the top pick"} offers the strongest investment potential. Compare possession timelines before deciding.`
            : "Add at least 2 properties to get AI comparison insights."}
        </p>
      </div>
    </div>
  );
}
