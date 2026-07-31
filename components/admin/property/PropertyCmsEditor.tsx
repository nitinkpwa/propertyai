"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AI_AGENT_LABELS } from "@/lib/admin/property/intelligence/types";
import { CMS_SECTIONS } from "@/lib/admin/property/constants";
import { adminRowToForm, syncLegacyFormFields } from "@/lib/admin/property/mappers";
import {
  saveAdminProperty,
  savePropertyIntelligence,
  fetchAdminPropertyById,
  uploadAdminPropertyPhoto,
} from "@/lib/admin/property/saveProperty";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";
import type { WizardStepId } from "@/lib/admin/property/types";
import ConnectAssignmentCenter from "./ConnectAssignmentCenter";
import PropertyLivePreview from "./PropertyLivePreview";
import ScoreBreakdownCard from "./ScoreBreakdownCard";
import WizardStepContent from "./wizard/WizardStepContent";

interface Props {
  propertyId: string;
  adminUserId: string;
  adminDisplayName?: string | null;
  onBack: () => void;
}

const SECTION_TO_STEP: Record<string, WizardStepId> = {
  info: "basic",
  location: "location",
  pricing: "pricing",
  specs: "specs",
  amenities: "amenities",
  media: "media",
  documents: "documents",
  connect: "connect",
  publishing: "publishing",
  ai: "basic",
  scoring: "basic",
};

export default function PropertyCmsEditor({
  propertyId,
  adminUserId,
  adminDisplayName,
  onBack,
}: Props) {
  const [form, setFormState] = useState<AdminPropertyFormState | null>(null);
  const [section, setSection] = useState<(typeof CMS_SECTIONS)[number]["id"]>("info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const stepId = SECTION_TO_STEP[section] ?? "basic";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await fetchAdminPropertyById(propertyId);
        if (cancelled || !row) return;
        setFormState(syncLegacyFormFields(adminRowToForm(row)));
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Failed to load property");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const setForm = useCallback((next: AdminPropertyFormState) => {
    setFormState(syncLegacyFormFields(next));
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const result = await saveAdminProperty(form, adminUserId, propertyId);
    setSaving(false);
    if (result.ok) {
      const row = await fetchAdminPropertyById(propertyId);
      if (row) setFormState(syncLegacyFormFields(adminRowToForm(row)));
    }
    setMessage(result.ok ? "✅ Saved" : `Error: ${result.error}`);
  };

  const handleRegenerateAi = async () => {
    if (!form) return;
    setRegenerating(true);
    const result = await savePropertyIntelligence(form, propertyId);
    setRegenerating(false);
    if (result.ok) {
      const row = await fetchAdminPropertyById(propertyId);
      if (row) setFormState(syncLegacyFormFields(adminRowToForm(row)));
    }
    setMessage(result.ok ? "✅ AI intelligence regenerated" : `Error: ${result.error}`);
  };

  const handleUploadPhotos = async (files: FileList) => {
    if (!form) return;
    setUploadingPhotos(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 8 - form.photos.length)) {
      const url = await uploadAdminPropertyPhoto(file, adminUserId);
      if (url) uploaded.push(url);
    }
    if (uploaded.length) {
      setForm({ ...form, photos: [...form.photos, ...uploaded] });
    }
    setUploadingPhotos(false);
  };

  const ai = form?.aiIntelligence;
  const compiledEntries = useMemo(
    () => (ai?.compiled ? Object.entries(ai.compiled).filter(([, v]) => v.trim()) : []),
    [ai],
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (!form) {
    return <p className="text-sm text-red-600">{message || "Property not found"}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="text-xs font-medium text-label hover:text-heading-secondary">
            ← Back to properties
          </button>
          <h1 className="mt-1 text-2xl font-bold text-heading-primary">{form.title || "Property CMS"}</h1>
          <p className="text-sm text-muted">Humans collect facts · AI creates intelligence</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/property/${propertyId}`} target="_blank" className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-body hover:bg-neutral-50">
            Open public page ↗
          </Link>
          <button type="button" disabled={saving} onClick={() => void handleSave()} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : "Save ⌘S"}
          </button>
        </div>
      </div>

      {message ? (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.includes("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</div>
      ) : null}

      <div className="grid w-full max-w-none gap-6 xl:grid-cols-[240px_minmax(0,1fr)_minmax(300px,26%)] 2xl:grid-cols-[260px_minmax(0,1fr)_380px]">
        <aside className="space-y-1 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
          {CMS_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                section === s.id ? "bg-emerald-50 font-semibold text-emerald-800" : "text-body hover:bg-neutral-50"
              }`}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </aside>

        <main className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          {section === "connect" ? (
            <ConnectAssignmentCenter form={form} setForm={setForm} />
          ) : section === "scoring" ? (
            <ScoreBreakdownCard
              form={form}
              propertyId={propertyId}
              adminUserId={adminUserId}
            />
          ) : section === "ai" ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-heading-primary">AI Intelligence</h3>
                  <p className="text-sm text-muted">Read-only outputs generated from property facts.</p>
                </div>
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={() => void handleRegenerateAi()}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                >
                  {regenerating ? "Regenerating…" : "Regenerate AI"}
                </button>
              </div>
              {ai ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] text-muted">Generated</p><p className="text-sm font-semibold">{ai.generatedAt ? new Date(ai.generatedAt).toLocaleString("en-IN") : "—"}</p></div>
                  <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] text-muted">AI Version</p><p className="text-sm font-semibold">{ai.pipelineVersion}</p></div>
                  <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] text-muted">Confidence</p><p className="text-sm font-semibold">{ai.confidence}%</p></div>
                  <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] text-muted">Last Updated</p><p className="text-sm font-semibold">{ai.lastUpdated ? new Date(ai.lastUpdated).toLocaleString("en-IN") : "—"}</p></div>
                </div>
              ) : (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Save the property to generate AI intelligence.</p>
              )}
              {compiledEntries.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {compiledEntries.map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-neutral-100 bg-gradient-to-br from-white to-emerald-50/30 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{key.replace(/([A-Z])/g, " $1")}</p>
                      <p className="mt-2 text-sm leading-relaxed text-body">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {ai?.agents ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-label">Agent outputs</p>
                  <div className="space-y-2">
                    {Object.entries(ai.agents).map(([id, agent]) => (
                      <div key={id} className="rounded-lg border border-neutral-100 px-3 py-2 text-sm">
                        <span className="font-semibold text-heading-secondary">{AI_AGENT_LABELS[id as keyof typeof AI_AGENT_LABELS] ?? id}</span>
                        <span className="ml-2 text-xs text-muted">{agent?.confidence ?? 0}% confidence</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <WizardStepContent
              step={stepId}
              form={form}
              setForm={setForm}
              onUploadPhotos={handleUploadPhotos}
              uploadingPhotos={uploadingPhotos}
              propertyId={propertyId}
              adminUserId={adminUserId}
              adminDisplayName={adminDisplayName}
            />
          )}
        </main>

        <div className="min-h-[600px] xl:sticky xl:top-4 xl:self-start">
          <PropertyLivePreview form={form} propertyId={propertyId} />
        </div>
      </div>
    </div>
  );
}
