import type { SupabaseClient } from "@supabase/supabase-js";

export interface PropertyForSiteVisit {
  id: string;
  title: string;
  seller_id: string;
  status: string;
  site_visit_enabled?: boolean | null;
  deleted_at?: string | null;
  connect_partner_id?: string | null;
  assigned_connect_id?: string | null;
  type?: string | null;
  sub_type?: string | null;
  builder_name?: string | null;
  rera_number?: string | null;
  parking?: string | null;
  contact_name?: string | null;
  seller?: { full_name?: string | null; role?: string | null } | null;
}

type LookupResult =
  | { property: PropertyForSiteVisit; error: null }
  | { property: null; error: string; code: "PROPERTY_UNAVAILABLE" | "DATABASE" };

const SELLER_EMBED = "seller:profiles!properties_seller_id_fkey(full_name, role)";

/**
 * Resilient property lookup for site-visit booking.
 * Returns the row regardless of status so callers can evaluate availability.
 */
export async function lookupPropertyForSiteVisit(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<LookupResult> {
  const primarySelect = `id, title, seller_id, status, site_visit_enabled, deleted_at, connect_partner_id, assigned_connect_id, type, sub_type, contact_name, builder_name, rera_number, parking, ${SELLER_EMBED}`;

  const { data, error } = await supabase
    .from("properties")
    .select(primarySelect)
    .eq("id", propertyId)
    .maybeSingle();

  if (!error && data) {
    return { property: data as PropertyForSiteVisit, error: null };
  }

  const isMissingColumn =
    error?.message?.includes("column") ||
    error?.code === "42703" ||
    error?.message?.includes("does not exist");

  if (isMissingColumn) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("properties")
      .select(
        `id, title, seller_id, status, connect_partner_id, assigned_connect_id, type, sub_type, contact_name, builder_name, rera_number, parking, ${SELLER_EMBED}`,
      )
      .eq("id", propertyId)
      .maybeSingle();

    if (!fallbackError && fallback) {
      return {
        property: {
          ...(fallback as PropertyForSiteVisit),
          site_visit_enabled: true,
        },
        error: null,
      };
    }

    if (fallbackError) {
      return {
        property: null,
        error: fallbackError.message,
        code: "DATABASE",
      };
    }
  } else if (error) {
    return { property: null, error: error.message, code: "DATABASE" };
  }

  const { data: bare, error: bareError } = await supabase
    .from("properties")
    .select("id, title, seller_id, status, type, sub_type, contact_name")
    .eq("id", propertyId)
    .maybeSingle();

  if (!bareError && bare) {
    return {
      property: {
        ...(bare as PropertyForSiteVisit),
        site_visit_enabled: true,
      },
      error: null,
    };
  }

  if (bareError) {
    return { property: null, error: bareError.message, code: "DATABASE" };
  }

  return {
    property: null,
    error: "No property row for id",
    code: "PROPERTY_UNAVAILABLE",
  };
}
