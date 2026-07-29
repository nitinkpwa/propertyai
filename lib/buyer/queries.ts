import type { PropertyCardProps } from "@/app/components/PropertyCard";
import { mapPropertyRowToCardProps } from "@/lib/properties/queries";
import { trackCrmEvent } from "@/lib/crm/queries";
import { supabase, type Property } from "@/lib/supabase";
import { PROPERTIES_CARD_SELECT } from "@/lib/seller/propertySchema";
import type {
  BuyerProfileUpdate,
  BuyerStats,
  ComparedPropertyRow,
  PropertyViewRow,
  SavedPropertyRow,
  SiteVisitRow,
} from "./types";
import { toBhkOption } from "./types";
import { updateBuyerProfileSafe } from "@/lib/buyer/profileUpdate";

type PropertyRow = Property & {
  growth_score?: number | null;
  rental_yield?: number | null;
  ai_verified?: boolean | null;
  rera_verified?: boolean | null;
  builder_name?: string | null;
  possession?: string | null;
  seller?: { full_name?: string | null } | null;
};

function rowToCard(row: PropertyRow): PropertyCardProps {
  const card = mapPropertyRowToCardProps(row);
  return {
    ...card,
    bhk: toBhkOption(row.bedrooms),
  };
}

function mapSavedRow(row: SavedPropertyRow): PropertyCardProps & { savedRowId: string } | null {
  if (!row.property) return null;
  const card = rowToCard(row.property as PropertyRow);
  return { ...card, savedRowId: row.id };
}

function mapComparedRow(row: ComparedPropertyRow): PropertyCardProps & { compareRowId: string } | null {
  if (!row.property) return null;
  const card = rowToCard(row.property as PropertyRow);
  return { ...card, compareRowId: row.id };
}

function mapViewRow(row: PropertyViewRow): PropertyCardProps | null {
  if (!row.property) return null;
  return rowToCard(row.property as PropertyRow);
}

export async function fetchBuyerStats(userId: string): Promise<BuyerStats> {
  const today = new Date().toISOString().slice(0, 10);

  const [saved, compared, visits] = await Promise.all([
    supabase
      .from("saved_properties")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("compared_properties")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("visit_date", today)
      .in("status", ["pending_approval", "accepted", "scheduled"]),
  ]);

  return {
    savedCount: saved.count ?? 0,
    comparedCount: compared.count ?? 0,
    upcomingVisitsCount: visits.count ?? 0,
  };
}

export async function fetchSavedPropertyIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_properties")
    .select("property_id")
    .eq("user_id", userId);

  if (error) {
    console.error("fetchSavedPropertyIds:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.property_id);
}

export async function isPropertySaved(
  userId: string,
  propertyId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("saved_properties")
    .select("id")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) {
    console.error("isPropertySaved:", error.message);
    return false;
  }

  return data !== null;
}

export async function addSavedProperty(
  userId: string,
  propertyId: string,
): Promise<boolean> {
  const { error } = await supabase.from("saved_properties").upsert(
    { user_id: userId, property_id: propertyId },
    { onConflict: "user_id,property_id" },
  );

  if (error) {
    console.error("addSavedProperty:", error.message);
    return false;
  }

  void trackCrmEvent({
    activityType: "property_saved",
    title: "Property saved",
    propertyId,
  });

  return true;
}

export async function removeSavedPropertyByPropertyId(
  userId: string,
  propertyId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("saved_properties")
    .delete()
    .eq("user_id", userId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("removeSavedPropertyByPropertyId:", error.message);
    return false;
  }

  void trackCrmEvent({
    activityType: "property_unsaved",
    title: "Property removed from saved",
    propertyId,
  });

  return true;
}

export async function toggleSavedProperty(
  userId: string,
  propertyId: string,
  shouldSave: boolean,
): Promise<boolean> {
  return shouldSave
    ? addSavedProperty(userId, propertyId)
    : removeSavedPropertyByPropertyId(userId, propertyId);
}

export async function fetchSavedPropertyCards(userId: string) {
  const { data, error } = await supabase
    .from("saved_properties")
    .select(`*, property:properties(${PROPERTIES_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchSavedPropertyCards:", error.message);
    return [];
  }

  return (data as SavedPropertyRow[])
    .map(mapSavedRow)
    .filter((item): item is PropertyCardProps & { savedRowId: string } => item !== null);
}

export async function removeSavedProperty(rowId: string): Promise<boolean> {
  const { error } = await supabase.from("saved_properties").delete().eq("id", rowId);
  if (error) {
    console.error("removeSavedProperty:", error.message);
    return false;
  }
  return true;
}

export async function fetchComparedPropertyIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("compared_properties")
    .select("property_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchComparedPropertyIds:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.property_id as string)
    .filter(Boolean);
}

export async function fetchComparedPropertyCards(userId: string) {
  const { data, error } = await supabase
    .from("compared_properties")
    .select(`*, property:properties(${PROPERTIES_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchComparedPropertyCards:", error.message);
    return [];
  }

  return (data as ComparedPropertyRow[])
    .map(mapComparedRow)
    .filter((item): item is PropertyCardProps & { compareRowId: string } => item !== null);
}

export async function removeComparedProperty(rowId: string): Promise<boolean> {
  const { error } = await supabase.from("compared_properties").delete().eq("id", rowId);
  if (error) {
    console.error("removeComparedProperty:", error.message);
    return false;
  }
  return true;
}

export async function removeComparedPropertyByPropertyId(
  userId: string,
  propertyId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("compared_properties")
    .delete()
    .eq("user_id", userId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("removeComparedPropertyByPropertyId:", error.message);
    return false;
  }
  return true;
}

export async function addComparedProperty(
  userId: string,
  propertyId: string,
): Promise<boolean> {
  const { error } = await supabase.from("compared_properties").upsert(
    { user_id: userId, property_id: propertyId },
    { onConflict: "user_id,property_id" },
  );

  if (error) {
    console.error("addComparedProperty:", error.message);
    return false;
  }

  void trackCrmEvent({
    activityType: "property_compared",
    title: "Property added to compare",
    propertyId,
  });

  return true;
}

/** Replace remote compare set with the given property IDs (capped). */
export async function syncComparedProperties(
  userId: string,
  propertyIds: string[],
): Promise<boolean> {
  const unique = Array.from(new Set(propertyIds.filter(Boolean)));

  const { data: existing, error: fetchError } = await supabase
    .from("compared_properties")
    .select("id, property_id")
    .eq("user_id", userId);

  if (fetchError) {
    console.error("syncComparedProperties fetch:", fetchError.message);
    return false;
  }

  const rows = existing ?? [];
  const remoteIds = new Set(rows.map((r) => r.property_id as string));
  const desired = new Set(unique);

  const toDelete = rows
    .filter((r) => !desired.has(r.property_id as string))
    .map((r) => r.id as string);

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("compared_properties")
      .delete()
      .in("id", toDelete);
    if (error) {
      console.error("syncComparedProperties delete:", error.message);
      return false;
    }
  }

  const toAdd = unique.filter((id) => !remoteIds.has(id));
  if (toAdd.length > 0) {
    const { error } = await supabase.from("compared_properties").upsert(
      toAdd.map((property_id) => ({ user_id: userId, property_id })),
      { onConflict: "user_id,property_id" },
    );
    if (error) {
      console.error("syncComparedProperties upsert:", error.message);
      return false;
    }
  }

  return true;
}

export async function recordPropertyView(
  userId: string,
  propertyId: string,
): Promise<void> {
  const { error } = await supabase.from("property_views").insert({
    user_id: userId,
    property_id: propertyId,
  });

  if (error) {
    console.error("recordPropertyView:", error.message);
    return;
  }

  void trackCrmEvent({
    activityType: "property_viewed",
    title: "Viewed property",
    propertyId,
  });
}

export async function fetchRecentViewedCards(userId: string, limit = 4) {
  const { data, error } = await supabase
    .from("property_views")
    .select(`id, property_id, viewed_at, property:properties(${PROPERTIES_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(limit * 3);

  if (error) {
    console.error("fetchRecentViewedCards:", error.message);
    return [];
  }

  const seen = new Set<string>();
  const cards: PropertyCardProps[] = [];

  for (const row of (data as unknown as PropertyViewRow[]) ?? []) {
    if (seen.has(row.property_id)) continue;
    seen.add(row.property_id);
    const card = mapViewRow(row);
    if (card) cards.push(card);
    if (cards.length >= limit) break;
  }

  return cards;
}

export async function fetchRecentViewedWithMeta(userId: string, limit = 6) {
  const { data, error } = await supabase
    .from("property_views")
    .select(`id, property_id, viewed_at, property:properties(${PROPERTIES_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(limit * 3);

  if (error) {
    console.error("fetchRecentViewedWithMeta:", error.message);
    return [];
  }

  const seen = new Set<string>();
  const results: (PropertyCardProps & { viewedAt: string })[] = [];

  for (const row of (data as unknown as PropertyViewRow[]) ?? []) {
    if (seen.has(row.property_id)) continue;
    seen.add(row.property_id);
    const card = mapViewRow(row);
    if (card) {
      results.push({ ...card, viewedAt: row.viewed_at });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function fetchUpcomingVisits(userId: string, limit = 3): Promise<SiteVisitRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("site_visits")
    .select(
      "id, property_id, visit_date, visit_time, status, purpose, visit_location, builder_name, checklist, property:properties(title, location, city)",
    )
    .eq("user_id", userId)
    .gte("visit_date", today)
    .in("status", ["pending_approval", "accepted", "scheduled", "rescheduled"])
    .order("visit_date", { ascending: true })
    .order("visit_time", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("fetchUpcomingVisits:", error.message);
    return [];
  }

  return ((data as SiteVisitRow[]) ?? []).sort((a, b) => {
    // Approved before pending within same day (client-side polish).
    const rank = (s: string) =>
      s === "accepted" || s === "scheduled" || s === "rescheduled" ? 0 : 1;
    if (a.visit_date === b.visit_date) return rank(a.status) - rank(b.status);
    return 0;
  });
}

export async function fetchRecommendedPropertyCards(
  userId: string,
  preferredLocations: string[] = [],
  limit = 4,
) {
  const { getLiveProperties } = await import("@/lib/properties/getLiveProperties");
  const city =
    preferredLocations.length === 1 ? preferredLocations[0] : undefined;
  let rows = await getLiveProperties({
    includeSeller: true,
    limit: preferredLocations.length > 1 ? limit * 4 : limit,
    city,
  });

  if (preferredLocations.length > 1) {
    const allowed = new Set(preferredLocations.map((c) => c.toLowerCase()));
    rows = rows
      .filter((r) => allowed.has((r.city || "").toLowerCase()))
      .slice(0, limit);
  }

  return rows.map((row) => rowToCard(row as PropertyRow));
}

export async function fetchSiteVisits(userId: string): Promise<SiteVisitRow[]> {
  const { data, error } = await supabase
    .from("site_visits")
    .select(
      "id, property_id, visit_date, visit_time, status, purpose, visit_location, builder_name, checklist, property:properties(title, location, city)",
    )
    .eq("user_id", userId)
    .order("visit_date", { ascending: true })
    .order("visit_time", { ascending: true });

  if (error) {
    console.error("fetchSiteVisits:", error.message);
    return [];
  }

  return (data as SiteVisitRow[]) ?? [];
}

export async function updateBuyerProfile(
  userId: string,
  payload: BuyerProfileUpdate,
): Promise<{ error: string | null }> {
  const result = await updateBuyerProfileSafe(userId, payload);
  return { error: result.error };
}

export function formatVisitTime(time?: string | null): string {
  if (!time || typeof time !== "string") return "—";
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  if (Number.isNaN(hour)) return time;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${minutes ?? "00"} ${ampm}`;
}

export function formatVisitDate(date?: string | null): string {
  if (!date || typeof date !== "string") return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
