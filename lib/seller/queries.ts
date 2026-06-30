import { supabase } from "@/lib/supabase";
import { PROPERTIES_BASE_SELECT } from "./propertySchema";
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

const PROPERTY_SELECT = PROPERTIES_BASE_SELECT;

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
    draftListings: rows.filter((p) => p.status === "draft").length,
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
  stats.leadsReceived = leads.count ?? 0;
  stats.siteVisits = visits.count ?? 0;

  return stats;
}

export async function fetchSellerProperties(
  sellerId: string,
): Promise<SellerPropertyRow[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("fetchSellerProperties:", error.message);
    return [];
  }

  const properties = (data ?? []) as Omit<
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

  const { data, error } = await supabase
    .from("site_visits")
    .select("*, property:properties(title, location, city)")
    .in("property_id", propertyIds)
    .order("visit_date", { ascending: true });

  if (error) {
    console.error("fetchSellerSiteVisits:", error.message);
    return [];
  }

  const visits = (data ?? []) as SellerVisitRow[];
  const userIds = [...new Set(visits.map((v) => v.user_id))];
  if (userIds.length === 0) return visits;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email")
    .in("id", userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return visits.map((v) => ({
    ...v,
    buyer: profileMap[v.user_id] ?? null,
  }));
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
  status: PropertyListingStatus,
) {
  return {
    title: form.title,
    description: form.description || null,
    type: form.type,
    sub_type: form.sub_type,
    price: parseFloat(form.price),
    area_sqft: parseFloat(form.area_sqft) || null,
    bedrooms: parseInt(form.bedrooms, 10) || null,
    bathrooms: parseInt(form.bathrooms, 10) || null,
    location: form.location,
    city: form.city,
    sector: form.sector || null,
    lat: form.lat ? parseFloat(form.lat) : null,
    lng: form.lng ? parseFloat(form.lng) : null,
    contact_name: form.contact_name || user.full_name,
    contact_phone: form.contact_phone,
    amenities: form.amenities
      ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean)
      : [],
    photos,
    status,
    updated_at: new Date().toISOString(),
  };
}

export async function saveSellerProperty(
  sellerId: string,
  payload: ReturnType<typeof formToPayload>,
  editId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (editId) {
    const { error } = await supabase
      .from("properties")
      .update(payload)
      .eq("id", editId)
      .eq("seller_id", sellerId);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  const { error } = await supabase
    .from("properties")
    .insert({ ...payload, seller_id: sellerId });

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function softDeleteProperty(
  propertyId: string,
  sellerId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("properties")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", propertyId)
    .eq("seller_id", sellerId);

  return !error;
}

export async function updatePropertyStatus(
  propertyId: string,
  sellerId: string,
  status: PropertyListingStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("properties")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", propertyId)
    .eq("seller_id", sellerId);

  return !error;
}

export async function duplicateProperty(
  propertyId: string,
  sellerId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("id", propertyId)
    .eq("seller_id", sellerId)
    .single();

  if (error || !data) return false;

  const { id: _id, created_at: _c, updated_at: _u, ...rest } = data as Record<string, unknown>;
  const { error: insertError } = await supabase.from("properties").insert({
    ...rest,
    title: `Copy of ${data.title}`,
    status: "draft",
    seller_id: sellerId,
  });

  return !insertError;
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
  const { error } = await supabase.from("profiles").update(profile).eq("id", userId);
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
  const uploaded: string[] = [];
  for (const photo of files) {
    const ext = photo.name.split(".").pop();
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("property-photos")
      .upload(filename, photo);
    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from("property-photos")
        .getPublicUrl(filename);
      uploaded.push(urlData.publicUrl);
    }
  }
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
