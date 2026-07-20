"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WIZARD_STEPS } from "@/lib/admin/property/constants";
import { saveDraftToLocal, loadDraftFromLocal, clearDraftFromLocal } from "@/lib/admin/property/autosave";
import { syncLegacyFormFields } from "@/lib/admin/property/mappers";
import { saveAdminProperty, uploadAdminPropertyPhoto } from "@/lib/admin/property/saveProperty";
import { createEmptyAdminPropertyForm, type AdminPropertyFormState, type WizardStepId } from "@/lib/admin/property/types";
import PropertyLivePreview from "./PropertyLivePreview";
import WizardStepContent from "./wizard/WizardStepContent";

interface Props {
  adminUserId: string;
  editId: string | null;
  initialForm?: AdminPropertyFormState;
  onSaved: (propertyId: string) => void;
  onCancel: () => void;
  showPreview?: boolean;
}

export default function PropertyWizard({
  adminUserId,
  editId,
  initialForm,
  onSaved,
  onCancel,
  showPreview = true,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setFormState] = useState<AdminPropertyFormState>(
    () => initialForm ?? createEmptyAdminPropertyForm(),
  );
  const [history, setHistory] = useState<AdminPropertyFormState[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [message, setMessage] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = WIZARD_STEPS[stepIndex];
  const stepId = step.id as WizardStepId;

  const setForm = useCallback((next: AdminPropertyFormState) => {
    setHistory((prev) => [...prev.slice(-19), form]);
    setFormState(syncLegacyFormFields(next));
  }, [form]);

  useEffect(() => {
    const draft = loadDraftFromLocal(editId);
    if (draft && !initialForm) {
      setFormState(syncLegacyFormFields(draft));
      setMessage("Draft recovered from local storage");
    }
  }, [editId, initialForm]);

  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveDraftToLocal(form, editId);
      setLastSaved(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    }, 2000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [form, editId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const undo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFormState(previous);
      return prev.slice(0, -1);
    });
  };

  const validateStep = (): boolean => {
    if (stepId === "basic" && (!form.title || !form.contact_phone)) {
      setMessage("Title and contact phone are required");
      return false;
    }
    if (stepId === "location" && !form.location) {
      setMessage("Location address is required");
      return false;
    }
    if (stepId === "pricing" && !form.price && !form.pricing.currentPrice) {
      setMessage("Price is required");
      return false;
    }
    setMessage("");
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStepIndex((i) => Math.min(WIZARD_STEPS.length - 1, i + 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const handleUploadPhotos = async (files: FileList) => {
    setUploadingPhotos(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 8 - form.photos.length)) {
      const url = await uploadAdminPropertyPhoto(file, adminUserId);
      if (url) uploaded.push(url);
    }
    if (uploaded.length) {
      setForm({ ...form, photos: [...form.photos, ...uploaded], featured_image: form.featured_image || uploaded[0] });
    }
    setUploadingPhotos(false);
  };

  const handleSave = async (asDraft = false) => {
    if (!form.title) {
      setMessage("Property title is required");
      return;
    }
    setSaving(true);
    setMessage("");
    const payload = asDraft
      ? { ...form, publishing: { ...form.publishing, workflowStatus: "draft" } }
      : form;
    const result = await saveAdminProperty(payload, adminUserId, editId);
    setSaving(false);
    if (!result.ok) {
      setMessage(`Error: ${result.error}`);
      return;
    }
    clearDraftFromLocal(editId);
    setMessage(asDraft ? "✅ Draft saved" : "✅ Property saved");
    if (result.propertyId) onSaved(result.propertyId);
  };

  return (
    <div className="space-y-5 pb-24 lg:space-y-6 lg:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            AreaIQ AI Property Studio · Manual
          </p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-heading-primary lg:text-2xl">
            {editId ? "Edit Property" : "Manual Entry"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Step {stepIndex + 1} of {WIZARD_STEPS.length} · {step.title}
            {lastSaved ? ` · Autosaved ${lastSaved}` : ""}
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          <button type="button" onClick={undo} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-body hover:bg-neutral-50">
            Undo ⌘Z
          </button>
          <button type="button" onClick={() => void handleSave(true)} disabled={saving} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-body hover:bg-neutral-50">
            Save Draft
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-body">
            Cancel
          </button>
        </div>
      </div>

      {/* Mobile progress dots */}
      <div className="flex items-center gap-1.5 lg:hidden" aria-label="Wizard progress">
        {WIZARD_STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStepIndex(i)}
            className={`h-2 flex-1 rounded-full transition-all ${
              i === stepIndex ? "bg-brand" : i < stepIndex ? "bg-brand/40" : "bg-neutral-200"
            }`}
            aria-label={s.title}
            aria-current={i === stepIndex ? "step" : undefined}
          />
        ))}
      </div>

      {message ? (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.includes("✅") ? "bg-emerald-50 text-emerald-700" : message.includes("Error") ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
          {message}
        </div>
      ) : null}

      <div className="hidden overflow-x-auto pb-2 lg:block">
        <div className="flex min-w-max gap-2">
          {WIZARD_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIndex(i)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                i === stepIndex
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : i < stepIndex
                    ? "border-emerald-200 bg-white"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <span className="text-base">{s.icon}</span>
              <span>
                <span className="block text-xs font-bold text-heading-primary">{s.title}</span>
                <span className="block text-xs text-muted">{s.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? "xl:grid-cols-[1fr_420px]" : ""}`}>
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-6">
          <p className="mb-4 text-lg font-semibold text-heading-primary lg:hidden">
            {step.icon} {step.title}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={stepId}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <WizardStepContent
                step={stepId}
                form={form}
                setForm={setForm}
                onUploadPhotos={handleUploadPhotos}
                uploadingPhotos={uploadingPhotos}
              />
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 hidden flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-6 lg:flex">
            <button type="button" onClick={goBack} disabled={stepIndex === 0} className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium disabled:opacity-40">
              ← Back
            </button>
            <div className="flex gap-2">
              {stepIndex < WIZARD_STEPS.length - 1 ? (
                <button type="button" onClick={goNext} className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">
                  Continue →
                </button>
              ) : (
                <button type="button" disabled={saving} onClick={() => void handleSave(false)} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                  {saving ? "Publishing..." : editId ? "Save & Publish" : "Publish Property"}
                </button>
              )}
            </div>
          </div>
        </div>

        {showPreview ? (
          <div className="hidden xl:block">
            <PropertyLivePreview form={form} propertyId={editId ?? undefined} />
          </div>
        ) : null}
      </div>

      {/* Floating Next — mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-neutral-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-neutral-200 text-base font-semibold disabled:opacity-40"
        >
          Back
        </button>
        {stepIndex < WIZARD_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-12 flex-[1.4] items-center justify-center rounded-xl bg-brand text-base font-semibold text-white shadow-[0_2px_8px_var(--brand-shadow)]"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave(false)}
            className="inline-flex min-h-12 flex-[1.4] items-center justify-center rounded-xl bg-brand text-base font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Publishing…" : "Publish"}
          </button>
        )}
      </div>
    </div>
  );
}
