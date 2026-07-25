"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  calculateLegalCompliance,
  type LegalComplianceResult,
  type LegalVerificationFlags,
} from "@/lib/properties/legalCompliance";

interface LegalTrustBadgeProps {
  flags?: Partial<LegalVerificationFlags> | null;
  /** Precomputed — preferred to avoid recalculation. */
  compliance?: LegalComplianceResult | null;
  className?: string;
  /** Compact for mobile image overlay */
  size?: "sm" | "md";
}

/**
 * Trust Layer badge — Documents Verified / Partial / Missing.
 * Hover (desktop) or tap (mobile) opens the legal checklist tooltip.
 */
export default function LegalTrustBadge({
  flags,
  compliance: complianceProp,
  className = "",
  size = "md",
}: LegalTrustBadgeProps) {
  const compliance =
    complianceProp ?? calculateLegalCompliance(flags ?? null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={tooltipId}
        aria-label={`${compliance.cardLabel}, ${compliance.compliancePercentage}% compliance`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`pointer-events-auto inline-flex items-center gap-1 rounded-full font-semibold tracking-wide shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md transition ${pad}`}
        style={{
          backgroundColor: compliance.colors.background,
          color: compliance.colors.text,
        }}
      >
        <span aria-hidden className="font-bold">
          {compliance.icon}
        </span>
        {compliance.cardLabel}
      </button>

      <div
        id={tooltipId}
        role="tooltip"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`absolute left-0 top-full z-40 mt-2 w-[min(100vw-2rem,17.5rem)] rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-lg transition ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Legal Compliance
        </p>
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
          {compliance.items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="text-body">{item.tooltipLabel}</span>
              <span
                className={`font-bold ${
                  item.verified ? "text-emerald-600" : "text-rose-500"
                }`}
                aria-label={item.verified ? "Verified" : "Missing"}
              >
                {item.verified ? "✔" : "✕"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2">
          <p className="text-[11px] font-semibold text-heading-secondary">
            Compliance
          </p>
          <p
            className="text-[11px] font-bold"
            style={{ color: compliance.colors.text }}
          >
            {compliance.compliancePercentage}% · {compliance.label}
          </p>
        </div>
      </div>
    </div>
  );
}
