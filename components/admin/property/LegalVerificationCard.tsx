"use client";

import { useCallback, useState } from "react";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";
import {
  LEGAL_VERIFICATION_FIELDS,
  calculateLegalCompliance,
  type LegalVerificationKey,
  type LegalVerificationState,
} from "@/lib/admin/property/legalVerification";
import { saveLegalVerificationFlags } from "@/lib/admin/property/saveProperty";
import { IosSwitch } from "./ui/FormPrimitives";

interface Props {
  form: AdminPropertyFormState;
  setForm: (form: AdminPropertyFormState) => void;
  /** When set, toggles auto-save to Supabase immediately. */
  propertyId?: string | null;
  adminUserId?: string | null;
  adminDisplayName?: string | null;
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Admin-only Legal Verification card.
 * Internal moderation — never shown on buyer/public pages.
 * Persists via dual-write (DB columns + nearby_places.meta).
 */
export default function LegalVerificationCard({
  form,
  setForm,
  propertyId,
  adminUserId,
  adminDisplayName,
}: Props) {
  const [savingKey, setSavingKey] = useState<LegalVerificationKey | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const compliance = calculateLegalCompliance(form.legal);

  const handleToggle = useCallback(
    async (key: LegalVerificationKey, next: boolean) => {
      const previous = form.legal;
      const nextLegal: LegalVerificationState = {
        ...previous,
        [key]: next,
        legal_verification_updated_at: new Date().toISOString(),
        legal_verification_updated_by: adminUserId ?? previous.legal_verification_updated_by,
        legal_verification_updated_by_name:
          adminDisplayName ?? previous.legal_verification_updated_by_name,
      };

      // Optimistic UI
      setForm({ ...form, legal: nextLegal });

      // New properties: flags ride along with Publish / Save
      if (!propertyId || !adminUserId) {
        setStatus("Will save when property is published");
        return;
      }

      setSavingKey(key);
      setStatus("Saving…");
      const result = await saveLegalVerificationFlags(propertyId, nextLegal, adminUserId);
      setSavingKey(null);

      if (!result.ok) {
        setForm({ ...form, legal: previous });
        setStatus(result.error ? `Error: ${result.error}` : "Couldn't save — try again");
        return;
      }

      setStatus("Saved to database");
      window.setTimeout(() => setStatus(null), 2500);
    },
    [form, setForm, propertyId, adminUserId, adminDisplayName],
  );

  return (
    <section className="mt-8 rounded-2xl border border-neutral-200 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-label">
            Admin only
          </p>
          <h3 className="mt-1 text-lg font-bold text-heading-primary">
            🏛 Legal Verification
          </h3>
          <p className="mt-1 text-sm text-muted">
            Checklist toggles are admin-only. Public cards show the resulting Trust status.
          </p>
        </div>
        <div
          className="rounded-xl border px-3 py-2 text-right"
          style={{
            backgroundColor: compliance.colors.background,
            color: compliance.colors.text,
            borderColor: `${compliance.colors.text}33`,
          }}
        >
          <p className="text-[11px] font-medium opacity-80">Compliance</p>
          <p className="text-sm font-semibold">
            {compliance.emoji} {compliance.adminLabel}
          </p>
          <p className="text-[11px] tabular-nums opacity-80">
            {compliance.verifiedCount}/{compliance.totalCount} documents
          </p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        {LEGAL_VERIFICATION_FIELDS.map((field) => {
          const checked = Boolean(form.legal?.[field.key]);
          const busy = savingKey === field.key;
          return (
            <li
              key={field.key}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-heading-secondary">{field.label}</p>
                {busy ? (
                  <p className="text-[11px] text-emerald-600">Saving…</p>
                ) : null}
              </div>
              <IosSwitch
                checked={checked}
                disabled={busy}
                label={field.label}
                onChange={(v) => void handleToggle(field.key, v)}
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-neutral-100 pt-4">
        <div className="space-y-1 text-xs text-muted">
          <p>
            <span className="font-semibold text-label">Last Updated:</span>{" "}
            {formatUpdatedAt(form.legal?.legal_verification_updated_at ?? null)}
          </p>
          <p>
            <span className="font-semibold text-label">Updated By:</span>{" "}
            {form.legal?.legal_verification_updated_by_name ||
              (form.legal?.legal_verification_updated_by
                ? `Admin ${form.legal.legal_verification_updated_by.slice(0, 8)}`
                : "—")}
          </p>
          <p>
            <span className="font-semibold text-label">Timestamp:</span>{" "}
            {form.legal?.legal_verification_updated_at
              ? new Date(form.legal.legal_verification_updated_at).toISOString()
              : "—"}
          </p>
        </div>
        <p
          className={`text-[11px] font-medium ${
            status?.startsWith("Error") ? "text-rose-600" : "text-emerald-700"
          }`}
        >
          {status
            ? status
            : propertyId
              ? "Auto-saves on toggle"
              : "Will save when property is published"}
        </p>
      </div>
    </section>
  );
}
