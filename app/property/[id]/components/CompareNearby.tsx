import Link from "next/link";
import type { CompareNearbyData } from "../data";
import { formatPrice } from "../data";
import { SectionCard, SectionTitle, SparkIcon } from "./shared";

interface CompareNearbyProps {
  data: CompareNearbyData;
  current: {
    name: string;
    price: number;
    area: number;
    builderName: string;
    rental: number | null;
    growth: number | null;
    areaIq: number | null;
  };
}

export default function CompareNearby({ data, current }: CompareNearbyProps) {
  const columns = [
    {
      id: "current",
      name: current.name,
      price: current.price,
      area: current.area,
      builderName: current.builderName,
      roi: current.growth,
      rentalYield: current.rental,
      futureGrowth: current.growth,
      areaIqScore: current.areaIq,
      href: undefined as string | undefined,
      isCurrent: true,
    },
    ...data.candidates.map((c) => ({ ...c, isCurrent: false })),
  ];

  if (columns.length < 2) {
    return (
      <SectionCard>
        <SectionTitle title="Compare Property" subtitle="Nearby listing comparison" />
        <p className="text-sm text-muted">
          Not enough nearby properties to compare yet. Save listings to Compare from your buyer
          dashboard.
        </p>
      </SectionCard>
    );
  }

  const rows: { label: string; render: (c: (typeof columns)[number]) => string }[] = [
    { label: "Price", render: (c) => formatPrice(c.price) },
    {
      label: "Area",
      render: (c) => (c.area > 0 ? `${c.area.toLocaleString("en-IN")} sq ft` : "—"),
    },
    { label: "Builder", render: (c) => c.builderName },
    {
      label: "ROI / Growth",
      render: (c) => (c.roi !== null ? `${c.roi}/100` : "—"),
    },
    {
      label: "Rental",
      render: (c) => (c.rentalYield !== null ? `${c.rentalYield}%` : "—"),
    },
    {
      label: "Future Growth",
      render: (c) => (c.futureGrowth !== null ? `${c.futureGrowth}/100` : "—"),
    },
    {
      label: "AreaIQ Score",
      render: (c) => (c.areaIqScore !== null ? `${c.areaIqScore}/100` : "—"),
    },
  ];

  return (
    <SectionCard>
      <SectionTitle
        title="Compare Property"
        subtitle="Side-by-side with nearby active listings"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="sticky left-0 bg-white py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-label">
                Metric
              </th>
              {columns.map((col) => (
                <th key={col.id} className="min-w-[140px] px-3 py-2 font-semibold text-heading-primary">
                  {col.href ? (
                    <Link href={col.href} className="line-clamp-2 text-emerald-700 hover:underline">
                      {col.name}
                    </Link>
                  ) : (
                    <span className="line-clamp-2">
                      {col.name}
                      {col.isCurrent ? (
                        <span className="ml-1 text-[10px] font-bold text-emerald-600">YOU</span>
                      ) : null}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-neutral-50 last:border-0">
                <td className="sticky left-0 bg-white py-3 pr-3 font-medium text-muted">
                  {row.label}
                </td>
                {columns.map((col) => (
                  <td
                    key={`${row.label}-${col.id}`}
                    className={`px-3 py-3 tabular-nums ${
                      col.isCurrent ? "bg-emerald-50/40 font-semibold text-emerald-900" : "text-body"
                    }`}
                  >
                    {row.render(col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
          <SparkIcon size={14} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            AI Verdict
          </p>
          <p className="mt-1 text-sm leading-relaxed text-body">{data.aiVerdict}</p>
        </div>
      </div>
    </SectionCard>
  );
}
