"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { saveAdminProperty } from "@/lib/admin/property/saveProperty";
import {
  AI_PIPELINE_STEPS,
  type GenerateAction,
  type PropertyImportResult,
  type StudioMode,
  type StudioStage,
} from "@/lib/admin/property/studio/types";
import {
  createEmptyAdminPropertyForm,
  type AdminPropertyFormState,
} from "@/lib/admin/property/types";
import PropertyWizard from "../PropertyWizard";
import AiImportWorkspace, { type AiImportPayload } from "./AiImportWorkspace";
import AiPipelineProgress from "./AiPipelineProgress";
import AiReviewScreen from "./AiReviewScreen";

interface Props {
  adminUserId: string;
  adminDisplayName?: string | null;
  editId: string | null;
  initialForm?: AdminPropertyFormState;
  /** Optional titles from property list for duplicate hints */
  existingTitles?: Array<{ title: string; builder?: string; city?: string }>;
  onSaved: (propertyId: string) => void;
  onCancel: () => void;
}

export default function PropertyStudio({
  adminUserId,
  adminDisplayName,
  editId,
  initialForm,
  existingTitles = [],
  onSaved,
  onCancel,
}: Props) {
  const isEditing = Boolean(editId && initialForm);
  const [mode, setMode] = useState<StudioMode>(isEditing ? "manual" : "ai_import");
  const [stage, setStage] = useState<StudioStage>("import");
  const [form, setForm] = useState<AdminPropertyFormState>(
    () => initialForm ?? createEmptyAdminPropertyForm(),
  );
  const [importResult, setImportResult] = useState<PropertyImportResult | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressDone, setProgressDone] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<GenerateAction | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState<{ title: string; content: string } | null>(
    null,
  );
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const clearProgressTimer = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const startProgressAnimation = () => {
    clearProgressTimer();
    setProgressIndex(0);
    setProgressDone(false);
    progressTimer.current = setInterval(() => {
      setProgressIndex((i) => {
        if (i >= AI_PIPELINE_STEPS.length - 2) return i;
        return i + 1;
      });
    }, 700);
  };

  const finishProgress = useCallback((result: PropertyImportResult) => {
    clearProgressTimer();
    setProgressIndex(AI_PIPELINE_STEPS.length - 1);
    setProgressDone(true);
    setForm(result.form);
    setImportResult(result);
    setTimeout(() => {
      setStage("review");
      setGenerating(false);
    }, 550);
  }, []);

  const handleGenerate = async (payload: AiImportPayload) => {
    setGenerating(true);
    setMessage("");
    setStage("progress");
    startProgressAnimation();

    try {
      const res = await fetch("/api/admin/properties/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappText: payload.whatsappText,
          images: payload.images,
          documents: payload.documents,
          googleMapsUrl: payload.googleMapsUrl,
          lat: payload.lat,
          lng: payload.lng,
          source: "whatsapp",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        clearProgressTimer();
        setGenerating(false);
        setStage("import");
        setMessage(`Error: ${data.error || "Import failed"}`);
        return;
      }
      finishProgress(data as PropertyImportResult);
    } catch (err) {
      clearProgressTimer();
      setGenerating(false);
      setStage("import");
      setMessage(`Error: ${err instanceof Error ? err.message : "Import failed"}`);
    }
  };

  const duplicateHint = (() => {
    if (!form.title) return null;
    const hit = existingTitles.find((p) => {
      const sameTitle = p.title.trim().toLowerCase() === form.title.trim().toLowerCase();
      const sameBuilder =
        !form.builder_name ||
        !p.builder ||
        p.builder.trim().toLowerCase() === form.builder_name.trim().toLowerCase();
      const sameCity =
        !form.city || !p.city || p.city.trim().toLowerCase() === form.city.trim().toLowerCase();
      return sameTitle && sameBuilder && sameCity;
    });
    return hit ? `"${hit.title}" already exists in inventory.` : null;
  })();

  const handleApprove = async () => {
    if (!form.title) {
      setMessage("Title is required before approve");
      return;
    }
    setSaving(true);
    setMessage("");
    const payload: AdminPropertyFormState = {
      ...form,
      publishing: { ...form.publishing, workflowStatus: "review" },
      status: "paused",
    };
    const result = await saveAdminProperty(payload, adminUserId, editId);
    setSaving(false);
    if (!result.ok) {
      setMessage(`Error: ${result.error}`);
      return;
    }
    setMessage("✅ Listing saved for review");
    if (result.propertyId) onSaved(result.propertyId);
  };

  const handleReject = () => {
    setImportResult(null);
    setForm(createEmptyAdminPropertyForm());
    setGeneratedCopy(null);
    setMessage("");
    setStage("import");
    setMode("ai_import");
  };

  const handleEditManual = () => {
    setMode("manual");
  };

  const handleGenerateCopy = async (action: GenerateAction) => {
    setBusyAction(action);
    try {
      const res = await fetch("/api/admin/properties/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${data.error || "Generate failed"}`);
      } else {
        setGeneratedCopy({ title: data.title, content: data.content });
        if (action === "improve_description" && data.content) {
          // Store improved copy into AI compiled summary for later CMS use
          setForm((prev) => ({
            ...prev,
            aiIntelligence: prev.aiIntelligence
              ? {
                  ...prev.aiIntelligence,
                  compiled: {
                    ...prev.aiIntelligence.compiled,
                    propertySummary: data.content,
                    buyerSummary: data.content,
                  },
                }
              : prev.aiIntelligence,
          }));
        }
        if (action === "rewrite_seo" && data.content) {
          const slugLine = String(data.content).match(/keywords:\s*(.+)/i)?.[1];
          if (slugLine) {
            setForm((prev) => ({
              ...prev,
              seo: { ...prev.seo, slug: prev.seo.slug || prev.title.toLowerCase().replace(/\s+/g, "-") },
              aiIntelligence: prev.aiIntelligence
                ? {
                    ...prev.aiIntelligence,
                    compiled: {
                      ...prev.aiIntelligence.compiled,
                      metaDescription: data.content,
                      keywords: slugLine,
                    },
                  }
                : prev.aiIntelligence,
            }));
          }
        }
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : "Generate failed"}`);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="w-full max-w-none space-y-5 lg:space-y-6">
      {/* Mode switch + step chrome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex w-full rounded-2xl border border-neutral-200 bg-white/90 p-1 shadow-sm backdrop-blur sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setMode("ai_import");
              if (!importResult) setStage("import");
              else setStage("review");
            }}
            className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold transition sm:flex-none sm:py-2 ${
              mode === "ai_import"
                ? "bg-brand text-white shadow-sm"
                : "text-body hover:bg-neutral-50"
            }`}
          >
            AI Import
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold transition sm:flex-none sm:py-2 ${
              mode === "manual"
                ? "bg-brand text-white shadow-sm"
                : "text-body hover:bg-neutral-50"
            }`}
          >
            Manual Entry
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="hidden min-h-11 rounded-xl border border-neutral-200 px-3 text-sm font-medium text-body hover:bg-neutral-50 sm:inline-flex sm:items-center"
        >
          Cancel
        </button>
      </div>

      {mode === "ai_import" ? (
        <div className="flex items-center gap-2 lg:hidden" aria-label="AI import steps">
          {(["import", "progress", "review"] as const).map((s, i) => {
            const active =
              stage === s ||
              (stage === "progress" && s === "progress") ||
              (stage === "review" && i <= 2 && s !== "import");
            const done =
              (stage === "progress" && s === "import") ||
              (stage === "review" && s !== "review");
            return (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${
                  stage === s ? "bg-brand" : done ? "bg-brand/40" : "bg-neutral-200"
                } ${active && stage === s ? "ring-2 ring-brand/20" : ""}`}
              />
            );
          })}
        </div>
      ) : null}

      {message && mode === "ai_import" && stage === "import" ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.includes("Error") ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"
          }`}
        >
          {message}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {mode === "manual" ? (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <PropertyWizard
              adminUserId={adminUserId}
              adminDisplayName={adminDisplayName}
              editId={editId}
              initialForm={form}
              onSaved={onSaved}
              onCancel={onCancel}
            />
          </motion.div>
        ) : stage === "progress" ? (
          <motion.div
            key="progress"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="py-10"
          >
            <AiPipelineProgress activeIndex={progressIndex} completed={progressDone} />
          </motion.div>
        ) : stage === "review" && importResult ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AiReviewScreen
              form={form}
              result={importResult}
              onChange={setForm}
              onApprove={() => void handleApprove()}
              onReject={handleReject}
              onEditManual={handleEditManual}
              onGenerate={(a) => void handleGenerateCopy(a)}
              busyAction={busyAction}
              generatedCopy={generatedCopy}
              saving={saving}
              duplicateHint={duplicateHint}
              message={message}
            />
          </motion.div>
        ) : (
          <motion.div
            key="import"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AiImportWorkspace
              adminUserId={adminUserId}
              onGenerate={(p) => void handleGenerate(p)}
              generating={generating}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
