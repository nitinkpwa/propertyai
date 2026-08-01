/** UUID v4 pattern for property IDs */
export const PROPERTY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SiteVisitErrorCode =
  | "MISSING_PROPERTY_ID"
  | "INVALID_PROPERTY_ID"
  | "PROPERTY_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "DATABASE"
  | "NETWORK"
  | "UNKNOWN"
  | "BUYER_PROFILE_MISSING"
  | "BUYER_NOT_BUYER_ROLE"
  | "CONNECT_PARTNER_MISSING"
  | "SITE_VISITS_DISABLED"
  | "DUPLICATE_VISIT"
  | "SELLER_NOT_FOUND"
  | "SELLER_PROFILE_MISSING"
  | "PROPERTY_OWNER_NOT_FOUND"
  | "SITE_VISIT_FAILED"
  | "CRM_LEAD_FAILED"
  | "CRM_ACTIVITY_FAILED"
  | "INSERT_FAILED"
  | "PERMISSION_DENIED"
  | "CONSTRAINT_FAILED"
  | "SCHEMA_NOT_READY"
  | "MISSING_PHONE";

export interface SiteVisitErrorBody {
  error?: string;
  code?: SiteVisitErrorCode | string;
  details?: Record<string, unknown> | null;
  dev?: Record<string, unknown>;
}

const CODE_MESSAGES: Partial<Record<SiteVisitErrorCode, string>> = {
  MISSING_PROPERTY_ID: "Selected property not found. Please refresh the page.",
  INVALID_PROPERTY_ID: "Selected property not found. Invalid property id.",
  PROPERTY_UNAVAILABLE: "Selected property not found.",
  UNAUTHORIZED: "Please sign in to request a property visit.",
  VALIDATION: "Please fill in all required fields.",
  BUYER_PROFILE_MISSING: "Buyer profile missing. Please sign out and sign in again.",
  BUYER_NOT_BUYER_ROLE: "Please continue as a Buyer to book a site visit.",
  CONNECT_PARTNER_MISSING: "Builder unavailable for site visits on this property.",
  SITE_VISITS_DISABLED: "Site visits are temporarily unavailable for this property.",
  DUPLICATE_VISIT: "You already have an active site visit request for this property.",
  SELLER_NOT_FOUND: "Builder unavailable. Property owner was not found.",
  SELLER_PROFILE_MISSING: "Builder unavailable. Seller profile is missing.",
  PROPERTY_OWNER_NOT_FOUND: "Builder unavailable. Property owner was not found.",
  SITE_VISIT_FAILED: "Unable to create site visit in the database.",
  CRM_LEAD_FAILED: "Unable to create CRM lead for this visit.",
  CRM_ACTIVITY_FAILED: "Unable to create CRM activity for this visit.",
  INSERT_FAILED: "Unable to save your site visit request.",
  PERMISSION_DENIED: "Database permission denied. Your account cannot create this booking.",
  CONSTRAINT_FAILED: "Database constraint failed. Date may already be booked or schema is outdated.",
  SCHEMA_NOT_READY:
    "Site visit booking is not configured yet. Ask your administrator to run the database migration.",
  MISSING_PHONE: "Missing phone number. Please add a phone number to your profile.",
  DATABASE: "Database error while saving your request.",
  NETWORK: "Connection lost. Please retry.",
  UNKNOWN: "Booking failed. See details below.",
};

function asSiteVisitErrorCode(code: string | undefined): SiteVisitErrorCode | undefined {
  if (!code) return undefined;
  if (code in CODE_MESSAGES) return code as SiteVisitErrorCode;
  return undefined;
}

function detailSnippet(body: SiteVisitErrorBody | null): string | null {
  const details = body?.details ?? body?.dev;
  if (!details || typeof details !== "object") return null;
  const supabaseError =
    typeof details.supabaseError === "string" ? details.supabaseError : null;
  const message = typeof details.message === "string" ? details.message : null;
  return supabaseError || message;
}

/**
 * Map API failure → buyer-facing message.
 * Prefer the server's real error string; never hide Supabase/RLS details.
 */
export function mapSiteVisitError(
  status: number,
  body: SiteVisitErrorBody | null,
  cause?: unknown,
): { message: string; code: SiteVisitErrorCode; details: Record<string, unknown> | null } {
  const rawCode = body?.code;
  const code = asSiteVisitErrorCode(typeof rawCode === "string" ? rawCode : undefined);
  const serverMessage = body?.error?.trim();
  const detail = detailSnippet(body);
  const details =
    (body?.details as Record<string, unknown> | null | undefined) ??
    (body?.dev as Record<string, unknown> | null | undefined) ??
    null;

  const withDetail = (base: string) =>
    detail && !base.includes(detail) ? `${base} (${detail})` : base;

  if (cause instanceof TypeError && /fetch|network/i.test(String(cause.message))) {
    return { code: "NETWORK", message: CODE_MESSAGES.NETWORK!, details };
  }

  if (status === 401 || code === "UNAUTHORIZED") {
    return {
      code: "UNAUTHORIZED",
      message: serverMessage ?? CODE_MESSAGES.UNAUTHORIZED!,
      details,
    };
  }

  if (code) {
    const mapped = CODE_MESSAGES[code] ?? serverMessage ?? CODE_MESSAGES.UNKNOWN!;
    return {
      code,
      message: withDetail(serverMessage && serverMessage.length > 8 ? serverMessage : mapped),
      details,
    };
  }

  if (status === 400) {
    return {
      code: "VALIDATION",
      message: withDetail(serverMessage ?? CODE_MESSAGES.VALIDATION!),
      details,
    };
  }

  if (status === 403) {
    return {
      code: "PERMISSION_DENIED",
      message: withDetail(serverMessage ?? CODE_MESSAGES.PERMISSION_DENIED!),
      details,
    };
  }

  if (status === 409) {
    return {
      code: "DUPLICATE_VISIT",
      message: withDetail(serverMessage ?? CODE_MESSAGES.DUPLICATE_VISIT!),
      details,
    };
  }

  if (serverMessage) {
    return {
      code: "UNKNOWN",
      message: withDetail(serverMessage),
      details,
    };
  }

  if (cause instanceof Error && cause.message) {
    return {
      code: "UNKNOWN",
      message: `Booking failed: ${cause.message}`,
      details: { ...(details ?? {}), clientError: cause.message },
    };
  }

  return {
    code: "UNKNOWN",
    message: `Booking failed (HTTP ${status || "network"}). Check the browser console for details.`,
    details: { ...(details ?? {}), httpStatus: status },
  };
}

export function devLogSiteVisit(label: string, data: Record<string, unknown>): void {
  // Always log booking diagnostics — this flow must never hide failures.
  console.error(`[SiteVisit] ${label}`, data);
}
