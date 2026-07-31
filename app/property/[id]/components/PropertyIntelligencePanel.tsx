"use client";

import type { PropertyIntelligenceReport, ScoredResult } from "@/lib/scoring/types";
import { INSUFFICIENT_DATA, INSUFFICIENT_DATA_CTA } from "@/lib/scoring/types";
import { CONFIDENCE_TOOLTIP, SCORE_TONE_COLORS } from "@/lib/scoring/score-utils";
import { SectionCard, SectionTitle } from "./shared";

type Props = {
  report: PropertyIntelligenceReport | null | undefined;
};

function ProgressRing({
  score,
  tone,
  size = 88,
}: {
  score: number;
  tone: keyof typeof SCORE_TONE_COLORS;
  size?: number;
}) {
  const colors = SCORE_TONE_COLORS[tone];
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#F0F0F0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.ring}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

function ScorePillar({
  title,
  result,
}: {
  title: string;
  result: ScoredResult;
}) {
  const available = result.available && result.score != null;
  const colors = SCORE_TONE_COLORS[result.tone];

  if (!available) {
    return (
      <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
          {title}
        </p>
        <p className="mt-3 text-base font-semibold text-neutral-600">{INSUFFICIENT_DATA}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">{INSUFFICIENT_DATA_CTA}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-neutral-100 p-5"
      style={{ backgroundColor: colors.bg }}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <ProgressRing score={result.score!} tone={result.tone} />
          <div className="absolute inset-0 flex rotate-0 flex-col items-center justify-center">
            <span
              className="text-xl font-bold tabular-nums tracking-tight"
              style={{ color: colors.text }}
            >
              {result.score}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-label">
            {title}
          </p>
          <p className="mt-1 text-lg font-bold" style={{ color: colors.text }}>
            {result.label}
          </p>
          {result.confidence.value != null ? (
            <p
              className="mt-1 cursor-help text-[11px] font-medium text-neutral-500 underline decoration-dotted decoration-neutral-300 underline-offset-2"
              title={`Confidence ${result.confidence.displayValue}\n\n${CONFIDENCE_TOOLTIP}`}
            >
              Confidence {result.confidence.displayValue}
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-relaxed text-muted">{result.explanation.summary}</p>
        </div>
      </div>

      {(result.explanation.positive.length > 0 ||
        result.explanation.negative.length > 0) && (
        <div className="mt-4 grid gap-3 border-t border-black/5 pt-4 sm:grid-cols-2">
          {result.explanation.positive.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Top Reasons
              </p>
              <ul className="mt-2 space-y-1.5">
                {result.explanation.positive.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-xs leading-snug text-neutral-700"
                  >
                    <span style={{ color: colors.text }} aria-hidden>
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.explanation.negative.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Negative Factors
              </p>
              <ul className="mt-2 space-y-1.5">
                {result.explanation.negative.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-xs leading-snug text-neutral-600"
                  >
                    <span className="text-amber-600" aria-hidden>
                      ⚠
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SubScore({ title, result }: { title: string; result: ScoredResult }) {
  const available = result.available && result.score != null;
  const colors = SCORE_TONE_COLORS[result.tone];

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-label">
          {title}
        </p>
        {available && result.confidence.value != null ? (
          <p className="text-[10px] text-muted">Conf. {result.confidence.displayValue}</p>
        ) : null}
      </div>
      {available ? (
        <>
          <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: colors.text }}>
            {result.score}
          </p>
          <p className="text-xs font-semibold" style={{ color: colors.text }}>
            {result.label}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${result.score}%`, backgroundColor: colors.bar }}
            />
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold text-neutral-500">{INSUFFICIENT_DATA}</p>
          <p className="mt-1 text-[11px] text-muted">{INSUFFICIENT_DATA_CTA}</p>
        </>
      )}
    </div>
  );
}

export default function PropertyIntelligencePanel({ report }: Props) {
  if (!report) {
    return (
      <SectionCard>
        <SectionTitle
          title="Property Intelligence"
          subtitle="Deterministic scores from verified data — never invented"
        />
        <p className="text-sm text-muted">{INSUFFICIENT_DATA_CTA}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionTitle
        title="Property Intelligence"
        subtitle="Three independent pillars · explainable · confidence-weighted"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ScorePillar title="AreaIQ Score" result={report.areaIq} />
        <ScorePillar title="Investment Score" result={report.investment} />
        <ScorePillar title="Legal Score" result={report.legal} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SubScore title="Builder Score" result={report.builder} />
        <SubScore title="Location Score" result={report.location} />
      </div>

      {report.priceFairness.available ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-100 bg-[#FAFBFC] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-label">
            Price Fairness
          </p>
          <p className="text-sm font-bold text-heading-primary">
            {report.priceFairness.label}
          </p>
          {report.priceFairness.detail ? (
            <p className="text-xs text-muted">{report.priceFairness.detail}</p>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}
