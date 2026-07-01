import type { SupabaseClient } from "@supabase/supabase-js";

export interface PropertyForSiteVisit {
  id: string;
  title: string;
  seller_id: string;
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
 * Uses only verified profile columns (no company/agency fields).
 */
export async function lookupPropertyForSiteVisit(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<LookupResult> {
  const primarySelect = `id, title, seller_id, type, sub_type, contact_name, builder_name, rera_number, parking, ${SELLER_EMBED}`;

  const { data, error } = await supabase
    .from("properties")
    .select(primarySelect)
    .eq("id", propertyId)
    .eq("status", "active")
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
      .select(`id, title, seller_id, type, sub_type, contact_name, ${SELLER_EMBED}`)
      .eq("id", propertyId)
      .eq("status", "active")
      .maybeSingle();

    if (!fallbackError && fallback) {
      return { property: fallback as PropertyForSiteVisit, error: null };
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
    .select("id, title, seller_id, type, sub_type, contact_name")
    .eq("id", propertyId)
    .eq("status", "active")
    .maybeSingle();

  if (!bareError && bare) {
    return { property: bare as PropertyForSiteVisit, error: null };
  }

  if (bareError) {
    return { property: null, error: bareError.message, code: "DATABASE" };
  }

  return {
    property: null,
    error: "No active property row for id",
    code: "PROPERTY_UNAVAILABLE",
  };
}
