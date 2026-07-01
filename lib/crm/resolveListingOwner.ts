import type { SupabaseClient } from "@supabase/supabase-js";
import { devLogSiteVisit } from "./siteVisitErrors";

/** Canonical property owner field used across AreaIQ */
export const PROPERTY_OWNER_FIELD = "seller_id" as const;

export interface ListingOwnerProfile {
  id: string;
  role: string;
  full_name: string | null;
}

export interface PropertyOwnerDebugSnapshot {
  canonicalOwnerField: typeof PROPERTY_OWNER_FIELD;
  bookingUsesField: typeof PROPERTY_OWNER_FIELD;
  property: {
    id: string | null;
    title: string | null;
    seller_id: string | null;
    status: string | null;
    contact_name: string | null;
    builder_name: string | null;
    created_by: string | null;
    owner_id: string | null;
    builder_id: string | null;
  };
  embedSeller: { id?: string; full_name?: string | null; role?: string | null } | null;
  directProfileQuery: {
    row: Record<string, unknown> | null;
    error: string | null;
    errorCode: string | null;
  };
  rpcProfileQuery: {
    row: ListingOwnerProfile | null;
    error: string | null;
    available: boolean;
  };
  diagnosis: string;
}

/**
 * Loads property row + logs every owner-related field for booking debug.
 * Only `seller_id` exists on live schema — created_by/owner_id/builder_id are absent.
 */
export async function debugPropertyOwnerResolution(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<PropertyOwnerDebugSnapshot> {
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select(
      "id, title, seller_id, status, contact_name, builder_name, seller:profiles!properties_seller_id_fkey(id, full_name, role)",
    )
    .eq("id", propertyId)
    .maybeSingle();

  const row = property as Record<string, unknown> | null;
  const embedSeller = (row?.seller as PropertyOwnerDebugSnapshot["embedSeller"]) ?? null;

  const snapshot: PropertyOwnerDebugSnapshot = {
    canonicalOwnerField: PROPERTY_OWNER_FIELD,
    bookingUsesField: PROPERTY_OWNER_FIELD,
    property: {
      id: (row?.id as string) ?? null,
      title: (row?.title as string) ?? null,
      seller_id: (row?.seller_id as string) ?? null,
      status: (row?.status as string) ?? null,
      contact_name: (row?.contact_name as string) ?? null,
      builder_name: (row?.builder_name as string) ?? null,
      created_by: null,
      owner_id: null,
      builder_id: null,
    },
    embedSeller,
    directProfileQuery: { row: null, error: null, errorCode: null },
    rpcProfileQuery: { row: null, error: null, available: false },
    diagnosis: "",
  };

  devLogSiteVisit("DEBUG property owner fields", {
    propertyId,
    propertyQueryError: propertyError?.message ?? null,
    ...snapshot.property,
    note_created_by: "column does not exist on properties",
    note_owner_id: "column does not exist on properties",
    note_builder_id: "column does not exist on properties",
    embedSeller,
    bookingResolvesOwnerVia: PROPERTY_OWNER_FIELD,
  });

  const sellerId = snapshot.property.seller_id;
  if (!sellerId) {
    snapshot.diagnosis = "Property row has no seller_id — owner cannot be resolved.";
    devLogSiteVisit("DEBUG owner diagnosis", { diagnosis: snapshot.diagnosis });
    return snapshot;
  }

  const { data: directRow, error: directError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sellerId)
    .maybeSingle();

  snapshot.directProfileQuery = {
    row: (directRow as Record<string, unknown>) ?? null,
    error: directError?.message ?? null,
    errorCode: directError?.code ?? null,
  };

  devLogSiteVisit("DEBUG SELECT * FROM profiles WHERE id = seller_id", {
    seller_id: sellerId,
    rowReturned: directRow ?? null,
    error: directError?.message ?? null,
    errorCode: directError?.code ?? null,
  });

  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "get_listing_owner_profile",
    { owner_id: sellerId },
  );

  const rpcAvailable =
    !rpcError?.message?.includes("Could not find the function") &&
    !rpcError?.message?.includes("does not exist");

  snapshot.rpcProfileQuery = {
    available: rpcAvailable,
    error: rpcError?.message ?? null,
    row: rpcAvailable && Array.isArray(rpcRows) && rpcRows[0]
      ? {
          id: rpcRows[0].id as string,
          role: rpcRows[0].role as string,
          full_name: (rpcRows[0].full_name as string | null) ?? null,
        }
      : null,
  };

  devLogSiteVisit("DEBUG rpc get_listing_owner_profile", snapshot.rpcProfileQuery);

  if (snapshot.rpcProfileQuery.row) {
    snapshot.diagnosis =
      "Profile row EXISTS. Direct buyer query returned null — RLS blocks authenticated buyers from reading seller profiles. Use embed or RPC.";
  } else if (embedSeller?.id) {
    snapshot.diagnosis =
      "Profile readable via property embed join. Direct profiles query may still be RLS-blocked.";
  } else if (!directRow && !directError) {
    snapshot.diagnosis =
      "Direct profiles query: NULL row + no error. Either (a) RLS denial — row exists but buyer cannot read, or (b) no profile row for seller_id. Listing still works because it only reads properties.contact_name/builder_name.";
  } else if (directRow) {
    snapshot.diagnosis = "Profile row readable via direct query.";
  } else {
    snapshot.diagnosis = directError?.message ?? "Unable to resolve owner profile.";
  }

  devLogSiteVisit("DEBUG owner diagnosis", {
    diagnosis: snapshot.diagnosis,
    whyListingWorksWithoutProfile:
      "Property detail/listing pages read properties.* only; seller name falls back to contact_name when profiles join is blocked.",
  });

  return snapshot;
}

/**
 * Resolves listing owner from canonical properties.seller_id.
 * Order: property embed → SECURITY DEFINER RPC → direct profiles query.
 */
export async function resolveListingOwner(
  supabase: SupabaseClient,
  input: {
    sellerId: string;
    embedSeller?: { id?: string; full_name?: string | null; role?: string | null } | null;
    debug?: PropertyOwnerDebugSnapshot;
  },
): Promise<ListingOwnerProfile | null> {
  const { sellerId, embedSeller, debug } = input;

  if (embedSeller?.id && embedSeller.role) {
    devLogSiteVisit("Owner resolved via property embed", { sellerId, role: embedSeller.role });
    return {
      id: embedSeller.id,
      role: embedSeller.role,
      full_name: embedSeller.full_name ?? null,
    };
  }

  if (debug?.rpcProfileQuery.row) {
    devLogSiteVisit("Owner resolved via RPC (debug pass)", { ...debug.rpcProfileQuery.row });
    return debug.rpcProfileQuery.row;
  }

  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "get_listing_owner_profile",
    { owner_id: sellerId },
  );

  if (!rpcError && Array.isArray(rpcRows) && rpcRows[0]?.id) {
    const profile = {
      id: rpcRows[0].id as string,
      role: rpcRows[0].role as string,
      full_name: (rpcRows[0].full_name as string | null) ?? null,
    };
    devLogSiteVisit("Owner resolved via RPC", profile);
    return profile;
  }

  if (rpcError && !rpcError.message?.includes("Could not find the function")) {
    devLogSiteVisit("RPC get_listing_owner_profile error", { error: rpcError.message });
  }

  const { data: directRow, error: directError } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", sellerId)
    .maybeSingle();

  if (directRow) {
    devLogSiteVisit("Owner resolved via direct profiles query", directRow);
    return {
      id: directRow.id,
      role: directRow.role,
      full_name: directRow.full_name,
    };
  }

  devLogSiteVisit("Owner resolution failed", {
    sellerId,
    directError: directError?.message ?? null,
    directNullNoError: !directRow && !directError,
    rpcError: rpcError?.message ?? null,
    embedSeller,
    likelyCause:
      !directRow && !directError
        ? "RLS blocks buyer from reading seller profile (row likely exists)"
        : "No profile row for seller_id",
  });

  return null;
}
