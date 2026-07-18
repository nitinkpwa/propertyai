import type { SupabaseClient } from "@supabase/supabase-js";
import { PROPERTY_STATUS } from "@/lib/properties/status";

export type SiteVisitAvailabilityReason =
  | "available"
  | "disabled"
  | "not_active"
  | "sold"
  | "deleted"
  | "not_found";

export interface SiteVisitAvailabilityResult {
  available: boolean;
  reason: SiteVisitAvailabilityReason;
  message: string;
  siteVisitEnabled: boolean;
  status: string | null;
}

const MESSAGES: Record<SiteVisitAvailabilityReason, string> = {
  available: "Site visits are available for this property.",
  disabled: "Site visits are temporarily unavailable for this property.",
  not_active: "Site visits are temporarily unavailable for this property.",
  sold: "Site visits are temporarily unavailable for this property.",
  deleted: "Site visits are temporarily unavailable for this property.",
  not_found: "Site visits are temporarily unavailable for this property.",
};

export function evaluateSiteVisitAvailability(property: {
  status?: string | null;
  site_visit_enabled?: boolean | null;
  deleted_at?: string | null;
} | null): SiteVisitAvailabilityResult {
  if (!property) {
    return {
      available: false,
      reason: "not_found",
      message: MESSAGES.not_found,
      siteVisitEnabled: false,
      status: null,
    };
  }

  if (property.deleted_at) {
    return {
      available: false,
      reason: "deleted",
      message: MESSAGES.deleted,
      siteVisitEnabled: property.site_visit_enabled !== false,
      status: property.status ?? null,
    };
  }

  const status = (property.status ?? "").toLowerCase();
  const siteVisitEnabled = property.site_visit_enabled !== false;

  if (status === PROPERTY_STATUS.SOLD || status === PROPERTY_STATUS.RENTED) {
    return {
      available: false,
      reason: "sold",
      message: MESSAGES.sold,
      siteVisitEnabled,
      status,
    };
  }

  if (status !== PROPERTY_STATUS.ACTIVE) {
    return {
      available: false,
      reason: "not_active",
      message: MESSAGES.not_active,
      siteVisitEnabled,
      status,
    };
  }

  if (!siteVisitEnabled) {
    return {
      available: false,
      reason: "disabled",
      message: MESSAGES.disabled,
      siteVisitEnabled: false,
      status,
    };
  }

  return {
    available: true,
    reason: "available",
    message: MESSAGES.available,
    siteVisitEnabled: true,
    status,
  };
}

/**
 * Resolve site-visit availability for a property id.
 * Does not require the listing to already be active — status is part of the result.
 */
export async function getSiteVisitAvailability(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<SiteVisitAvailabilityResult> {
  const primary = await supabase
    .from("properties")
    .select("id, status, site_visit_enabled, deleted_at")
    .eq("id", propertyId)
    .maybeSingle();

  if (!primary.error && primary.data) {
    return evaluateSiteVisitAvailability(primary.data);
  }

  const missingColumn =
    primary.error?.message?.includes("site_visit_enabled") ||
    primary.error?.code === "42703";

  if (missingColumn) {
    const fallback = await supabase
      .from("properties")
      .select("id, status, deleted_at")
      .eq("id", propertyId)
      .maybeSingle();

    if (!fallback.error && fallback.data) {
      // Column not migrated yet — treat as enabled (default TRUE).
      return evaluateSiteVisitAvailability({
        ...fallback.data,
        site_visit_enabled: true,
      });
    }
  }

  return evaluateSiteVisitAvailability(null);
}
