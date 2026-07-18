import type { PriceAnalysisData } from "../data";
import { formatPrice } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface PriceAnalysisProps {
  data: PriceAnalysisData;
}

const POSITION_STYLES = {
  Undervalued: "bg-emerald-100 text-emerald-800",
  "Fair Value": "bg-sky-100 text-sky-800",
  Overpriced: "bg-amber-100 text-amber-800",
  Unknown: "bg-neutral-100 text-body",
};

export default function PriceAnalysis({ data }: PriceAnalysisProps) {
  const cells = [
    { label: "Current Price", value: formatPrice(data.currentPrice) },
    {
      label: "Average Area Price",
      value: data.averageAreaPrice !== null ? formatPrice(data.averageAreaPrice) : "—",
    },
    {
      label: "Lowest Comp",
      value: data.lowestPrice !== null ? formatPrice(data.lowestPrice) : "—",
    },
    {
      label: "Highest Comp",
      value: data.highestPrice !== null ? formatPrice(data.highestPrice) : "—",
    },
    {
      label: "Price / sq ft",
      value:
        data.pricePerSqFt > 0
          ? `₹${data.pricePerSqFt.toLocaleString("en-IN")}`
          : "—",
    },
    {
      label: "Area Avg / sq ft",
      value:
        data.averagePsf !== null ? `₹${Math.round(data.averagePsf).toLocaleString("en-IN")}` : "—",
    },
    {
      label: "Price Trend",
      value:
        data.priceTrendPercent !== null
          ? `${data.priceTrendPercent > 0 ? "+" : ""}${data.priceTrendPercent}%`
          : "—",
    },
    {
      label: "Fair Value Est.",
      value: data.fairValueEstimate !== null ? formatPrice(data.fairValueEstimate) : "—",
    },
  ];

  return (
    <SectionCard>
      <SectionTitle
        title="Price Analysis"
        subtitle={`Market position vs ${data.comparableCount} comparable active listings`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${POSITION_STYLES[data.marketPosition]}`}
        >
          {data.marketPosition}
        </span>
        {data.marketPosition === "Undervalued" || data.marketPosition === "Overpriced" ? (
          <span className="text-xs text-muted">Relative to area median price / sq ft</span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
              {cell.label}
            </p>
            <p className="mt-1 text-base font-bold tabular-nums text-heading-primary sm:text-lg">
              {cell.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">AI Opinion</p>
        <p className="mt-2 text-sm leading-relaxed text-body">{data.aiOpinion}</p>
      </div>
    </SectionCard>
  );
}
