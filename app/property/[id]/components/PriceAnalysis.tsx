import type { PriceAnalysisData } from "../data";
import { formatPrice } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface PriceAnalysisProps {
  data: PriceAnalysisData;
}

const POSITION_STYLES: Record<string, string> = {
  Undervalued: "bg-emerald-100 text-emerald-800",
  "Fair Value": "bg-sky-100 text-sky-800",
  "Fairly Priced": "bg-sky-100 text-sky-800",
  Overpriced: "bg-amber-100 text-amber-800",
  Unknown: "bg-neutral-100 text-body",
  "Insufficient verified data": "bg-neutral-100 text-body",
};

function cellValue(value: string | null | undefined, fallback = "Insufficient verified data") {
  if (value == null || value === "" || value === "—") return fallback;
  return value;
}

export default function PriceAnalysis({ data }: PriceAnalysisProps) {
  if (!data.available) {
    return (
      <SectionCard>
        <SectionTitle
          title="Price Analysis"
          subtitle="Verified comparable listings required"
        />
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-heading-primary">
            {data.unavailableMessage || "Insufficient comparable listings"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
            AreaIQ only shows price intelligence when enough active listings match city, type,
            configuration, and area. No estimated or placeholder prices are shown.
          </p>
        </div>
      </SectionCard>
    );
  }

  const cells = [
    {
      label: "Current Price",
      value: formatPrice(data.currentPrice),
    },
    {
      label: "Current / sq ft",
      value:
        data.pricePerSqFt > 0
          ? `₹${data.pricePerSqFt.toLocaleString("en-IN")}`
          : null,
    },
    {
      label: "Area Average / sq ft",
      value:
        data.averagePsf != null
          ? `₹${Math.round(data.averagePsf).toLocaleString("en-IN")}`
          : null,
    },
    {
      label: "Median / sq ft",
      value:
        data.medianPsf != null
          ? `₹${Math.round(data.medianPsf).toLocaleString("en-IN")}`
          : null,
    },
    {
      label: "Lowest / sq ft",
      value:
        data.lowestPsf != null
          ? `₹${Math.round(data.lowestPsf).toLocaleString("en-IN")}`
          : null,
    },
    {
      label: "Highest / sq ft",
      value:
        data.highestPsf != null
          ? `₹${Math.round(data.highestPsf).toLocaleString("en-IN")}`
          : null,
    },
    {
      label: "Difference vs avg",
      value:
        data.differencePercent != null
          ? `${data.differencePercent > 0 ? "+" : ""}${data.differencePercent}%`
          : null,
    },
    {
      label: "Price Rank",
      value: data.priceRankLabel,
    },
    {
      label: "Fair Value (Low)",
      value: data.fairValueLow != null ? formatPrice(data.fairValueLow) : null,
    },
    {
      label: "Fair Value (Expected)",
      value: data.fairValueEstimate != null ? formatPrice(data.fairValueEstimate) : null,
    },
    {
      label: "Fair Value (High)",
      value: data.fairValueHigh != null ? formatPrice(data.fairValueHigh) : null,
    },
    {
      label: "Price Trend",
      value:
        data.priceTrendPercent != null
          ? `${data.priceTrendPercent > 0 ? "+" : ""}${data.priceTrendPercent}%`
          : "Historical data unavailable",
    },
  ];

  return (
    <SectionCard>
      <SectionTitle
        title="Price Analysis"
        subtitle={`Based on ${data.comparableCount} verified comparable active listings`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            POSITION_STYLES[data.marketPosition] ?? POSITION_STYLES.Unknown
          }`}
        >
          {data.marketPosition}
        </span>
        {data.confidence != null ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Confidence {data.confidenceLabel}
          </span>
        ) : null}
        <span className="text-xs text-muted">{data.basedOn}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
              {cell.label}
            </p>
            <p className="mt-1 text-base font-bold tabular-nums text-heading-primary sm:text-lg">
              {cellValue(cell.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          AI Opinion
        </p>
        <p className="mt-2 text-sm leading-relaxed text-body">{data.aiOpinion}</p>
        <p className="mt-2 text-[11px] text-muted">
          Explains calculated figures only — AreaIQ does not invent market numbers.
        </p>
      </div>
    </SectionCard>
  );
}
