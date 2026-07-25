"use client";

import {
  calculateLegalCompliance,
  type LegalVerificationFlags,
} from "@/lib/properties/legalCompliance";

interface Props {
  flags: Partial<LegalVerificationFlags> | null | undefined;
}

/** Admin list compliance pill: 🟢 100% Verified — with checklist tooltip. */
export default function LegalComplianceBadge({ flags }: Props) {
  const compliance = calculateLegalCompliance(flags);

  return (
    <div className="group relative inline-flex">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1"
        style={{
          backgroundColor: compliance.colors.background,
          color: compliance.colors.text,
          boxShadow: `inset 0 0 0 1px ${compliance.colors.text}22`,
        }}
      >
        <span aria-hidden>{compliance.emoji}</span>
        {compliance.adminLabel}
      </span>
      <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-56 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-lg group-hover:block">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Legal checklist
        </p>
        <ul className="space-y-1">
          {compliance.items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="text-body">{item.shortLabel}</span>
              <span
                className={
                  item.verified
                    ? "font-semibold text-emerald-600"
                    : "text-neutral-400"
                }
              >
                {item.verified ? "✓" : "—"}
              </span>
            </li>
          ))}
        </ul>
        <p
          className="mt-2 border-t border-neutral-100 pt-2 text-[11px] font-semibold"
          style={{ color: compliance.colors.text }}
        >
          {compliance.verifiedCount}/{compliance.totalCount} ·{" "}
          {compliance.compliancePercentage}% {compliance.label}
        </p>
      </div>
    </div>
  );
}
