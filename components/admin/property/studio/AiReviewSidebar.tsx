"use client";

import type { PropertyImportResult } from "@/lib/admin/property/studio/types";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";

interface Props {
  form: AdminPropertyFormState;
  result: PropertyImportResult;
  generatedCopy: { title: string; content: string } | null;
  duplicateHint?: string | null;
}

export default function AiReviewSidebar({ form, result, generatedCopy, duplicateHint }: Props) {
  const docCount =
    [form.documents.brochure, form.documents.masterPlan, form.documents.pdf]
      .filter(Boolean).length + form.documents.floorPlans.length;

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-md">
        <h3 className="text-sm font-bold text-heading-primary">AI Summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-body">{result.summary}</p>
        {form.aiIntelligence?.confidence ? (
          <p className="mt-3 text-xs font-semibold text-emerald-600">
            Pipeline confidence {form.aiIntelligence.confidence}%
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-md">
        <h3 className="text-sm font-bold text-heading-primary">Review checklist</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between gap-2">
            <span className="text-muted">Brain facts</span>
            <span className="font-semibold text-heading-primary">
              {(form.importKnowledge?.brainFacts || result.brainFacts || []).length}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-muted">Photos</span>
            <span className="font-semibold text-heading-primary">{form.photos.length}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-muted">Documents</span>
            <span className="font-semibold text-heading-primary">{docCount}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-muted">Required missing</span>
            <span className="font-semibold text-heading-primary">
              {result.missingRequired.length || "None"}
            </span>
          </li>
        </ul>
      </div>

      {result.missingRequired.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
          <h3 className="text-sm font-bold text-amber-900">Missing required</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
            {result.missingRequired.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.warnings.length > 0 ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
          <h3 className="text-sm font-bold text-rose-900">Warnings</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-rose-800">
            {result.warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.lowConfidenceFields.length > 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4">
          <h3 className="text-sm font-bold text-heading-primary">Low confidence</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-body">
            {result.lowConfidenceFields.map((f) => (
              <li key={f.path} className="flex justify-between gap-2">
                <span>{f.label}</span>
                <span className="font-semibold text-rose-600">{f.confidence}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {duplicateHint ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900">
          <span className="font-bold">Possible duplicate: </span>
          {duplicateHint}
        </div>
      ) : null}

      {generatedCopy ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <h3 className="text-sm font-bold text-emerald-900">{generatedCopy.title}</h3>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-body">
            {generatedCopy.content}
          </pre>
        </div>
      ) : null}
    </aside>
  );
}
