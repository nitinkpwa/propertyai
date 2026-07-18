"use client";

import type { GenerateAction } from "@/lib/admin/property/studio/types";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";

const ACTIONS: Array<{ action: GenerateAction; label: string }> = [
  { action: "improve_description", label: "Improve Description" },
  { action: "rewrite_seo", label: "Rewrite SEO" },
  { action: "social_caption", label: "Social Caption" },
  { action: "whatsapp_ad", label: "WhatsApp Ad" },
  { action: "facebook_ad", label: "Facebook Ad" },
  { action: "google_ad", label: "Google Ad" },
  { action: "reel_script", label: "Reel Script" },
  { action: "video_narration", label: "Video Narration" },
];

interface Props {
  form: AdminPropertyFormState;
  busyAction: GenerateAction | null;
  onGenerate: (action: GenerateAction) => void;
  onApprove: () => void;
  onReject: () => void;
  onEditManual: () => void;
  saving?: boolean;
}

export default function MasterReviewActions({
  form: _form,
  busyAction,
  onGenerate,
  onApprove,
  onReject,
  onEditManual,
  saving,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onApprove}
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Approve"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onEditManual}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-body hover:bg-neutral-50"
        >
          Edit in Manual
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onReject}
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        >
          Reject
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Master Review · Generate
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map(({ action, label }) => (
            <button
              key={action}
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => onGenerate(action)}
              className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              {busyAction === action ? "Generating…" : label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
