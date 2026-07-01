import { supabase } from "@/lib/supabase";

const EXTENDED_COLUMNS = [
  "buying_purpose",
  "buying_timeline",
  "loan_status",
  "occupation",
  "family_size",
  "buyer_notes",
  "budget_min",
  "budget_max",
  "preferred_locations",
  "preferred_property_types",
  "contact_email",
  "city",
] as const;

export async function patchBuyerProfile(
  userId: string,
  patch: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const safePatch: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    if (
      EXTENDED_COLUMNS.includes(key as (typeof EXTENDED_COLUMNS)[number]) ||
      key === "full_name" ||
      key === "phone"
    ) {
      safePatch[key] = patch[key];
    }
  }

  const { error } = await supabase.from("profiles").update(safePatch).eq("id", userId);

  if (error) {
    console.error("patchBuyerProfile:", error.message);
    return { error: error.message };
  }

  return { error: null };
}
