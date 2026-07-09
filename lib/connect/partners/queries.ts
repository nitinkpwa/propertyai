import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateLeadScore } from "@/lib/crm/leadScore";
import type {
  ConnectPartner,
  ConnectPartnerActivityRow,
  ConnectPartnerAnalytics,
  ConnectPartnerBuyerRow,
  ConnectPartnerListRow,
} from "@/lib/connect/partners/types";

const PARTNER_SELECT = "*";

export async function fetchConnectPartnersList(
  supabase: SupabaseClient,
): Promise<ConnectPartnerListRow[]> {
  const { data: partners, error } = await supabase
    .from("connect_partners")
    .select(PARTNER_SELECT)
    .order("created_at", { ascending: false });

  if (error || !partners) {
    console.error("fetchConnectPartnersList:", error?.message);
    return [];
  }

  const partnerIds = partners.map((p) => p.id as string);

  // Buyer counts derive from partner-scoped CRM leads (property-based
  // ownership), never from buyer profile assignment.
  const [buyersRes, propertiesRes, activitiesRes] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("buyer_id, connect_partner_id")
      .in("connect_partner_id", partnerIds),
    supabase
      .from("properties")
      .select("id, connect_partner_id, status")
      .in("connect_partner_id", partnerIds)
      .is("deleted_at", null),
    supabase
      .from("connect_partner_activities")
      .select("partner_id, created_at")
      .in("partner_id", partnerIds)
      .order("created_at", { ascending: false }),
  ]);

  const buyersByPartner: Record<string, Set<string>> = {};
  for (const l of buyersRes.data ?? []) {
    const pid = l.connect_partner_id as string;
    (buyersByPartner[pid] ??= new Set()).add(l.buyer_id as string);
  }
  const buyerCounts: Record<string, number> = {};
  for (const [pid, set] of Object.entries(buyersByPartner)) {
    buyerCounts[pid] = set.size;
  }

  const listingCounts: Record<string, number> = {};
  for (const p of propertiesRes.data ?? []) {
    const pid = p.connect_partner_id as string;
    listingCounts[pid] = (listingCounts[pid] ?? 0) + 1;
  }

  const lastActivity: Record<string, string> = {};
  for (const a of activitiesRes.data ?? []) {
    const pid = a.partner_id as string;
    if (!lastActivity[pid]) lastActivity[pid] = a.created_at as string;
  }

  return (partners as ConnectPartner[]).map((p) => ({
    ...p,
    project_count: 0,
    listing_count: listingCounts[p.id] ?? 0,
    assigned_buyers: buyerCounts[p.id] ?? 0,
    last_activity_at: lastActivity[p.id] ?? null,
  }));
}

export async function fetchConnectPartnerById(
  supabase: SupabaseClient,
  partnerId: string,
): Promise<ConnectPartner | null> {
  const { data, error } = await supabase
    .from("connect_partners")
    .select(PARTNER_SELECT)
    .eq("id", partnerId)
    .maybeSingle();

  if (error) {
    console.error("fetchConnectPartnerById:", error.message);
    return null;
  }
  return (data as ConnectPartner) ?? null;
}

export async function fetchPartnerActivities(
  supabase: SupabaseClient,
  options: { partnerId?: string; limit?: number; offset?: number },
): Promise<ConnectPartnerActivityRow[]> {
  let query = supabase
    .from("connect_partner_activities")
    .select(
      "*, actor:profiles!connect_partner_activities_actor_id_fkey(id, full_name, role), buyer:profiles!connect_partner_activities_buyer_id_fkey(id, full_name, phone), property:properties!connect_partner_activities_property_id_fkey(id, title, city)",
    )
    .order("created_at", { ascending: false });

  if (options.partnerId) {
    query = query.eq("partner_id", options.partnerId);
  }

  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);

  const { data, error } = await query;

  if (error) {
    console.error("fetchPartnerActivities:", error.message);
    return [];
  }

  return (data as ConnectPartnerActivityRow[]) ?? [];
}

export async function fetchPartnerBuyers(
  supabase: SupabaseClient,
  partnerId: string,
): Promise<ConnectPartnerBuyerRow[]> {
  const buyerSelect =
    "id, full_name, phone, email, budget_min, budget_max, preferred_locations, preferred_property_types, buying_purpose, buying_timeline, buyer_notes, created_at";

  // Property-based ownership: a partner's buyers are exactly the buyers with a
  // partner-scoped CRM lead (created when they enquire / book a visit on a
  // property assigned to this partner). Buyer profile assignment is never used.
  const { data: leadRows, error: leadError } = await supabase
    .from("crm_leads")
    .select(
      `id, buyer_id, status, updated_at, primary_property_id, connect_assignment_source,
       lead_score, lead_temperature, engagement_score, conversion_probability,
       follow_up_date, next_action, last_call_at, last_whatsapp_at, last_email_at,
       buyer:profiles!crm_leads_buyer_id_fkey(${buyerSelect}),
       property:properties!crm_leads_primary_property_id_fkey(id, title, city)`,
    )
    .eq("connect_partner_id", partnerId)
    .order("updated_at", { ascending: false });

  if (leadError) {
    console.error("fetchPartnerBuyers crm_leads:", leadError.message);
  }

  const buyerMap = new Map<string, Record<string, unknown>>();
  const leadMetaMap = new Map<string, {
    lead_id: string;
    lead_status: string;
    property_id: string | null;
    property_title: string | null;
    property_city: string | null;
    lead_source: string | null;
    last_activity_at: string;
    lead_score: number;
    lead_temperature: "hot" | "warm" | "cold";
    follow_up_date: string | null;
    next_action: string | null;
    last_call_at: string | null;
    last_whatsapp_at: string | null;
    last_email_at: string | null;
  }>();

  for (const row of leadRows ?? []) {
    const rawBuyer = row.buyer as Record<string, unknown> | Record<string, unknown>[] | null;
    const buyer = Array.isArray(rawBuyer) ? rawBuyer[0] ?? null : rawBuyer;
    const rawProperty = row.property as Record<string, unknown> | Record<string, unknown>[] | null;
    const property = Array.isArray(rawProperty) ? rawProperty[0] ?? null : rawProperty;
    const buyerId = row.buyer_id as string;

    if (buyer?.id && !buyerMap.has(buyer.id as string)) {
      buyerMap.set(buyer.id as string, buyer);
    }
    if (buyerId && !leadMetaMap.has(buyerId)) {
      leadMetaMap.set(buyerId, {
        lead_id: row.id as string,
        lead_status: row.status as string,
        property_id: (property?.id as string) ?? (row.primary_property_id as string) ?? null,
        property_title: (property?.title as string) ?? null,
        property_city: (property?.city as string) ?? null,
        lead_source: (row.connect_assignment_source as string) ?? "property_enquiry",
        last_activity_at: row.updated_at as string,
        lead_score: (row.lead_score as number) ?? 0,
        lead_temperature: (row.lead_temperature as "hot" | "warm" | "cold") ?? "cold",
        follow_up_date: (row.follow_up_date as string) ?? null,
        next_action: (row.next_action as string) ?? null,
        last_call_at: (row.last_call_at as string) ?? null,
        last_whatsapp_at: (row.last_whatsapp_at as string) ?? null,
        last_email_at: (row.last_email_at as string) ?? null,
      });
    }
  }

  const buyers = [...buyerMap.values()];
  const buyerIds = buyers.map((b) => b.id as string);

  const [chatsRes, visitsRes] = await Promise.all([
    buyerIds.length > 0
      ? supabase
          .from("conversations")
          .select("user_id, updated_at")
          .in("user_id", buyerIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("site_visits")
      .select("user_id, status, visit_date, connect_partner_id")
      .eq("connect_partner_id", partnerId)
      .order("visit_date", { ascending: false }),
  ]);

  const lastChatMap = new Map<string, string>();
  for (const c of chatsRes.data ?? []) {
    const uid = c.user_id as string;
    if (!lastChatMap.has(uid)) lastChatMap.set(uid, c.updated_at as string);
  }

  const visitStatusMap = new Map<string, string>();
  for (const v of visitsRes.data ?? []) {
    const uid = v.user_id as string;
    if (!visitStatusMap.has(uid)) visitStatusMap.set(uid, v.status as string);
  }

  return buyers.map((buyer) => {
    const computed = calculateLeadScore({ profile: buyer });
    const meta = leadMetaMap.get(buyer.id as string);
    const persistedScore = meta?.lead_score ?? 0;
    const usePersisted = persistedScore > 0;
    return {
      ...buyer,
      email: (buyer.email as string) ?? null,
      preferred_locations: buyer.preferred_locations as string[] | null,
      preferred_property_types: buyer.preferred_property_types as string[] | null,
      lead_id: meta?.lead_id ?? null,
      lead_status: meta?.lead_status ?? "new",
      lead_score: usePersisted ? persistedScore : computed.score,
      lead_temperature: usePersisted && meta?.lead_temperature ? meta.lead_temperature : computed.temperature,
      last_chat_at: lastChatMap.get(buyer.id as string) ?? null,
      visit_status: visitStatusMap.get(buyer.id as string) ?? null,
      property_id: meta?.property_id ?? null,
      property_title: meta?.property_title ?? null,
      property_city: meta?.property_city ?? null,
      lead_source: meta?.lead_source ?? null,
      last_activity_at: meta?.last_activity_at ?? (buyer.created_at as string),
      follow_up_date: meta?.follow_up_date ?? null,
      next_action: meta?.next_action ?? null,
      last_call_at: meta?.last_call_at ?? null,
      last_whatsapp_at: meta?.last_whatsapp_at ?? null,
      last_email_at: meta?.last_email_at ?? null,
    } as ConnectPartnerBuyerRow;
  }).sort(
    (a, b) =>
      new Date(b.last_activity_at ?? b.created_at).getTime() -
      new Date(a.last_activity_at ?? a.created_at).getTime(),
  );
}

export async function fetchPartnerProperties(
  supabase: SupabaseClient,
  partnerId: string,
) {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, title, city, location, price, status, type, sub_type, photos, created_at, updated_at",
    )
    .eq("connect_partner_id", partnerId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("fetchPartnerProperties:", error.message);
    return [];
  }

  const properties = data ?? [];
  if (properties.length === 0) return [];

  const propertyIds = properties.map((p) => p.id as string);

  const [inquiriesRes, visitsRes, viewsRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select("property_id")
      .eq("connect_partner_id", partnerId)
      .in("property_id", propertyIds),
    supabase
      .from("site_visits")
      .select("property_id")
      .eq("connect_partner_id", partnerId)
      .in("property_id", propertyIds),
    supabase
      .from("property_views")
      .select("property_id")
      .in("property_id", propertyIds),
  ]);

  const enquiryCounts: Record<string, number> = {};
  for (const row of inquiriesRes.data ?? []) {
    const pid = row.property_id as string;
    enquiryCounts[pid] = (enquiryCounts[pid] ?? 0) + 1;
  }

  const visitCounts: Record<string, number> = {};
  for (const row of visitsRes.data ?? []) {
    const pid = row.property_id as string;
    visitCounts[pid] = (visitCounts[pid] ?? 0) + 1;
  }

  const hotLeadsByProperty: Record<string, number> = {};
  const buyers = await fetchPartnerBuyers(supabase, partnerId);
  for (const b of buyers) {
    if (b.lead_temperature === "hot" && b.property_id) {
      hotLeadsByProperty[b.property_id] = (hotLeadsByProperty[b.property_id] ?? 0) + 1;
    }
  }

  const viewCounts: Record<string, number> = {};
  for (const row of viewsRes.data ?? []) {
    const pid = row.property_id as string;
    viewCounts[pid] = (viewCounts[pid] ?? 0) + 1;
  }

  return properties.map((p) => ({
    ...p,
    photos: p.photos as string[] | null,
    enquiry_count: enquiryCounts[p.id as string] ?? 0,
    visit_count: visitCounts[p.id as string] ?? 0,
    hot_leads: hotLeadsByProperty[p.id as string] ?? 0,
    view_count: viewCounts[p.id as string] ?? 0,
  }));
}

export async function fetchPartnerAnalytics(
  supabase: SupabaseClient,
  partnerId: string,
): Promise<ConnectPartnerAnalytics> {
  const buyers = await fetchPartnerBuyers(supabase, partnerId);
  const properties = await fetchPartnerProperties(supabase, partnerId);

  const today = new Date().toISOString().slice(0, 10);
  const todaysBuyers = buyers.filter((b) => b.created_at.startsWith(today)).length;

  const hot = buyers.filter((b) => b.lead_temperature === "hot").length;
  const warm = buyers.filter((b) => b.lead_temperature === "warm").length;
  const cold = buyers.filter((b) => b.lead_temperature === "cold").length;

  // site_visits.status values are pending_approval | accepted | scheduled |
  // completed | rejected | cancelled. Count visits that are upcoming/active.
  const visitsScheduled = buyers.filter(
    (b) =>
      b.visit_status === "pending_approval" ||
      b.visit_status === "accepted" ||
      b.visit_status === "scheduled",
  ).length;

  const negotiation = buyers.filter((b) => b.lead_status === "negotiation").length;
  const closed = buyers.filter((b) => b.lead_status === "completed").length;
  const lost = buyers.filter((b) => b.lead_status === "lost").length;

  const { data: activities } = await supabase
    .from("connect_partner_activities")
    .select("created_at")
    .eq("partner_id", partnerId)
    .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

  const monthlyMap: Record<string, number> = {};
  for (const a of activities ?? []) {
    const month = (a.created_at as string).slice(0, 7);
    monthlyMap[month] = (monthlyMap[month] ?? 0) + 1;
  }

  const monthlyActivity = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  const responseTimes: number[] = [];
  for (const b of buyers) {
    if (b.last_call_at && b.last_activity_at) {
      const diff = new Date(b.last_call_at).getTime() - new Date(b.last_activity_at).getTime();
      if (diff > 0 && diff < 7 * 24 * 60 * 60 * 1000) {
        responseTimes.push(diff / (1000 * 60 * 60));
      }
    }
  }
  const responseTimeHours =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

  return {
    totalBuyers: buyers.length,
    todaysBuyers,
    hot,
    warm,
    cold,
    visitsScheduled,
    negotiation,
    closed,
    lost,
    properties: properties.length,
    listings: properties.filter((p) => p.status === "active").length,
    responseTimeHours,
    monthlyActivity,
  };
}

export async function getPartnerIdForProfile(
  supabase: SupabaseClient,
  profileId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("connect_partner_id, role")
    .eq("id", profileId)
    .maybeSingle();

  if (!data || data.role !== "builder") return null;
  return (data.connect_partner_id as string) ?? null;
}
