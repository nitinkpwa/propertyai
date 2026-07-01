import { supabase } from "@/lib/supabase";
import type { BuyerProfileUpdate } from "@/lib/buyer/types";

type PreferenceColumn =
  | "city"
  | "budget_min"
  | "budget_max"
  | "preferred_locations"
  | "preferred_property_types";

const PREFERENCE_COLUMNS: PreferenceColumn[] = [
  "city",
  "budget_min",
  "budget_max",
  "preferred_locations",
  "preferred_property_types",
];

let preferenceColumnsCache: Set<PreferenceColumn> | null = null;

async function detectPreferenceColumns(): Promise<Set<PreferenceColumn>> {
  if (preferenceColumnsCache) return preferenceColumnsCache;

  const { error } = await supabase
    .from("profiles")
    .select(PREFERENCE_COLUMNS.join(", "))
    .limit(1);

  if (!error) {
    preferenceColumnsCache = new Set(PREFERENCE_COLUMNS);
    return preferenceColumnsCache;
  }

  const available = new Set<PreferenceColumn>();
  for (const col of PREFERENCE_COLUMNS) {
    const { error: colError } = await supabase
      .from("profiles")
      .select(col)
      .limit(1);
    if (!colError) available.add(col);
  }

  preferenceColumnsCache = available;
  return available;
}

export async function updateBuyerProfileSafe(
  userId: string,
  payload: BuyerProfileUpdate,
): Promise<{ error: string | null; savedPreferences: boolean }> {
  const coreUpdate = {
    full_name: payload.full_name.trim(),
    phone: payload.phone.trim(),
  };

  const columns = await detectPreferenceColumns();
  const preferenceUpdate: Record<string, unknown> = {};

  if (columns.has("city")) {
    preferenceUpdate.city = payload.city.trim() || null;
  }
  if (columns.has("budget_min")) {
    preferenceUpdate.budget_min = payload.budget_min;
  }
  if (columns.has("budget_max")) {
    preferenceUpdate.budget_max = payload.budget_max;
  }
  if (columns.has("preferred_locations")) {
    preferenceUpdate.preferred_locations = payload.preferred_locations;
  }
  if (columns.has("preferred_property_types")) {
    preferenceUpdate.preferred_property_types = payload.preferred_property_types;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ...coreUpdate, ...preferenceUpdate })
    .eq("id", userId);

  if (error) {
    console.error("updateBuyerProfileSafe:", error.message);

    const { error: coreError } = await supabase
      .from("profiles")
      .update(coreUpdate)
      .eq("id", userId);

    if (coreError) {
      return { error: coreError.message, savedPreferences: false };
    }

    return {
      error:
        columns.size === 0
          ? "Profile saved. Preference columns are not available yet — apply the latest Supabase migration."
          : "Profile saved, but some preferences could not be saved. Apply the latest Supabase migration.",
      savedPreferences: false,
    };
  }

  return { error: null, savedPreferences: columns.size === PREFERENCE_COLUMNS.length };
}

export function resetProfileColumnCache(): void {
  preferenceColumnsCache = null;
}
