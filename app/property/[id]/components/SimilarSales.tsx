import Link from "next/link";
import type { SimilarSalesData } from "../data";
import { formatPrice } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface SimilarSalesProps {
  data: SimilarSalesData;
}

function trendLabel(v: number | null): string {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}%`;
}

export default function SimilarSales({ data }: SimilarSalesProps) {
  return (
    <SectionCard>
      <SectionTitle
        title="Similar Sales"
        subtitle="Recent comparable active listings used as market proxies"
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Average Price",
            value: data.averagePrice !== null ? formatPrice(data.averagePrice) : "—",
          },
          {
            label: "Highest",
            value: data.highestPrice !== null ? formatPrice(data.highestPrice) : "—",
          },
          {
            label: "Lowest",
            value: data.lowestPrice !== null ? formatPrice(data.lowestPrice) : "—",
          },
          { label: "Monthly Trend", value: trendLabel(data.monthlyTrendPercent) },
          { label: "Quarterly Trend", value: trendLabel(data.quarterlyTrendPercent) },
          { label: "Yearly Trend", value: trendLabel(data.yearlyTrendPercent) },
        ].map((cell) => (
          <div key={cell.label} className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
              {cell.label}
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-heading-primary">{cell.value}</p>
          </div>
        ))}
      </div>

      {data.comps.length === 0 ? (
        <p className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-muted">
          No comparable listings available yet in this locality.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs uppercase tracking-wider text-label">
                <th className="py-2 pr-3 font-semibold">Listing</th>
                <th className="py-2 pr-3 font-semibold">Price</th>
                <th className="py-2 pr-3 font-semibold">₹/sq ft</th>
                <th className="py-2 pr-3 font-semibold">Area</th>
                <th className="py-2 font-semibold">Builder</th>
              </tr>
            </thead>
            <tbody>
              {data.comps.map((comp) => (
                <tr key={comp.id} className="border-b border-neutral-50 last:border-0">
                  <td className="py-3 pr-3">
                    <Link
                      href={comp.href}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {comp.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 tabular-nums font-semibold text-heading-primary">
                    {formatPrice(comp.price)}
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-muted">
                    {comp.pricePerSqFt !== null
                      ? `₹${Math.round(comp.pricePerSqFt).toLocaleString("en-IN")}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-muted">
                    {comp.areaSqft > 0 ? `${comp.areaSqft.toLocaleString("en-IN")} sq ft` : "—"}
                  </td>
                  <td className="py-3 text-muted">{comp.builderName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted">{data.note}</p>
    </SectionCard>
  );
}
