import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyOwnerInfo } from "./types";

export async function getPropertyOwner(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<PropertyOwnerInfo | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("seller_id, title, seller:profiles!properties_seller_id_fkey(full_name, role)")
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !data) {
    console.error("getPropertyOwner:", error?.message);
    return null;
  }

  const seller = data.seller as {
    full_name?: string | null;
    role?: string | null;
  } | null;

  const role = seller?.role ?? "seller";
  const ownerType = role === "builder" ? "builder" : "seller";
  const ownerName =
    ownerType === "builder"
      ? seller?.full_name ?? "Builder"
      : seller?.full_name ?? "Seller";

  return {
    ownerId: data.seller_id,
    ownerType,
    ownerName,
  };
}

export async function getAdminUserIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (error) {
    console.error("getAdminUserIds:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}
