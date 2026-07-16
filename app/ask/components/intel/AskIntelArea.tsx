"use client";

import type { AskSearchStats } from "@/lib/ask/types";

interface AskIntelAreaProps {
  areaName: string | null;
  stats: AskSearchStats | null;
  summary?: string;
  onAction: (q: string) => void;
}

export function AskIntelArea({ areaName, stats, summary, onAction }: AskIntelAreaProps) {
  const name = areaName?.trim() || "Area";

  const signals = [
    {
      label: "Average Price",
      value: stats ? formatShort(stats.avgPrice) : "—",
    },
    {
      label: "Rental Yield",
      value: stats ? `${stats.avgRentalYield.toFixed(1)}%` : "—",
    },
    {
      label: "Investment Score",
      value: stats ? `${Math.round(stats.bestInvestmentScore)}/100` : "—",
    },
    { label: "Demand", value: stats && stats.count > 8 ? "High" : stats ? "Moderate" : "—" },
    { label: "Supply", value: stats ? `${stats.count} comps` : "—" },
    { label: "Metro", value: "Ask for plans" },
    { label: "Schools", value: "Ask nearby" },
    { label: "Hospitals", value: "Ask nearby" },
    { label: "Traffic", value: "Data pending" },
    { label: "Growth Prediction", value: "Ask AI" },
    { label: "Future Infra", value: "Ask AI" },
    { label: "Price Trend", value: "Ask market trend" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-label">Area intelligence</p>
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
        <p className="text-lg font-bold text-heading-primary">{name}</p>
        <p className="text-xs text-muted">Live market signals · Chandigarh Tricity</p>
        {summary ? (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-body">{summary}</p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {signals.map((s) => (
            <div key={s.label} className="rounded-xl border border-neutral-100 bg-neutral-50/70 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-label">{s.label}</p>
              <p className="mt-0.5 text-xs font-bold text-heading-primary">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            `Tell me about ${name}`,
            `${name} price trend`,
            `${name} rental yield`,
            `${name} metro plans`,
          ].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onAction(q)}
              className="rounded-full border border-neutral-200 px-2.5 py-1 text-[10px] font-semibold text-body hover:border-emerald-300 hover:bg-emerald-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatShort(price: number): string {
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000) return `₹${Math.round(price / 100_000)} L`;
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}
