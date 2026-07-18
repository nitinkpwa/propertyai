import { fetchSiteVisitsWithBuyers } from "@/lib/crm/buyerProfile";
import {
  buildNearbyPlacesPayload,
  emptyPropertyStructuredMeta,
  extractNearbyPlacesList,
  extractPropertyMeta,
} from "@/lib/properties/nearbyPlacesMeta";
import {
  PROPERTY_STATUS,
  PROPERTY_STATUS_DEFAULT_CREATE,
  toPropertyStatus,
} from "@/lib/properties/status";
import { pickWritableProfileFields } from "@/lib/profiles/schema";
import { supabase } from "@/lib/supabase";
import {
  patchPublishingWorkflow,
  workflowForSellerSave,
} from "./listingStatus";
import { PROPERTIES_SELLER_SELECT } from "./propertySchema";
import type {
  LeadStatus,
  PropertyFormState,
  PropertyListingStatus,
  SellerAnalytics,
  SellerDashboardStats,
  SellerLeadRow,
  SellerNotification,
  SellerProfile,
  SellerPropertyRow,
  SellerVisitRow,
  VisitStatus,
} from "./types";

const PROPERTY_SELECT = PROPERTIES_SELLER_SELECT;

const PROPERTY_PHOTOS_BUCKET = "property-photos";

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${PROPERTY_PHOTOS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] ?? "");
}

function buildSellerNearbyPlaces(
  formNearby: string,
  existingNearby: unknown,
  workflowStatus: string,
) {
  const fromForm = formNearby
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, distance: "", type: "mall" }));
  const places =
    fromForm.length > 0 ? fromForm : extractNearbyPlacesList(existingNearby);
  const baseMeta = extractPropertyMeta(existingNearby) ?? emptyPropertyStructuredMeta();
  const meta = patchPublishingWorkflow(baseMeta, workflowStatus);
  return buildNearbyPlacesPayload(places, meta);
}

function nearbyPlacesToFormString(raw: unknown): string {
  const places = extractNearbyPlacesList(raw);
  if (places.length) return places.map((p) => p.name).join(", ");
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item : ""))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function countByPropertyId(rows: Array<{ property_id: string }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.property_id] = (map[row.property_id] ?? 0) + 1;
  }
  return map;
}

async function fetchSellerPropertyIds(sellerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("seller_id", sellerId);

  if (error) {
    console.error("fetchSellerPropertyIds:", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.id);
}

export async function fetchSellerDashboardStats(
  sellerId: string,
): Promise<SellerDashboardStats> {
  const propertyIds = await fetchSellerPropertyIds(sellerId);

  const { data: properties, error: propError } = await supabase
    .from("properties")
    .select("id, status")
    .eq("seller_id", sellerId);

  if (propError) console.error("fetchSellerDashboardStats properties:", propError.message);

  const rows = properties ?? [];
  const stats: SellerDashboardStats = {
    totalProperties: rows.length,
    activeListings: rows.filter((p) => p.status === "active").length,
    draftListings: rows.filter((p) => p.status === "paused").length,
    soldListings: rows.filter((p) => p.status === "sold").length,
    totalViews: 0,
    savedByBuyers: 0,
    leadsReceived: 0,
    siteVisits: 0,
  };

  if (propertyIds.length === 0) return stats;

  const [views, saves, leads, visits] = await Promise.all([
    supabase.from("property_views").select("id", { count: "exact", head: true }).in("property_id", propertyIds),
    supabase.from("saved_properties").select("id", { count: "exact", head: true }).in("property_id", propertyIds),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("seller_id", sellerId),
    supabase.from("site_visits").select("id", { count: "exact", head: true }).in("property_id", propertyIds),
  ]);

  stats.totalViews = views.count ?? 0;
  stats.savedByBuyers = saves.count ?? 0;
  stats.leadsReceived = (leads.count ?? 0) + (visits.count ?? 0);
  stats.siteVisits = visits.count ?? 0;

  return stats;
}

export async function fetchSellerProperties(
  sellerId: string,
): Promise<SellerPropertyRow[]> {
  console.log("[fetchSellerProperties] start", { sellerId });
  const primary = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false, nullsFirst: false });

  let rows = primary.data;
  let fetchError = primary.error;

  // Resilient fallback before site_visit_enabled migration is applied.
  if (
    fetchError &&
    (fetchError.message.includes("site_visit_enabled") || fetchError.code === "42703")
  ) {
    const fallbackSelect = PROPERTY_SELECT.replace(", site_visit_enabled", "");
    const fallback = await supabase
      .from("properties")
      .select(fallbackSelect)
      .eq("seller_id", sellerId)
      .order("updated_at", { ascending: false, nullsFirst: false });
    rows = fallback.data as typeof primary.data;
    fetchError = fallback.error;
  }

  console.log("[fetchSellerProperties] response", {
    count: rows?.length ?? 0,
    error: fetchError ?? null,
    ids: (rows ?? []).map((r) => r.id),
  });

  if (fetchError) {
    console.error("fetchSellerProperties:", fetchError.message, fetchError);
    throw new Error(`Failed to load properties: ${fetchError.message}`);
  }

  const properties = (rows ?? []) as Omit<
    SellerPropertyRow,
    "view_count" | "save_count" | "lead_count"
  >[];
  if (properties.length === 0) return [];

  const ids = properties.map((p) => p.id);

  const [viewsRes, savesRes, leadsRes] = await Promise.all([
    supabase.from("property_views").select("property_id").in("property_id", ids),
    supabase.from("saved_properties").select("property_id").in("property_id", ids),
    supabase.from("inquiries").select("property_id").eq("seller_id", sellerId).in("property_id", ids),
  ]);

  const viewMap = countByPropertyId(viewsRes.data ?? []);
  const saveMap = countByPropertyId(savesRes.data ?? []);
  const leadMap = countByPropertyId(leadsRes.data ?? []);

  return properties.map((p) => ({
    ...p,
    view_count: viewMap[p.id] ?? 0,
    save_count: saveMap[p.id] ?? 0,
    lead_count: leadMap[p.id] ?? 0,
  }));
}

export async function fetchSellerLeads(sellerId: string): Promise<SellerLeadRow[]> {
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      "*, property:properties(title, location, city), buyer:profiles!inquiries_from_user_id_fkey(full_name, email, phone)",
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchSellerLeads:", error.message);
    return [];
  }

  return (data ?? []) as SellerLeadRow[];
}

export async function updateLeadStatus(
  leadId: string,
  sellerId: string,
  status: LeadStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", leadId)
    .eq("seller_id", sellerId);

  if (error) {
    console.error("updateLeadStatus:", error.message);
    return false;
  }
  return true;
}

export async function fetchSellerSiteVisits(sellerId: string): Promise<SellerVisitRow[]> {
  const propertyIds = await fetchSellerPropertyIds(sellerId);
  if (propertyIds.length === 0) return [];

  return fetchSiteVisitsWithBuyers<SellerVisitRow>({
    filter: { propertyIds },
    order: { column: "created_at", ascending: false },
  });
}

export async function updateVisitStatus(
  visitId: string,
  sellerId: string,
  status: VisitStatus,
): Promise<boolean> {
  const propertyIds = await fetchSellerPropertyIds(sellerId);
  if (propertyIds.length === 0) return false;

  const { error } = await supabase
    .from("site_visits")
    .update({ status })
    .eq("id", visitId)
    .in("property_id", propertyIds);

  if (error) {
    console.error("updateVisitStatus:", error.message);
    return false;
  }
  return true;
}

export async function rescheduleVisit(
  visitId: string,
  sellerId: string,
  visitDate: string,
  visitTime: string,
): Promise<boolean> {
  const propertyIds = await fetchSellerPropertyIds(sellerId);
  if (propertyIds.length === 0) return false;

  const { error } = await supabase
    .from("site_visits")
    .update({ visit_date: visitDate, visit_time: visitTime, status: "scheduled" })
    .eq("id", visitId)
    .in("property_id", propertyIds);

  if (error) {
    console.error("rescheduleVisit:", error.message);
    return false;
  }
  return true;
}

export async function fetchSellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
  const properties = await fetchSellerProperties(sellerId);
  const propertyIds = properties.map((p) => p.id);

  const empty: SellerAnalytics = {
    totalViews: 0,
    totalFavorites: 0,
    totalLeads: 0,
    totalVisits: 0,
    mostViewedProperty: null,
    mostSavedProperty: null,
    monthlyViews: [],
    hasData: false,
  };

  if (propertyIds.length === 0) return empty;

  const [viewsRes, savesRes, leadsRes, visitsRes] = await Promise.all([
    supabase.from("property_views").select("property_id, viewed_at").in("property_id", propertyIds),
    supabase.from("saved_properties").select("property_id").in("property_id", propertyIds),
    supabase.from("inquiries").select("id").eq("seller_id", sellerId),
    supabase.from("site_visits").select("id").in("property_id", propertyIds),
  ]);

  const views = viewsRes.data ?? [];
  const saves = savesRes.data ?? [];

  const viewMap = countByPropertyId(views);
  const saveMap = countByPropertyId(saves);

  const mostViewed = properties
    .map((p) => ({ id: p.id, title: p.title, count: viewMap[p.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)[0];

  const mostSaved = properties
    .map((p) => ({ id: p.id, title: p.title, count: saveMap[p.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)[0];

  const monthMap: Record<string, number> = {};
  for (const v of views) {
    const month = new Date(v.viewed_at).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
    monthMap[month] = (monthMap[month] ?? 0) + 1;
  }

  const monthlyViews = Object.entries(monthMap)
    .map(([month, count]) => ({ month, count }))
    .slice(-6);

  const totalViews = views.length;
  const totalFavorites = saves.length;
  const totalLeads = leadsRes.data?.length ?? 0;
  const totalVisits = visitsRes.data?.length ?? 0;

  return {
    totalViews,
    totalFavorites,
    totalLeads,
    totalVisits,
    mostViewedProperty: mostViewed && mostViewed.count > 0 ? mostViewed : null,
    mostSavedProperty: mostSaved && mostSaved.count > 0 ? mostSaved : null,
    monthlyViews,
    hasData: totalViews + totalFavorites + totalLeads + totalVisits > 0,
  };
}

export async function fetchSellerNotifications(
  sellerId: string,
): Promise<SellerNotification[]> {
  const [leads, properties] = await Promise.all([
    fetchSellerLeads(sellerId),
    fetchSellerProperties(sellerId),
  ]);

  const propertyIds = properties.map((p) => p.id);
  const notifications: SellerNotification[] = [];

  for (const lead of leads.filter((l) => l.status === "new").slice(0, 10)) {
    notifications.push({
      id: `lead-${lead.id}`,
      type: "lead",
      title: "New Lead",
      message: `${lead.buyer?.full_name ?? "A buyer"} inquired about ${lead.property?.title ?? "your property"}`,
      created_at: lead.created_at,
    });
  }

  if (propertyIds.length > 0) {
    const { data: saves } = await supabase
      .from("saved_properties")
      .select("id, property_id, created_at, property:properties(title)")
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false })
      .limit(10);

    for (const save of saves ?? []) {
      const prop = save.property as { title?: string } | null;
      notifications.push({
        id: `save-${save.id}`,
        type: "save",
        title: "Property Saved",
        message: `A buyer saved ${prop?.title ?? "your listing"}`,
        created_at: save.created_at,
      });
    }

    const { data: visits } = await supabase
      .from("site_visits")
      .select("id, visit_date, visit_time, created_at, property:properties(title)")
      .in("property_id", propertyIds)
      .eq("status", "scheduled")
      .order("created_at", { ascending: false })
      .limit(10);

    for (const visit of visits ?? []) {
      const prop = visit.property as { title?: string } | null;
      notifications.push({
        id: `visit-${visit.id}`,
        type: "visit",
        title: "Site Visit Booked",
        message: `Visit requested for ${prop?.title ?? "your property"} on ${visit.visit_date}`,
        created_at: visit.created_at,
      });
    }
  }

  for (const prop of properties.filter((p) => p.status === "active").slice(0, 3)) {
    if (prop.updated_at && prop.created_at !== prop.updated_at) {
      notifications.push({
        id: `approval-${prop.id}`,
        type: "approval",
        title: "Listing Active",
        message: `${prop.title} is live on AreaIQ`,
        created_at: prop.updated_at,
      });
    }
  }

  return notifications.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function formToPayload(
  form: PropertyFormState,
  user: { id: string; full_name?: string | null },
  photos: string[],
  options?: {
    status?: PropertyListingStatus;
    asDraft?: boolean;
    existingNearbyPlaces?: unknown;
  },
) {
  const asDraft = options?.asDraft ?? false;
  const workflow = workflowForSellerSave(asDraft);
  const featured =
    form.featured_image?.trim() || photos[0] || null;

  return {
    title: form.title.trim(),
    description: form.description || null,
    type: form.type,
    sub_type: form.sub_type,
    price: parseFloat(form.price),
    area_sqft: parseFloat(form.area_sqft) || null,
    bedrooms: parseInt(form.bedrooms, 10) || null,
    bathrooms: parseInt(form.bathrooms, 10) || null,
    location: form.location.trim(),
    city: form.city,
    sector: form.sector || null,
    lat: form.lat ? parseFloat(form.lat) : null,
    lng: form.lng ? parseFloat(form.lng) : null,
    contact_name: form.contact_name || user.full_name || null,
    contact_phone: form.contact_phone || null,
    amenities: form.amenities
      ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean)
      : [],
    photos,
    builder_name: form.builder_name || null,
    furnishing: form.furnishing || null,
    parking: form.parking || null,
    facing: form.facing || null,
    rera_number: form.rera_number || null,
    possession: form.possession || null,
    featured_image: featured,
    nearby_places: buildSellerNearbyPlaces(
      form.nearby_places,
      options?.existingNearbyPlaces ?? null,
      workflow,
    ),
    site_visit_enabled: form.site_visit_enabled !== false,
    status: toPropertyStatus(options?.status ?? PROPERTY_STATUS_DEFAULT_CREATE),
    updated_at: new Date().toISOString(),
  };
}

export function propertyRowToFormState(prop: SellerPropertyRow): PropertyFormState {
  return {
    title: prop.title ?? "",
    description: prop.description ?? "",
    type: prop.type,
    sub_type: prop.sub_type,
    price: prop.price?.toString() ?? "",
    area_sqft: prop.area_sqft?.toString() ?? "",
    bedrooms: prop.bedrooms?.toString() ?? "",
    bathrooms: prop.bathrooms?.toString() ?? "",
    location: prop.location ?? "",
    city: prop.city ?? "Mohali",
    sector: prop.sector ?? "",
    builder_name: prop.builder_name ?? "",
    furnishing: prop.furnishing ?? "",
    parking: prop.parking ?? "",
    facing: prop.facing ?? "",
    amenities: (prop.amenities ?? []).join(", "),
    nearby_places: nearbyPlacesToFormString(prop.nearby_places),
    lat: prop.lat?.toString() ?? "",
    lng: prop.lng?.toString() ?? "",
    rera_number: prop.rera_number ?? "",
    possession: prop.possession ?? "",
    featured_image: prop.featured_image ?? "",
    contact_name: prop.contact_name ?? "",
    contact_phone: prop.contact_phone ?? "",
    site_visit_enabled: prop.site_visit_enabled ?? true,
  };
}

export async function saveSellerProperty(
  sellerId: string,
  payload: ReturnType<typeof formToPayload>,
  editId?: string | null,
  options?: { asDraft?: boolean },
): Promise<{ ok: boolean; error?: string; propertyId?: string }> {
  const asDraft = options?.asDraft ?? false;

  console.log("[saveSellerProperty] start", {
    sellerId,
    editId: editId ?? null,
    asDraft,
    status: payload.status,
    title: payload.title,
    photos: Array.isArray(payload.photos) ? payload.photos.length : 0,
  });

  if (editId) {
    const { data: existing, error: existingError } = await supabase
      .from("properties")
      .select("id, status, seller_id, nearby_places")
      .eq("id", editId)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (existingError) {
      console.error("[saveSellerProperty] fetch existing failed", existingError);
      return { ok: false, error: existingError.message };
    }
    if (!existing) {
      return {
        ok: false,
        error: "Could not load this listing for edit (not found or not owned by you).",
      };
    }

    const updatePayload: Record<string, unknown> = { ...payload };

    // Never let sellers self-publish. Keep active/sold/rented; drafts stay paused.
    if (existing.status === PROPERTY_STATUS.ACTIVE) {
      updatePayload.status = PROPERTY_STATUS.ACTIVE;
    } else if (
      existing.status === PROPERTY_STATUS.SOLD ||
      existing.status === PROPERTY_STATUS.RENTED
    ) {
      updatePayload.status = existing.status;
    } else {
      updatePayload.status = PROPERTY_STATUS_DEFAULT_CREATE;
    }

    // Ensure workflow meta reflects Save as Draft vs Submit for Review.
    updatePayload.nearby_places = buildSellerNearbyPlaces(
      extractNearbyPlacesList(payload.nearby_places)
        .map((p) => p.name)
        .join(", "),
      existing.nearby_places,
      workflowForSellerSave(asDraft),
    );

    let { data, error } = await supabase
      .from("properties")
      .update(updatePayload)
      .eq("id", editId)
      .eq("seller_id", sellerId)
      .select("id")
      .maybeSingle();

    if (
      error &&
      (error.message.includes("site_visit_enabled") || error.code === "42703")
    ) {
      const { site_visit_enabled: _sv, ...withoutVisitFlag } = updatePayload;
      ({ data, error } = await supabase
        .from("properties")
        .update(withoutVisitFlag)
        .eq("id", editId)
        .eq("seller_id", sellerId)
        .select("id")
        .maybeSingle());
    }

    console.log("[saveSellerProperty] update response", { data, error });
    if (error) return { ok: false, error: error.message };
    if (!data?.id) {
      return {
        ok: false,
        error:
          "Update reported no row. Check RLS: sellers need SELECT/UPDATE on their own properties.",
      };
    }
    return { ok: true, propertyId: data.id };
  }

  const insertBody = {
    ...payload,
    status: PROPERTY_STATUS_DEFAULT_CREATE,
    seller_id: sellerId,
  };
  console.log("[saveSellerProperty] insert payload", insertBody);

  let { data, error } = await supabase
    .from("properties")
    .insert(insertBody)
    .select("id, status, seller_id, title")
    .maybeSingle();

  if (
    error &&
    (error.message.includes("site_visit_enabled") || error.code === "42703")
  ) {
    const { site_visit_enabled: _sv, ...withoutVisitFlag } = insertBody;
    ({ data, error } = await supabase
      .from("properties")
      .insert(withoutVisitFlag)
      .select("id, status, seller_id, title")
      .maybeSingle());
  }

  console.log("[saveSellerProperty] insert response", { data, error });

  if (error) {
    return { ok: false, error: `${error.message}${error.code ? ` (${error.code})` : ""}` };
  }
  if (!data?.id) {
    return {
      ok: false,
      error:
        "Insert returned no row. The listing may have been written but RLS is blocking SELECT.",
    };
  }

  return { ok: true, propertyId: data.id };
}

/** @deprecated Use deleteSellerProperty — soft delete only paused the row and looked like a no-op. */
export async function softDeleteProperty(
  propertyId: string,
  sellerId: string,
): Promise<boolean> {
  const result = await deleteSellerProperty(propertyId, sellerId);
  return result.ok;
}

/** Permanently delete a seller-owned property and its storage images. */
export async function deleteSellerProperty(
  propertyId: string,
  sellerId: string,
): Promise<{ ok: boolean; error?: string }> {
  console.log("[deleteSellerProperty] start", { propertyId, sellerId });

  const { data: existing, error: fetchError } = await supabase
    .from("properties")
    .select("id, seller_id, photos, featured_image")
    .eq("id", propertyId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteSellerProperty] fetch failed", fetchError);
    return { ok: false, error: fetchError.message };
  }
  if (!existing) {
    return { ok: false, error: "Property not found or you do not own it." };
  }

  const urls = [
    ...(Array.isArray(existing.photos) ? existing.photos : []),
    existing.featured_image,
  ].filter((u): u is string => typeof u === "string" && u.length > 0);

  const paths = [...new Set(urls.map(storagePathFromPublicUrl).filter(Boolean))] as string[];
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(PROPERTY_PHOTOS_BUCKET)
      .remove(paths);
    if (storageError) {
      console.warn("[deleteSellerProperty] storage cleanup warning", storageError.message);
      // Continue — DB row delete is the source of truth for the listing.
    } else {
      console.log("[deleteSellerProperty] removed storage paths", paths);
    }
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .eq("seller_id", sellerId)
    .select("id")
    .maybeSingle();

  console.log("[deleteSellerProperty] delete response", { deleted, deleteError });

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }
  if (!deleted?.id) {
    return {
      ok: false,
      error:
        "Delete reported no row. Check RLS: sellers need DELETE on their own properties.",
    };
  }

  return { ok: true };
}

export async function updatePropertyStatus(
  propertyId: string,
  sellerId: string,
  status: PropertyListingStatus,
): Promise<{ ok: boolean; error?: string }> {
  // Sellers may pause or mark sold/rented, but never publish (activate).
  if (status === PROPERTY_STATUS.ACTIVE) {
    return {
      ok: false,
      error: "Only AreaIQ admin can publish listings after review.",
    };
  }

  const { error } = await supabase
    .from("properties")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", propertyId)
    .eq("seller_id", sellerId);

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function duplicateProperty(
  propertyId: string,
  sellerId: string,
): Promise<{ ok: boolean; error?: string; propertyId?: string }> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("id", propertyId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Property not found or you do not own it." };

  const row = data as Record<string, unknown>;
  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    views: _views,
    deleted_at: _deleted,
    connect_partner_id: _cp,
    assigned_connect_id: _ac,
    ...rest
  } = row;

  const nearby = buildSellerNearbyPlaces(
    extractNearbyPlacesList(row.nearby_places)
      .map((p) => p.name)
      .join(", "),
    row.nearby_places,
    "draft",
  );

  const { data: inserted, error: insertError } = await supabase
    .from("properties")
    .insert({
      ...rest,
      title: `Copy of ${String(row.title ?? "Listing")}`,
      status: PROPERTY_STATUS_DEFAULT_CREATE,
      seller_id: sellerId,
      nearby_places: nearby,
      is_featured: false,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (insertError) return { ok: false, error: insertError.message };
  if (!inserted?.id) {
    return { ok: false, error: "Duplicate insert returned no row (check RLS SELECT)." };
  }
  return { ok: true, propertyId: inserted.id };
}

export async function fetchSellerProfile(userId: string): Promise<SellerProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("fetchSellerProfile:", error.message);
    return null;
  }
  return data as SellerProfile;
}

export async function updateSellerProfile(
  userId: string,
  profile: Partial<SellerProfile>,
): Promise<boolean> {
  const safePatch = pickWritableProfileFields(profile as Record<string, unknown>);
  if (Object.keys(safePatch).length === 0) return true;

  const { error } = await supabase.from("profiles").update(safePatch).eq("id", userId);
  if (error) {
    console.error("updateSellerProfile:", error.message);
    return false;
  }
  return true;
}

export async function uploadPropertyPhotos(
  userId: string,
  files: File[],
): Promise<string[]> {
  console.log("[uploadPropertyPhotos] start", { userId, fileCount: files.length });
  const uploaded: string[] = [];
  const failures: string[] = [];
  for (const photo of files) {
    const ext = photo.name.split(".").pop();
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("property-photos")
      .upload(filename, photo);
    if (error || !data) {
      console.error("[uploadPropertyPhotos] failed", { name: photo.name, error });
      failures.push(`${photo.name}: ${error?.message ?? "upload failed"}`);
      continue;
    }
    const { data: urlData } = supabase.storage
      .from("property-photos")
      .getPublicUrl(filename);
    uploaded.push(urlData.publicUrl);
  }
  console.log("[uploadPropertyPhotos] done", {
    uploaded: uploaded.length,
    failures,
  });
  return uploaded;
}

export async function uploadSellerAsset(
  userId: string,
  file: File,
  folder: "logo" | "avatar",
): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const filename = `${userId}/${folder}-${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from("property-photos")
    .upload(filename, file);
  if (error || !data) return null;
  const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(filename);
  return urlData.publicUrl;
}
