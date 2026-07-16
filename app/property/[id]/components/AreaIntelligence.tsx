"use client";

import { useEffect, useState } from "react";
import type { AreaIntelligenceReport, IntelligenceMetric } from "@/lib/intelligence/types";
import { ProgressBar, scoreTone, SectionCard, SectionTitle } from "./shared";

interface AreaIntelligenceProps {
  propertyId: string;
}

function MetricCard({
  label,
  icon,
  metric,
  unit = "",
}: {
  label: string;
  icon: string;
  metric: IntelligenceMetric;
  unit?: string;
}) {
  const numericValue =
    typeof metric.value === "number" ? metric.value : null;
  const tone = numericValue !== null ? scoreTone(numericValue) : scoreTone(0);

  return (
    <div
      className={`rounded-2xl border border-neutral-100 p-4 sm:p-5 ${
        metric.available ? tone.bg : "bg-neutral-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-label">
          {label}
        </span>
      </div>

      <div className="mt-2">
        <p className={`text-2xl font-bold tabular-nums ${metric.available ? tone.text : "text-muted"}`}>
          {metric.displayValue}
          {metric.available && unit ? (
            <span className="ml-1 text-xs font-medium text-muted">{unit}</span>
          ) : null}
        </p>
      </div>

      {metric.available && numericValue !== null ? (
        <ProgressBar value={numericValue} className="mt-3" />
      ) : null}

      <div className="mt-3 space-y-1">
        {metric.source ? (
          <p className="text-[11px] font-medium text-muted">
            Source: <span className="text-body">{metric.source}</span>
          </p>
        ) : null}
        {!metric.available && metric.explanation ? (
          <p className="text-xs leading-relaxed text-muted">{metric.explanation}</p>
        ) : null}
        {metric.factors?.slice(0, 2).map((factor) => (
          <p key={factor} className="text-[11px] text-muted">
            • {factor}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function AreaIntelligence({ propertyId }: AreaIntelligenceProps) {
  const [report, setReport] = useState<AreaIntelligenceReport | null>(null);
  const [outlook, setOutlook] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [outlookLoading, setOutlookLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/properties/${propertyId}/intelligence`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.report) setReport(data.report);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetch(`/api/properties/${propertyId}/intelligence/insights`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.outlook) setOutlook(data.outlook);
      })
      .finally(() => {
        if (!cancelled) setOutlookLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (loading) {
    return (
      <SectionCard>
        <SectionTitle
          title="AreaIQ Intelligence Engine"
          subtitle="Calculating real metrics from AreaIQ database…"
        />
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
          Analyzing market data
        </div>
      </SectionCard>
    );
  }

  if (!report) {
    return (
      <SectionCard>
        <SectionTitle title="AreaIQ Intelligence Engine" />
        <p className="text-sm text-muted">
          Intelligence report unavailable for this property.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <SectionTitle
          title="AreaIQ Intelligence Engine"
          subtitle={`${report.availableMetrics.length} metrics calculated from ${report.marketSnapshot.comparableListings} comparable listings in ${report.marketSnapshot.city}`}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Growth Score" icon="📈" metric={report.growthScore} unit="/ 100" />
          <MetricCard label="Rental Yield" icon="💰" metric={report.rentalYield} />
          <MetricCard label="Investment Score" icon="⭐" metric={report.investmentScore} unit="/ 100" />
          <MetricCard label="Demand Index" icon="📊" metric={report.demandIndex} unit="/ 100" />
          <MetricCard label="Builder Reputation" icon="🏗️" metric={report.builderReputation} />
          <MetricCard label="Schools Nearby" icon="🎓" metric={report.schoolsNearby} />
          <MetricCard label="Hospitals Nearby" icon="🏥" metric={report.hospitalsNearby} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Airport", metric: report.connectivity.airport, icon: "✈️" },
            { label: "Metro", metric: report.connectivity.metro, icon: "🚇" },
            { label: "Highway Access", metric: report.connectivity.highways, icon: "🛣️" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-neutral-100 bg-white/80 px-4 py-4 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-label">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-heading-primary">{item.metric.displayValue}</p>
                  {item.metric.source ? (
                    <p className="mt-1 text-[11px] text-muted">Source: {item.metric.source}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <span>🔮</span> Future Outlook
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              OpenAI Analysis
            </span>
          </h3>
          {outlookLoading ? (
            <p className="mt-3 text-sm text-muted">Generating qualitative outlook…</p>
          ) : outlook ? (
            <div
              className="mt-3 space-y-2 text-sm leading-relaxed text-body"
              dangerouslySetInnerHTML={{
                __html: outlook
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/^-\s+/gm, "• ")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br />"),
              }}
            />
          ) : (
            <p className="mt-3 text-sm text-muted">
              Qualitative outlook unavailable. AreaIQ will generate this when OpenAI is configured
              and sufficient market data exists.
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted">
            OpenAI provides explanations only — all scores above are calculated from AreaIQ database
            facts.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
