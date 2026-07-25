/**
 * Single source of truth for Legal Verification / Trust Layer compliance.
 * Used by Property Cards, Detail, Filters, and Admin — never hardcode thresholds.
 */

import { extractPropertyMeta } from "@/lib/properties/nearbyPlacesMeta";

export const LEGAL_VERIFICATION_FIELDS = [
  {
    key: "approved_building_plan",
    label: "Approved Building Plan",
    shortLabel: "Approved Building Plan",
    tooltipLabel: "Approved Building Plan",
  },
  {
    key: "rera_certificate",
    label: "RERA Registration Certificate",
    shortLabel: "RERA Certificate",
    tooltipLabel: "RERA Certificate",
  },
  {
    key: "title_deed_verified",
    label: "Title Deed Verified",
    shortLabel: "Title Deed",
    tooltipLabel: "Title Deed",
  },
  {
    key: "noc_verified",
    label: "No Objection Certificates (NOCs)",
    shortLabel: "NOC",
    tooltipLabel: "NOC",
  },
  {
    key: "completion_certificate",
    label: "Completion Certificate",
    shortLabel: "Completion Certificate",
    tooltipLabel: "Completion Certificate",
  },
  {
    key: "occupation_certificate",
    label: "Occupation Certificate",
    shortLabel: "Occupation Certificate",
    tooltipLabel: "Occupation Certificate",
  },
  {
    key: "environment_clearance",
    label: "Environmental Clearance",
    shortLabel: "Environmental Clearance",
    tooltipLabel: "Environmental Clearance",
  },
  {
    key: "fire_clearance",
    label: "Fire Safety Clearance",
    shortLabel: "Fire Clearance",
    tooltipLabel: "Fire Clearance",
  },
  {
    key: "bank_approved",
    label: "Bank Approved",
    shortLabel: "Bank Approved",
    tooltipLabel: "Bank Approved",
  },
  {
    key: "govt_layout_approved",
    label: "Government Layout Approved",
    shortLabel: "Government Layout",
    tooltipLabel: "Government Layout",
  },
] as const;

export type LegalVerificationKey = (typeof LEGAL_VERIFICATION_FIELDS)[number]["key"];

export type LegalVerificationFlags = Record<LegalVerificationKey, boolean>;

export type LegalComplianceLevel = "verified" | "partial" | "missing";

/** Thresholds — only defined here. */
export const LEGAL_COMPLIANCE_THRESHOLDS = {
  /** >= 90% → Verified */
  verifiedMinPercent: 90,
  /** >= 30% and < 90% → Partial */
  partialMinPercent: 30,
} as const;

export const LEGAL_TRUST_COLORS = {
  verified: { background: "#E8F8EC", text: "#1B8E3E", icon: "✓" },
  partial: { background: "#FFF7DB", text: "#B7791F", icon: "!" },
  missing: { background: "#FDECEC", text: "#C53030", icon: "✕" },
} as const;

export interface LegalComplianceItem {
  key: LegalVerificationKey;
  label: string;
  shortLabel: string;
  tooltipLabel: string;
  verified: boolean;
}

export interface LegalComplianceResult {
  verifiedCount: number;
  totalCount: number;
  compliancePercentage: number;
  level: LegalComplianceLevel;
  /** e.g. "Verified" */
  label: string;
  /** Card pill: "Documents Verified" */
  cardLabel: string;
  /** Admin: "100% Verified" */
  adminLabel: string;
  emoji: "🟢" | "🟡" | "🔴";
  icon: "✓" | "!" | "✕";
  colors: (typeof LEGAL_TRUST_COLORS)[LegalComplianceLevel];
  items: LegalComplianceItem[];
  flags: LegalVerificationFlags;
}

export function emptyLegalFlags(): LegalVerificationFlags {
  return {
    approved_building_plan: false,
    rera_certificate: false,
    title_deed_verified: false,
    noc_verified: false,
    completion_certificate: false,
    occupation_certificate: false,
    environment_clearance: false,
    fire_clearance: false,
    bank_approved: false,
    govt_layout_approved: false,
  };
}

export function pickLegalFlags(
  row: Partial<LegalVerificationFlags> | Record<string, unknown> | null | undefined,
): LegalVerificationFlags {
  const flags = emptyLegalFlags();
  if (!row || typeof row !== "object") return flags;
  for (const field of LEGAL_VERIFICATION_FIELDS) {
    flags[field.key] = Boolean((row as Record<string, unknown>)[field.key]);
  }
  return flags;
}

/** Resolve flags from dedicated columns OR nearby_places.meta — never OR-merge. */
export function resolveLegalFlagsFromProperty(row: {
  nearby_places?: unknown;
  approved_building_plan?: boolean | null;
  rera_certificate?: boolean | null;
  title_deed_verified?: boolean | null;
  noc_verified?: boolean | null;
  completion_certificate?: boolean | null;
  occupation_certificate?: boolean | null;
  environment_clearance?: boolean | null;
  fire_clearance?: boolean | null;
  bank_approved?: boolean | null;
  govt_layout_approved?: boolean | null;
} | null | undefined): LegalVerificationFlags {
  if (!row) return emptyLegalFlags();

  // Columns are SSOT when at least one dedicated field is present on the row
  // (migration applied / select includes them). Avoids OR-merge resurrecting OFF flags.
  const hasColumnData = LEGAL_VERIFICATION_FIELDS.some((field) => {
    const value = (row as Record<string, unknown>)[field.key];
    return typeof value === "boolean";
  });
  if (hasColumnData) {
    return pickLegalFlags(row);
  }

  const meta = extractPropertyMeta(row.nearby_places);
  if (meta?.legalVerification) {
    return pickLegalFlags(meta.legalVerification);
  }
  return emptyLegalFlags();
}

/**
 * Calculate legal compliance from verification flags.
 * Use this everywhere — Property Cards, Detail, Filters, Admin.
 */
export function calculateLegalCompliance(
  flagsInput: Partial<LegalVerificationFlags> | null | undefined,
): LegalComplianceResult {
  const flags = { ...emptyLegalFlags(), ...(flagsInput ?? {}) };
  const totalCount = LEGAL_VERIFICATION_FIELDS.length;
  const verifiedCount = LEGAL_VERIFICATION_FIELDS.reduce(
    (n, field) => n + (flags[field.key] ? 1 : 0),
    0,
  );
  const compliancePercentage = Math.round((verifiedCount / totalCount) * 100);

  let level: LegalComplianceLevel;
  if (compliancePercentage >= LEGAL_COMPLIANCE_THRESHOLDS.verifiedMinPercent) {
    level = "verified";
  } else if (compliancePercentage >= LEGAL_COMPLIANCE_THRESHOLDS.partialMinPercent) {
    level = "partial";
  } else {
    level = "missing";
  }

  const label =
    level === "verified" ? "Verified" : level === "partial" ? "Partial" : "Missing";
  const cardLabel =
    level === "verified"
      ? "Documents Verified"
      : level === "partial"
        ? "Documents Partial"
        : "Documents Missing";
  const emoji = level === "verified" ? "🟢" : level === "partial" ? "🟡" : "🔴";
  const colors = LEGAL_TRUST_COLORS[level];

  return {
    verifiedCount,
    totalCount,
    compliancePercentage,
    level,
    label,
    cardLabel,
    adminLabel: `${compliancePercentage}% ${label}`,
    emoji,
    icon: colors.icon,
    colors,
    items: LEGAL_VERIFICATION_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      shortLabel: field.shortLabel,
      tooltipLabel: field.tooltipLabel,
      verified: Boolean(flags[field.key]),
    })),
    flags,
  };
}

/** Convenience: resolve from a property row then calculate. */
export function calculateLegalComplianceFromProperty(
  row: Parameters<typeof resolveLegalFlagsFromProperty>[0],
): LegalComplianceResult {
  return calculateLegalCompliance(resolveLegalFlagsFromProperty(row));
}

export function matchesDocumentsComplianceFilter(
  compliance: LegalComplianceResult | LegalComplianceLevel | null | undefined,
  filter: "verified" | "partial" | "missing" | "verified_only" | null | undefined,
): boolean {
  if (!filter) return true;
  const level =
    typeof compliance === "string"
      ? compliance
      : compliance?.level ?? "missing";
  if (filter === "verified" || filter === "verified_only") return level === "verified";
  if (filter === "partial") return level === "partial";
  if (filter === "missing") return level === "missing";
  return true;
}
