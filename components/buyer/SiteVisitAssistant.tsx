"use client";

import { useCallback, useMemo, useState } from "react";
import type { SiteVisitRow } from "@/lib/buyer/types";
import {
  AFTER_VISIT_OUTCOMES,
  buildAfterVisitContext,
  buildBeforeVisitContext,
  buildDefaultDuringVisitContext,
  DURING_VISIT_RATING_LABELS,
  type DuringVisitContext,
} from "@/lib/crm/visitAssistant";
import { formatVisitStatusLabel } from "@/lib/crm/visitWorkflow";
import Badge from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Phase = "before" | "during" | "after";

interface Props {
  visit: SiteVisitRow & {
    property?: {
      title?: string;
      builder_name?: string | null;
      area_sqft?: number | null;
      price?: number | null;
      location?: string | null;
      city?: string | null;
      nearby_places?: Record<string, unknown> | null;
      amenities?: string[] | null;
      type?: string | null;
      rera_number?: string | null;
      parking?: string | null;
    } | null;
    visit_context?: Record<string, unknown> | null;
    during_visit_notes?: Record<string, unknown> | null;
    feedback?: Record<string, unknown> | null;
  };
  onContextSaved?: () => void;
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`text-sm ${s <= value ? "text-amber-400" : "text-neutral-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function SiteVisitAssistant({ visit, onContextSaved }: Props) {
  const before = useMemo(() => buildBeforeVisitContext(visit), [visit]);
  const after = useMemo(
    () => buildAfterVisitContext(visit.feedback ?? null),
    [visit.feedback],
  );

  const defaultPhase: Phase =
    visit.status === "completed"
      ? "after"
      : ["accepted", "scheduled"].includes(visit.status)
        ? "during"
        : "before";

  const [phase, setPhase] = useState<Phase>(defaultPhase);
  const [during, setDuring] = useState<DuringVisitContext>(() => {
    const saved = visit.during_visit_notes?.during as DuringVisitContext | undefined;
    return saved ?? buildDefaultDuringVisitContext();
  });
  const [saving, setSaving] = useState(false);

  const saveContext = useCallback(
    async (p: Phase, data: Record<string, unknown>) => {
      setSaving(true);
      await fetch("/api/crm/visit-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: visit.id, phase: p, contextData: data }),
      });
      setSaving(false);
      onContextSaved?.();
    },
    [visit.id, onContextSaved],
  );

  const toggleChecklist = (item: string) => {
    setDuring((prev) => ({
      ...prev,
      checklistProgress: {
        ...prev.checklistProgress,
        [item]: !prev.checklistProgress[item],
      },
    }));
  };

  const phases: { key: Phase; label: string }[] = [
    { key: "before", label: "Before Visit" },
    { key: "during", label: "During Visit" },
    { key: "after", label: "After Visit" },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-900">Site Visit Assistant</p>
          <p className="text-xs text-emerald-700">
            {visit.property?.title ?? "Property"} · {formatVisitStatusLabel(visit.status)}
          </p>
        </div>
        <Badge variant="info">
          AI-Ready
        </Badge>
      </div>

      <div className="flex gap-2">
        {phases.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPhase(p.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              phase === p.key
                ? "bg-emerald-600 text-white"
                : "bg-white text-neutral-600 ring-1 ring-neutral-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {phase === "before" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <h4 className="text-sm font-semibold text-blue-900">Property Summary</h4>
            <dl className="mt-2 space-y-1 text-xs text-blue-800">
              <div><dt className="inline font-medium">Title: </dt><dd className="inline">{before.propertySummary.title}</dd></div>
              {before.propertySummary.builder ? <div><dt className="inline font-medium">Builder: </dt><dd className="inline">{before.propertySummary.builder}</dd></div> : null}
              {before.propertySummary.area ? <div><dt className="inline font-medium">Area: </dt><dd className="inline">{before.propertySummary.area}</dd></div> : null}
              {before.propertySummary.location ? <div><dt className="inline font-medium">Location: </dt><dd className="inline">{before.propertySummary.location}</dd></div> : null}
            </dl>
            {before.pros.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-emerald-800">Pros</p>
                <ul className="mt-1 text-xs text-emerald-700">{before.pros.map((p) => <li key={p}>+ {p}</li>)}</ul>
              </div>
            ) : null}
            {before.cons.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs font-semibold text-rose-800">Cons / Verify</p>
                <ul className="mt-1 text-xs text-rose-700">{before.cons.map((c) => <li key={c}>! {c}</li>)}</ul>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
            <h4 className="text-sm font-semibold text-violet-900">Checklist & Documents</h4>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-violet-800">
              {before.checklist.map((item) => (
                <li key={item}>☐ {item}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-semibold text-violet-900">Documents to Verify</p>
            <ul className="mt-1 text-xs text-violet-700">
              {before.documentsToVerify.slice(0, 4).map((d) => <li key={d}>· {d}</li>)}
            </ul>
          </section>

          <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 sm:col-span-2">
            <h4 className="text-sm font-semibold text-amber-900">Questions to Ask</h4>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-xs text-amber-800">
              {before.questionsToAsk.map((q) => <li key={q}>· {q}</li>)}
            </ul>
            <p className="mt-3 text-xs text-amber-700">{before.marketPriceNote}</p>
            <ul className="mt-2 text-xs text-amber-600">
              {before.aiPreparationTips.map((t) => <li key={t}>💡 {t}</li>)}
            </ul>
          </section>
        </div>
      )}

      {phase === "during" && (
        <div className="space-y-4">
          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-neutral-900">Interactive Checklist</h4>
            <ul className="mt-2 space-y-2">
              {before.checklist.map((item) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(during.checklistProgress[item])}
                      onChange={() => toggleChecklist(item)}
                      className="rounded border-neutral-300 text-emerald-600"
                    />
                    <span className={during.checklistProgress[item] ? "text-neutral-400 line-through" : ""}>
                      {item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-neutral-900">Ratings</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {DURING_VISIT_RATING_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-600">{label}</span>
                  <StarInput
                    value={during.ratings[key]}
                    onChange={(v) =>
                      setDuring((prev) => ({
                        ...prev,
                        ratings: { ...prev.ratings, [key]: v },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          <textarea
            value={during.notes}
            onChange={(e) => setDuring((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Take notes during the visit..."
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            rows={4}
          />

          <Button
            loading={saving}
            loadingText="Saving..."
            onClick={() => saveContext("during", during as unknown as Record<string, unknown>)}
          >
            Save Visit Notes to CRM
          </Button>
        </div>
      )}

      {phase === "after" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AFTER_VISIT_OUTCOMES.map((o) => {
              const active = after[o.key as keyof typeof after];
              return (
                <div
                  key={o.key}
                  className={`rounded-xl border p-3 text-center text-xs ${
                    active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-neutral-100 bg-neutral-50 text-neutral-500"
                  }`}
                >
                  <span className="text-lg">{o.icon}</span>
                  <p className="mt-1 font-semibold">{o.label}</p>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-neutral-600">{after.summary}</p>
          {!after.feedbackSubmitted ? (
            <p className="text-xs text-amber-700">
              Submit the feedback form below to sync your visit outcome with the CRM timeline.
            </p>
          ) : (
            <p className="text-xs text-emerald-700">✓ Feedback synced to CRM timeline and partner dashboard</p>
          )}
        </div>
      )}
    </div>
  );
}
