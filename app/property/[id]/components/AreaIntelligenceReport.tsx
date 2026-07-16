import type { AreaIntelData } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface AreaIntelligenceReportProps {
  data: AreaIntelData;
}

export default function AreaIntelligenceReportSection({ data }: AreaIntelligenceReportProps) {
  return (
    <SectionCard>
      <SectionTitle
        title="Area Intelligence"
        subtitle="Schools, hospitals, metro, demand, supply, and infrastructure signals"
      />

      <p className="mb-5 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4 text-sm leading-relaxed text-body">
        {data.summary}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.signals.map((signal) => (
          <div
            key={signal.label}
            className={`rounded-2xl border p-4 ${
              signal.available
                ? "border-emerald-100/80 bg-emerald-50/30"
                : "border-neutral-100 bg-neutral-50"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
              {signal.label}
            </p>
            <p
              className={`mt-1 text-sm font-bold ${
                signal.available ? "text-heading-primary" : "text-muted"
              }`}
            >
              {signal.value}
            </p>
            {!signal.available && signal.detail ? (
              <p className="mt-1.5 text-[10px] leading-snug text-muted line-clamp-2">
                {signal.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-label">
            Future Projects
          </p>
          <p className="mt-2 text-sm leading-relaxed text-body">{data.futureProjects}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-label">
            Demand & Supply
          </p>
          <p className="mt-2 text-sm leading-relaxed text-body">{data.demandSupply}</p>
        </div>
      </div>
    </SectionCard>
  );
}
