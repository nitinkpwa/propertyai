"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";
import {
  AREAIQ_DEFAULT_WEIGHTS,
  INVESTMENT_DEFAULT_WEIGHTS,
  LEGAL_DEFAULT_WEIGHTS,
  BUILDER_DEFAULT_WEIGHTS,
  LOCATION_DEFAULT_WEIGHTS,
  SCORING_ENGINE_VERSION,
} from "@/lib/scoring/weights";
import { runPropertyIntelligenceScoring } from "@/lib/scoring/engine";
import type { ScoredResult, ScoreAuditLine } from "@/lib/scoring/types";

type WeightKind = "areaiq" | "investment" | "legal" | "builder" | "location";

const DEFAULTS: Record<WeightKind, Record<string, number>> = {
  areaiq: { ...AREAIQ_DEFAULT_WEIGHTS },
  investment: { ...INVESTMENT_DEFAULT_WEIGHTS },
  legal: { ...LEGAL_DEFAULT_WEIGHTS },
  builder: { ...BUILDER_DEFAULT_WEIGHTS },
  location: { ...LOCATION_DEFAULT_WEIGHTS },
};

type Props = {
  form: AdminPropertyFormState;
  propertyId: string;
  adminUserId: string;
};

function padDots(label: string, width = 18): string {
  const base = label.padEnd(width, ".");
  return base.length > width ? label.slice(0, width) : base;
}

function AuditBlock({
  result,
  title,
}: {
  result: ScoredResult;
  title: string;
}) {
  const lines: ScoreAuditLine[] =
    result.audit ??
    result.factors
      .filter((f) => f.weight > 0)
      .map((f) => ({
        key: f.key,
        label: f.label,
        earned:
          f.score != null
            ? Math.round((f.score / 100) * f.weight * 10) / 10
            : null,
        max: f.weight,
        pending: f.score == null,
        factorScore: f.score,
      }));

  const earnedTotal = lines
    .filter((l) => !l.pending && l.earned != null)
    .reduce((s, l) => s + (l.earned as number), 0);
  const maxAvailable = lines
    .filter((l) => !l.pending)
    .reduce((s, l) => s + l.max, 0);

  return (
    <div className="rounded-xl border border-neutral-100 bg-[#FAFBFC] p-4 font-mono text-xs">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 font-sans">
        <h4 className="text-sm font-bold text-heading-primary">{title}</h4>
        <p className="text-lg font-bold tabular-nums text-heading-primary">
          {result.available && result.score != null
            ? `${result.score} · ${result.label}`
            : "Insufficient Data"}
        </p>
      </div>

      <pre className="overflow-x-auto whitespace-pre leading-6 text-neutral-700">
        {lines
          .map((l) => {
            const left = padDots(l.label, 20);
            if (l.pending) return `${left} Pending`;
            const earned = Number(l.earned).toFixed(l.earned! % 1 ? 1 : 0);
            return `${left} ${earned}/${l.max}`;
          })
          .join("\n")}
        {"\n"}
        {padDots("Points (available)", 20)} {earnedTotal.toFixed(1)}/{maxAvailable}
        {"\n"}
        {padDots("Final Score", 20)}{" "}
        {result.available && result.score != null ? String(result.score) : "—"}
        {result.rawScore != null ? `  (raw ${result.rawScore})` : ""}
        {"\n"}
        {padDots("Confidence", 20)} {result.confidence.displayValue}
      </pre>

      {result.confidence.missingFactors.length > 0 ? (
        <p className="mt-3 font-sans text-[11px] text-amber-800">
          Pending / missing: {result.confidence.missingFactors.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export default function ScoreBreakdownCard({ form, propertyId, adminUserId }: Props) {
  const [kind, setKind] = useState<WeightKind>("areaiq");
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULTS.areaiq);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setWeights({ ...DEFAULTS[kind] });
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/scoring-weights?kind=${kind}`);
        if (!res.ok) return;
        const data = (await res.json()) as { weights?: Record<string, number> };
        if (!cancelled && data.weights) setWeights({ ...DEFAULTS[kind], ...data.weights });
      } catch {
        /* use defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const report = useMemo(() => {
    const price = Number(form.price) || 0;
    const area = Number(form.area_sqft) || 0;
    const bedrooms = Number(form.bedrooms) || 0;
    return runPropertyIntelligenceScoring(
      {
        propertyId,
        amenities: form.amenities ?? [],
        nearbyPlaces: form.nearbyPlaces ?? [],
        legalFlags: form.legal,
        legalVerificationAttempted: Boolean(form.legal.legal_verification_updated_at),
        reraNumber: form.rera_number,
        possession: form.possession || form.basic.propertyStatus || null,
        status: form.status,
        builderName: form.builder_name,
        city: form.city,
        location: form.location,
        price: price > 0 ? price : null,
        areaSqft: area > 0 ? area : null,
        bedrooms: bedrooms > 0 ? bedrooms : null,
        imageCount: form.photos?.length ?? 0,
        weightOverrides: {
          areaIq: kind === "areaiq" ? weights : undefined,
          investment: kind === "investment" ? weights : undefined,
          legal: kind === "legal" ? weights : undefined,
          builder: kind === "builder" ? weights : undefined,
          location: kind === "location" ? weights : undefined,
        },
      },
      null,
    );
  }, [form, kind, propertyId, weights]);

  const saveWeights = useCallback(async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/scoring-weights", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          weights,
          label: `Admin override · ${kind}`,
          updatedBy: adminUserId,
          activate: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      setMessage(data.ok ? "✅ Weights saved & activated" : `Error: ${data.error || "Save failed"}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [adminUserId, kind, weights]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-heading-primary">Score Breakdown</h3>
        <p className="text-sm text-muted">
          Auditable points · raw vs display · missing data · engine v{SCORING_ENGINE_VERSION}
        </p>
        <p className="mt-1 text-[11px] text-muted">Property {propertyId}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(DEFAULTS) as WeightKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
              kind === k
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-body hover:bg-neutral-50"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-label">
            Edit weights · {kind}
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveWeights()}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & activate"}
          </button>
        </div>
        {message ? (
          <p className={`mb-3 text-xs ${message.includes("✅") ? "text-emerald-700" : "text-red-600"}`}>
            {message}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(weights).map(([key, value]) => (
            <label key={key} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-body">{key}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={value}
                onChange={(e) =>
                  setWeights((prev) => ({
                    ...prev,
                    [key]: Number(e.target.value) || 0,
                  }))
                }
                className="w-20 rounded-md border border-neutral-200 px-2 py-1 tabular-nums"
              />
            </label>
          ))}
        </div>
      </div>

      <AuditBlock title="AreaIQ Score (buyer display)" result={report.areaIq} />
      <AuditBlock title="Investment Score" result={report.investment} />
      <AuditBlock title="Legal Score" result={report.legal} />
      <AuditBlock title="Builder Score" result={report.builder} />
      <AuditBlock title="Location Score" result={report.location} />

      <p className="text-[11px] leading-relaxed text-muted">
        Pending = missing weighted input (lowers confidence, does not zero the score). Final AreaIQ
        uses buyer-friendly normalization; raw weighted average shown in parentheses.
      </p>
    </div>
  );
}
