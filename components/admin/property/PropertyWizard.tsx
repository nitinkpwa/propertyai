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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Property Command Center</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            {editId ? "Edit Property" : "Create Property"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Step {stepIndex + 1} of {WIZARD_STEPS.length} · {step.title}
            {lastSaved ? ` · Autosaved ${lastSaved}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={undo} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50">
            Undo ⌘Z
          </button>
          <button type="button" onClick={() => void handleSave(true)} disabled={saving} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
            Save Draft
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600">
            Cancel
          </button>
        </div>
      </div>

      {message ? (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.includes("✅") ? "bg-emerald-50 text-emerald-700" : message.includes("Error") ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
          {message}
        </div>
      ) : null}

      <div className="overflow-x-auto pb-2">
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
                <span className="block text-xs font-bold text-neutral-900">{s.title}</span>
                <span className="block text-[10px] text-neutral-500">{s.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? "xl:grid-cols-[1fr_420px]" : ""}`}>
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6">
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

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-6">
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
    </div>
  );
}
