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
  | "SELLER_NOT_FOUND"
  | "SELLER_PROFILE_MISSING"
  | "PROPERTY_OWNER_NOT_FOUND"
  | "SITE_VISIT_FAILED"
  | "CRM_LEAD_FAILED"
  | "CRM_ACTIVITY_FAILED"
  | "INSERT_FAILED"
  | "PERMISSION_DENIED"
  | "CONSTRAINT_FAILED"
  | "SCHEMA_NOT_READY";

export interface SiteVisitErrorBody {
  error?: string;
  code?: SiteVisitErrorCode | string;
  dev?: Record<string, unknown>;
}

const CODE_MESSAGES: Partial<Record<SiteVisitErrorCode, string>> = {
  MISSING_PROPERTY_ID: "Unable to identify this property. Please refresh the page.",
  INVALID_PROPERTY_ID: "Unable to identify this property. Please refresh the page.",
  PROPERTY_UNAVAILABLE: "Property not found.",
  UNAUTHORIZED: "Please sign in to book a site visit.",
  VALIDATION: "Please fill in all required fields.",
  BUYER_PROFILE_MISSING: "Buyer profile missing. Please sign out and sign in again.",
  BUYER_NOT_BUYER_ROLE: "Only buyer accounts can book site visits.",
  SELLER_NOT_FOUND: "Property owner not found.",
  SELLER_PROFILE_MISSING: "Seller profile missing.",
  PROPERTY_OWNER_NOT_FOUND: "Property owner not found.",
  SITE_VISIT_FAILED: "Unable to create site visit.",
  CRM_LEAD_FAILED: "Unable to create CRM lead.",
  CRM_ACTIVITY_FAILED: "Unable to create CRM activity.",
  INSERT_FAILED: "Unable to save your site visit request.",
  PERMISSION_DENIED: "Permission denied. Your account cannot create this booking.",
  CONSTRAINT_FAILED: "Database constraint failed. Please contact support.",
  SCHEMA_NOT_READY:
    "Site visit booking is not configured yet. Ask your administrator to run the database migration.",
  DATABASE: "An unexpected error occurred while saving your request.",
  NETWORK: "Connection lost. Please retry.",
  UNKNOWN: "An unexpected error occurred. Please try again.",
};

function asSiteVisitErrorCode(code: string | undefined): SiteVisitErrorCode | undefined {
  if (!code) return undefined;
  if (code in CODE_MESSAGES) return code as SiteVisitErrorCode;
  return undefined;
}

export function mapSiteVisitError(
  status: number,
  body: SiteVisitErrorBody | null,
  cause?: unknown,
): { message: string; code: SiteVisitErrorCode } {
  const rawCode = body?.code;
  const code = asSiteVisitErrorCode(typeof rawCode === "string" ? rawCode : undefined);
  const serverMessage = body?.error?.trim();

  if (code && CODE_MESSAGES[code]) {
    let message = CODE_MESSAGES[code]!;
    if (
      process.env.NODE_ENV === "development" &&
      body?.dev &&
      typeof body.dev.supabaseError === "string"
    ) {
      message = `${message} (${body.dev.supabaseError})`;
    } else if (process.env.NODE_ENV === "development" && serverMessage) {
      message = serverMessage;
    }
    return { code, message };
  }

  if (code === "VALIDATION" || status === 400) {
    return {
      code: "VALIDATION",
      message: serverMessage ?? CODE_MESSAGES.VALIDATION!,
    };
  }

  if (cause instanceof TypeError && /fetch|network/i.test(String(cause.message))) {
    return { code: "NETWORK", message: CODE_MESSAGES.NETWORK! };
  }

  if (serverMessage) {
    return { code: code ?? "UNKNOWN", message: serverMessage };
  }

  return {
    code: "UNKNOWN",
    message: CODE_MESSAGES.UNKNOWN!,
  };
}

export function devLogSiteVisit(label: string, data: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development") return;
  console.debug(`[SiteVisit] ${label}`, data);
}
