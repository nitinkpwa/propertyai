import type { PropertyDetail } from "../data";
import { ProgressBar, scoreTone, SectionCard, SectionTitle, SparkIcon } from "./shared";

interface AISummaryProps {
  summary: PropertyDetail["aiSummary"];
}

const RISK_STYLES = {
  Low: "bg-emerald-100 text-emerald-700",
  Moderate: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
};

export default function AISummary({ summary }: AISummaryProps) {
  const tone = scoreTone(summary.investmentScore);

  return (
    <SectionCard className="relative overflow-hidden border-emerald-200/60 bg-gradient-to-br from-white via-white to-emerald-50/30">
      <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)]">
            <SparkIcon size={16} />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              AI Investment Summary
            </h2>
            <p className="text-xs font-medium text-emerald-600">Powered by AreaIQ Intelligence</p>
          </div>
        </div>

        <p className="rounded-2xl border border-emerald-100/80 bg-white/70 p-4 text-sm leading-relaxed text-neutral-700 backdrop-blur-sm sm:p-5 sm:text-base sm:leading-7">
          &ldquo;{summary.summary}&rdquo;
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs">✓</span>
              Pros
            </h3>
            <ul className="space-y-2">
              {summary.pros.map((pro) => (
                <li key={pro} className="flex items-start gap-2 text-sm text-neutral-600">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                  {pro}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs">!</span>
              Cons
            </h3>
            <ul className="space-y-2">
              {summary.cons.map((con) => (
                <li key={con} className="flex items-start gap-2 text-sm text-neutral-600">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                  {con}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={`rounded-2xl p-4 sm:p-5 ${tone.bg}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Investment Score</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-3xl font-bold tabular-nums ${tone.text}`}>{summary.investmentScore}</span>
              <span className="text-sm text-neutral-400">/ 100</span>
            </div>
            <ProgressBar value={summary.investmentScore} className="mt-3" />
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Risk Level</p>
            <span className={`mt-2 inline-flex w-fit rounded-full px-4 py-1.5 text-sm font-bold ${RISK_STYLES[summary.riskLevel]}`}>
              {summary.riskLevel}
            </span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
