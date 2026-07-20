/**
 * Single source of truth for public RERA badge / filters.
 *
 * Live schema (verified): only `rera_number` exists on `properties`.
 * Optional columns (`rera_verified`, `rera_approved`, `rera_status`, …)
 * are accepted when present so CMS/preview objects stay compatible.
 */

export type ReraPropertyLike = {
  rera_number?: string | null;
  rera_registration_number?: string | null;
  rera_approved?: boolean | null;
  rera_status?: string | null;
  rera_verified?: boolean | null;
  /** Mapped listing / card field */
  reraVerified?: boolean | null;
  reraNumber?: string | null;
  nearby_places?: unknown;
};

export type ReraStatus = {
  approved: boolean;
  /** Canonical registration / status string for display & storage */
  number: string | null;
  label: string | null;
  source:
    | "rera_number"
    | "rera_registration_number"
    | "rera_approved"
    | "rera_status"
    | "rera_verified"
    | "reraVerified"
    | "import_meta"
    | "none";
};

function trimText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function isApprovedStatus(value: string | null): boolean {
  if (!value) return false;
  const v = value.toLowerCase().replace(/\s+/g, " ");
  if (v === "no" || v === "false" || v === "pending" || v === "not approved") {
    return false;
  }
  return (
    v.includes("approv") ||
    v.includes("register") ||
    v.includes("verified") ||
    v === "yes" ||
    v === "true"
  );
}

function extractFromNearbyPlaces(nearby: unknown): string | null {
  if (!nearby || typeof nearby !== "object") return null;
  const root = nearby as Record<string, unknown>;
  const meta = (root.meta ?? root._meta) as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== "object") return null;

  const ik = meta.importKnowledge as Record<string, unknown> | undefined;
  const fields =
    (ik?.fields as Record<string, unknown> | undefined) ||
    ((ik?.extracted as Record<string, unknown> | undefined)?.fields as
      | Record<string, unknown>
      | undefined);

  if (!fields) return null;

  const rera = trimText(fields.rera);
  if (rera) return rera;

  const status = trimText(fields.reraStatus);
  if (status && isApprovedStatus(status)) {
    return status.toLowerCase().startsWith("rera") ? status : `RERA ${status}`;
  }

  return null;
}

/** Normalize a CMS/seller input before writing `properties.rera_number`. */
export function normalizeReraNumberForStorage(value: unknown): string | null {
  const text = trimText(value);
  if (!text) return null;
  return text;
}

/**
 * Resolve RERA approval + display number from any property-shaped object.
 * Prefer persisted `rera_number`; fall back to optional columns / import meta.
 */
export function getReraStatus(property: ReraPropertyLike | null | undefined): ReraStatus {
  if (!property) {
    return { approved: false, number: null, label: null, source: "none" };
  }

  const fromNumber = trimText(property.rera_number);
  if (fromNumber) {
    return {
      approved: true,
      number: fromNumber,
      label: fromNumber,
      source: "rera_number",
    };
  }

  const fromReg = trimText(property.rera_registration_number);
  if (fromReg) {
    return {
      approved: true,
      number: fromReg,
      label: fromReg,
      source: "rera_registration_number",
    };
  }

  const fromCamel = trimText(property.reraNumber);
  if (fromCamel) {
    return {
      approved: true,
      number: fromCamel,
      label: fromCamel,
      source: "rera_number",
    };
  }

  if (property.rera_approved === true) {
    return {
      approved: true,
      number: "RERA Approved",
      label: "RERA Approved",
      source: "rera_approved",
    };
  }

  const status = trimText(property.rera_status);
  if (status && isApprovedStatus(status)) {
    const label = status.toLowerCase().startsWith("rera") ? status : `RERA ${status}`;
    return { approved: true, number: label, label, source: "rera_status" };
  }

  if (property.rera_verified === true || property.reraVerified === true) {
    return {
      approved: true,
      number: "RERA Verified",
      label: "RERA Verified",
      source: property.rera_verified === true ? "rera_verified" : "reraVerified",
    };
  }

  const fromMeta = extractFromNearbyPlaces(property.nearby_places);
  if (fromMeta) {
    return {
      approved: true,
      number: fromMeta,
      label: fromMeta,
      source: "import_meta",
    };
  }

  return { approved: false, number: null, label: null, source: "none" };
}

/** True when the listing should show the RERA badge. */
export function isReraApproved(property: ReraPropertyLike | null | undefined): boolean {
  return getReraStatus(property).approved;
}
