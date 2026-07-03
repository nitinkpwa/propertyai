"use client";

import { resolveDisplayName } from "@/lib/admin/profileDisplay";
import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";

interface BuyerProfileGridProps {
  buyer: BuyerProfileForCRM | null | undefined;
  /** compact = 2 cols, full = up to 4 cols */
  variant?: "compact" | "full";
  className?: string;
}

const FULL_FIELDS: Array<{ key: keyof BuyerProfileForCRM; label: string }> = [
  { key: "full_name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
  { key: "budgetLabel", label: "Budget" },
  { key: "purposeLabel", label: "Buying Purpose" },
  { key: "timelineLabel", label: "Timeline" },
  { key: "loanLabel", label: "Loan Status" },
  { key: "occupationLabel", label: "Occupation" },
  { key: "familySizeLabel", label: "Family Size" },
  { key: "locationsLabel", label: "Preferred Locations" },
  { key: "propertyTypesLabel", label: "Preferred Property Types" },
];

function displayValue(buyer: BuyerProfileForCRM, key: keyof BuyerProfileForCRM): string {
  if (key === "full_name") return resolveDisplayName(buyer);
  const value = buyer[key];
  if (value == null || value === "") return "";
  return String(value);
}

export default function BuyerProfileGrid({
  buyer,
  variant = "full",
  className = "",
}: BuyerProfileGridProps) {
  if (!buyer) return null;

  const fields =
    variant === "compact"
      ? FULL_FIELDS.filter((f) =>
          ["budgetLabel", "purposeLabel", "timelineLabel", "loanLabel"].includes(f.key),
        )
      : FULL_FIELDS;

  const gridClass =
    variant === "compact"
      ? "grid grid-cols-2 gap-3 sm:grid-cols-4"
      : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={`${gridClass} ${className}`}>
      {fields.map((field) => {
        const value = displayValue(buyer, field.key);
        if (variant === "compact" && !value) return null;
        return (
          <div key={field.key} className="rounded-xl bg-neutral-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {field.label}
            </p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-neutral-800">
              {value || "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Inline contact line for visit / list rows */
export function BuyerContactLine({
  buyer,
}: {
  buyer: BuyerProfileForCRM | null | undefined;
}) {
  if (!buyer) return null;
  const displayName = resolveDisplayName(buyer);
  return (
    <div className="space-y-0.5 text-xs text-neutral-600">
      {displayName ? (
        <p className="text-sm font-semibold text-neutral-900">{displayName}</p>
      ) : null}
      {buyer.phone ? <p>📞 {buyer.phone}</p> : null}
      {buyer.email ? <p>✉ {buyer.email}</p> : null}
      {buyer.budgetLabel ? <p>Budget: {buyer.budgetLabel}</p> : null}
      {buyer.purposeLabel ? <p>Purpose: {buyer.purposeLabel}</p> : null}
      {buyer.timelineLabel ? <p>Timeline: {buyer.timelineLabel}</p> : null}
      {buyer.loanLabel ? <p>Loan: {buyer.loanLabel}</p> : null}
      {buyer.city ? <p>City: {buyer.city}</p> : null}
      {buyer.locationsLabel ? <p>Locations: {buyer.locationsLabel}</p> : null}
    </div>
  );
}
