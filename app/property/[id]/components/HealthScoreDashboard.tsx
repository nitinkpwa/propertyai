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
        subtitle="Every score is calculated from verified market data — never invented"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ORDER.map((key) => {
          const m = scores[key];
          const isRange =
            m.available &&
            (m.displayValue.includes("%–") || m.displayValue.includes("%-"));
          const hasScore = m.available && m.value !== null;
          const tone = hasScore ? scoreTone(m.value!) : scoreTone(0);
          return (
            <div
              key={key}
              className={`rounded-2xl border p-4 ${
                hasScore || isRange
                  ? `${tone.bg} border-transparent`
                  : "border-neutral-100 bg-neutral-50"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
                {m.label}
              </p>
              {hasScore || isRange ? (
                <>
                  <p
                    className={`mt-1 font-bold tabular-nums ${
                      isRange ? "text-lg text-emerald-800" : `text-2xl ${tone.text}`
                    }`}
                  >
                    {isRange ? m.displayValue : m.value}
                  </p>
                  {m.confidenceLabel ? (
                    <p className="mt-0.5 text-[10px] font-medium text-emerald-800">
                      Confidence {m.confidenceLabel}
                    </p>
                  ) : null}
                  {hasScore ? <ProgressBar value={m.value!} className="mt-2.5" /> : null}
                  {m.basedOn ? (
                    <p className="mt-1.5 text-[10px] leading-snug text-muted">{m.basedOn}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-semibold leading-snug text-muted">
                    Insufficient verified data
                  </p>
                  <p className="mt-2 text-[10px] leading-snug text-muted">
                    {m.basedOn || "Waiting for sufficient verified market data"}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
