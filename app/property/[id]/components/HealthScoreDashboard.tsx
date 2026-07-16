import type { PropertyIntelligenceBundle } from "../data";
import { ProgressBar, scoreTone, SectionCard, SectionTitle } from "./shared";

interface HealthScoreDashboardProps {
  scores: PropertyIntelligenceBundle["scores"];
}

const ORDER: (keyof PropertyIntelligenceBundle["scores"])[] = [
  "areaIq",
  "investment",
  "rental",
  "builder",
  "legal",
  "location",
  "amenities",
  "connectivity",
  "liquidity",
  "futureGrowth",
];

export default function HealthScoreDashboard({ scores }: HealthScoreDashboardProps) {
  return (
    <SectionCard>
      <SectionTitle
        title="Property Health Score"
        subtitle="Composite dashboard across investment, legal, location, and liquidity signals"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ORDER.map((key) => {
          const m = scores[key];
          const tone = m.available && m.value !== null ? scoreTone(m.value) : scoreTone(0);
          return (
            <div
              key={key}
              className={`rounded-2xl border p-4 ${
                m.available ? `${tone.bg} border-transparent` : "border-neutral-100 bg-neutral-50"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
                {m.label}
              </p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${m.available ? tone.text : "text-muted"}`}>
                {m.available && m.value !== null ? `${m.value}%` : "—"}
              </p>
              {m.available && m.value !== null ? (
                <ProgressBar value={m.value} className="mt-2.5" />
              ) : (
                <p className="mt-2 text-[10px] leading-snug text-muted">Pending more data</p>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
