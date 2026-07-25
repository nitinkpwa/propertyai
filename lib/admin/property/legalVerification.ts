/**
 * Admin legal verification persistence helpers.
 * Compliance calculation lives in `@/lib/properties/legalCompliance` — import from there for UI.
 */

import { extractPropertyMeta } from "@/lib/properties/nearbyPlacesMeta";
import {
  LEGAL_VERIFICATION_FIELDS,
  calculateLegalCompliance,
  emptyLegalFlags,
  pickLegalFlags,
  resolveLegalFlagsFromProperty,
  type LegalComplianceLevel,
  type LegalVerificationFlags,
  type LegalVerificationKey,
} from "@/lib/properties/legalCompliance";

export {
  LEGAL_VERIFICATION_FIELDS,
  calculateLegalCompliance,
  resolveLegalFlagsFromProperty as resolveLegalFlags,
  type LegalComplianceLevel,
  type LegalVerificationFlags,
  type LegalVerificationKey,
};

export interface LegalVerificationState extends LegalVerificationFlags {
  legal_verification_updated_at: string | null;
  legal_verification_updated_by: string | null;
  legal_verification_updated_by_name: string | null;
}

export const emptyLegalVerification = (): LegalVerificationState => ({
  ...emptyLegalFlags(),
  legal_verification_updated_at: null,
  legal_verification_updated_by: null,
  legal_verification_updated_by_name: null,
});

export function countLegalVerifications(
  flags: Partial<LegalVerificationFlags> | null | undefined,
): number {
  return calculateLegalCompliance(flags).verifiedCount;
}

/** @deprecated Prefer calculateLegalCompliance(flags).level */
export function getLegalComplianceLevel(
  flags: Partial<LegalVerificationFlags> | null | undefined,
): LegalComplianceLevel {
  return calculateLegalCompliance(flags).level;
}

export function legalComplianceLabel(level: LegalComplianceLevel): string {
  if (level === "verified") return "Verified";
  if (level === "partial") return "Partial";
  return "Missing";
}

export function legalComplianceEmoji(level: LegalComplianceLevel): string {
  if (level === "verified") return "🟢";
  if (level === "partial") return "🟡";
  return "🔴";
}

export function pickLegalVerificationFromRow(
  row: Partial<LegalVerificationState> | Record<string, unknown> | null | undefined,
): LegalVerificationState {
  const flags = pickLegalFlags(row);
  const base = emptyLegalVerification();
  Object.assign(base, flags);

  if (!row || typeof row !== "object") return base;

  const updatedAt = (row as LegalVerificationState).legal_verification_updated_at;
  const updatedBy = (row as LegalVerificationState).legal_verification_updated_by;
  const updatedByName = (row as LegalVerificationState).legal_verification_updated_by_name;

  base.legal_verification_updated_at =
    typeof updatedAt === "string" && updatedAt ? updatedAt : null;
  base.legal_verification_updated_by =
    typeof updatedBy === "string" && updatedBy ? updatedBy : null;
  base.legal_verification_updated_by_name =
    typeof updatedByName === "string" && updatedByName ? updatedByName : null;

  return base;
}

export function mergeLegalVerificationStates(
  ...sources: Array<Partial<LegalVerificationState> | null | undefined>
): LegalVerificationState {
  const merged = emptyLegalVerification();
  let bestTs = 0;

  for (const source of sources) {
    if (!source) continue;
    for (const field of LEGAL_VERIFICATION_FIELDS) {
      if (source[field.key]) merged[field.key] = true;
    }
    const tsRaw = source.legal_verification_updated_at;
    if (typeof tsRaw === "string" && tsRaw) {
      const ts = Date.parse(tsRaw);
      if (Number.isFinite(ts) && ts >= bestTs) {
        bestTs = ts;
        merged.legal_verification_updated_at = tsRaw;
        if (source.legal_verification_updated_by) {
          merged.legal_verification_updated_by = source.legal_verification_updated_by;
        }
        if (source.legal_verification_updated_by_name) {
          merged.legal_verification_updated_by_name =
            source.legal_verification_updated_by_name;
        }
      }
    } else {
      if (!merged.legal_verification_updated_by && source.legal_verification_updated_by) {
        merged.legal_verification_updated_by = source.legal_verification_updated_by;
      }
      if (
        !merged.legal_verification_updated_by_name &&
        source.legal_verification_updated_by_name
      ) {
        merged.legal_verification_updated_by_name =
          source.legal_verification_updated_by_name;
      }
    }
  }

  return merged;
}

export function resolveLegalVerificationFromProperty(row: {
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
  legal_verification_updated_at?: string | null;
  legal_verification_updated_by?: string | null;
  legal_verification_updated_by_name?: string | null;
} | null | undefined): LegalVerificationState {
  if (!row) return emptyLegalVerification();

  // Prefer dedicated columns when present (same rule as public resolveLegalFlagsFromProperty).
  const hasColumnData = LEGAL_VERIFICATION_FIELDS.some((field) => {
    const value = (row as Record<string, unknown>)[field.key];
    return typeof value === "boolean";
  });

  if (hasColumnData) {
    return pickLegalVerificationFromRow(row);
  }

  const meta = extractPropertyMeta(row.nearby_places);
  if (meta?.legalVerification) {
    return pickLegalVerificationFromRow(meta.legalVerification);
  }

  return emptyLegalVerification();
}

export function legalFlagsToMetaBlob(
  flags: LegalVerificationState,
): NonNullable<
  import("@/lib/properties/nearbyPlacesMeta").PropertyStructuredMeta["legalVerification"]
> {
  return {
    approved_building_plan: Boolean(flags.approved_building_plan),
    rera_certificate: Boolean(flags.rera_certificate),
    title_deed_verified: Boolean(flags.title_deed_verified),
    noc_verified: Boolean(flags.noc_verified),
    completion_certificate: Boolean(flags.completion_certificate),
    occupation_certificate: Boolean(flags.occupation_certificate),
    environment_clearance: Boolean(flags.environment_clearance),
    fire_clearance: Boolean(flags.fire_clearance),
    bank_approved: Boolean(flags.bank_approved),
    govt_layout_approved: Boolean(flags.govt_layout_approved),
    legal_verification_updated_at: flags.legal_verification_updated_at,
    legal_verification_updated_by: flags.legal_verification_updated_by,
    legal_verification_updated_by_name: flags.legal_verification_updated_by_name,
  };
}

export function legalFlagsPayload(
  flags: LegalVerificationFlags,
  adminUserId: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    legal_verification_updated_at: new Date().toISOString(),
    legal_verification_updated_by: adminUserId,
  };
  for (const field of LEGAL_VERIFICATION_FIELDS) {
    payload[field.key] = Boolean(flags[field.key]);
  }
  return payload;
}

export type LegalComplianceFilter =
  | "all"
  | "verified"
  | "partial"
  | "rera_pending"
  | "missing"
  | "bank_approved"
  | "govt_approved";

export function matchesLegalComplianceFilter(
  flags: Partial<LegalVerificationFlags> | null | undefined,
  filter: LegalComplianceFilter,
): boolean {
  if (filter === "all") return true;
  const { level } = calculateLegalCompliance(flags);
  if (filter === "verified") return level === "verified";
  if (filter === "partial") return level === "partial";
  if (filter === "missing") return level === "missing";
  if (filter === "rera_pending") return !flags?.rera_certificate;
  if (filter === "bank_approved") return Boolean(flags?.bank_approved);
  if (filter === "govt_approved") return Boolean(flags?.govt_layout_approved);
  return true;
}
