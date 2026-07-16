import type { BuilderIntelData } from "../data";
import { ProgressBar, scoreTone, SectionCard, SectionTitle } from "./shared";

interface BuilderIntelligenceProps {
  data: BuilderIntelData;
}

export default function BuilderIntelligence({ data }: BuilderIntelligenceProps) {
  const tone =
    data.overallRating !== null ? scoreTone(data.overallRating) : scoreTone(0);

  const cells = [
    {
      label: "Projects Delivered",
      value: data.projectsDelivered !== null ? String(data.projectsDelivered) : "—",
    },
    {
      label: "Active Projects",
      value: data.activeProjects !== null ? String(data.activeProjects) : "—",
    },
    { label: "Delivery Record", value: data.deliveryRecord },
    { label: "Construction Quality", value: data.constructionQuality },
    { label: "Legal Issues", value: data.legalIssues },
    { label: "Customer Reviews", value: data.customerReviews },
    { label: "Financial Stability", value: data.financialStability },
    { label: "Avg Delivery Delay", value: data.averageDeliveryDelay },
    { label: "RERA Compliance", value: data.reraCompliance },
  ];

  return (
    <SectionCard>
      <SectionTitle
        title="Builder Intelligence"
        subtitle={`Trust & delivery signals for ${data.name}`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-lg font-bold text-white">
          {data.name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase() || "IQ"}
        </div>
        <div>
          <p className="text-lg font-bold text-heading-primary">{data.name}</p>
          <p className="text-sm text-muted">{data.summary}</p>
        </div>
        <div className={`ml-auto rounded-2xl px-4 py-3 ${tone.bg}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
            Overall Rating
          </p>
          <p className={`text-2xl font-bold tabular-nums ${tone.text}`}>
            {data.overallRating !== null ? `${data.overallRating}/100` : "—"}
          </p>
          {data.overallRating !== null ? (
            <ProgressBar value={data.overallRating} className="mt-2 w-28" />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
              {cell.label}
            </p>
            <p className="mt-1.5 text-sm font-medium leading-snug text-heading-primary">
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
