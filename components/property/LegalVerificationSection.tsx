"use client";

import {
  calculateLegalCompliance,
  type LegalComplianceResult,
  type LegalVerificationFlags,
} from "@/lib/properties/legalCompliance";

interface Props {
  flags?: Partial<LegalVerificationFlags> | null;
  compliance?: LegalComplianceResult | null;
  className?: string;
}

/**
 * Read-only Legal Verification section for the public property detail page.
 * No admin controls.
 */
export default function LegalVerificationSection({
  flags,
  compliance: complianceProp,
  className = "",
}: Props) {
  const compliance =
    complianceProp ?? calculateLegalCompliance(flags ?? null);

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-label">
            Trust Layer
          </p>
          <h2 className="mt-1 text-lg font-bold text-heading-primary">
            Legal Verification
          </h2>
          <p className="mt-1 text-sm text-muted">
            Document checklist verified by AreaIQ admins.
          </p>
        </div>
        <div
          className="rounded-xl px-3 py-2 text-right"
          style={{
            backgroundColor: compliance.colors.background,
            color: compliance.colors.text,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
            Compliance
          </p>
          <p className="text-lg font-bold tabular-nums">
            {compliance.compliancePercentage}%
          </p>
          <p className="text-xs font-semibold">
            {compliance.emoji} {compliance.label}
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {compliance.items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
              item.verified
                ? "border-emerald-100 bg-emerald-50/60 text-emerald-900"
                : "border-neutral-100 bg-neutral-50 text-muted"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                item.verified
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-200 text-neutral-500"
              }`}
              aria-hidden
            >
              {item.verified ? "✔" : "✕"}
            </span>
            <span className="font-medium leading-snug">{item.shortLabel}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted">
        {compliance.verifiedCount} of {compliance.totalCount} documents verified
      </p>
    </section>
  );
}
