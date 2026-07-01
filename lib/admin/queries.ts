import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import {
  ADMIN_CRM_LEAD_SELECT,
  INQUIRY_WITH_BUYER_SELECT,
  SITE_VISIT_WITH_USER_SELECT,
  enrichLeadRowBuyer,
  enrichVisitRowBuyer,
  fetchBuyerProfilesByIds,
} from "@/lib/crm/buyerProfile";
import type {
  AdminAnalytics,
  AdminConversationRow,
  AdminData,
  AdminLeadRow,
  AdminOverviewStats,
  AdminPropertyRow,
  AdminSiteVisitRow,
  BuilderRow,
} from "./types";

const PROPERTY_SELECT =
  "*, seller:profiles!properties_seller_id_fkey(full_name, email, phone)";

let approvalColumnCache: boolean | null = null;
let siteVisitsTableCache: boolean | null = null;
let conversationsTableCache: boolean | null = null;

export async function hasApprovalStatusColumn(): Promise<boolean> {
  if (approvalColumnCache !== null) return approvalColumnCache;
  const { error } = await supabase.from("properties").select("approval_status").limit(1);
  approvalColumnCache = !error;
  return approvalColumnCache;
}

async function hasSiteVisitsTable(): Promise<boolean> {
  if (siteVisitsTableCache !== null) return siteVisitsTableCache;
  const { error } = await supabase.from("site_visits").select("id").limit(1);
  siteVisitsTableCache = !error;
  return siteVisitsTableCache;
}

async function hasConversationsTable(): Promise<boolean> {
  if (conversationsTableCache !== null) return conversationsTableCache;
  const { error } = await supabase.from("conversations").select("id").limit(1);
  conversationsTableCache = !error;
  return conversationsTableCache;
}

async function hasPropertyViewsTable(): Promise<boolean> {
  const { error } = await supabase.from("property_views").select("id").limit(1);
  return !error;
}

function countBy<T>(rows: T[], key: (row: T) => string): Array<{ status: string; count: number }> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row) || "unknown";
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map).map(([status, count]) => ({ status, count }));
}

export async function fetchAdminProperties(): Promise<AdminPropertyRow[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchAdminProperties:", error.message);
    return [];
  }
  return (data ?? []) as AdminPropertyRow[];
}

export async function fetchAdminProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchAdminProfiles:", error.message);
    return [];
  }
  return (data ?? []) as Profile[];
}

export async function fetchAdminLeads(): Promise<AdminLeadRow[]> {
  const [inquiryRes, crmRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select(INQUIRY_WITH_BUYER_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("crm_leads")
      .select(ADMIN_CRM_LEAD_SELECT)
      .order("updated_at", { ascending: false }),
  ]);

  if (inquiryRes.error) {
    console.error("fetchAdminLeads inquiries:", inquiryRes.error.message);
  }
  if (crmRes.error) {
    console.error("fetchAdminLeads crm:", crmRes.error.message);
  }

  const inquiryRows: AdminLeadRow[] = (inquiryRes.data ?? []).map((row) => {
    const enriched = enrichLeadRowBuyer({
      ...(row as unknown as Record<string, unknown>),
      status: (row as { status?: string }).status,
      leadSource: "Inquiry" as const,
    });
    return {
      ...(row as unknown as AdminLeadRow),
      buyer: enriched.buyer,
      leadSource: "Inquiry" as const,
      crmStatus: null,
    };
  });

  const crmRows: AdminLeadRow[] = await Promise.all(
    ((crmRes.data ?? []) as Array<Record<string, unknown>>).map(async (lead) => {
      const property = lead.property as {
        title?: string;
        city?: string;
        seller?: { full_name?: string | null };
      } | null;

      const { data: visitActivity } = await supabase
        .from("crm_lead_activities")
        .select("activity_type, property:properties(title, city, seller:profiles!properties_seller_id_fkey(full_name))")
        .eq("lead_id", lead.id as string)
        .in("activity_type", ["visit_requested", "site_visit_booked"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const visitProp = visitActivity?.property as {
        title?: string;
        city?: string;
        seller?: { full_name?: string | null };
      } | null;

      const hasVisit = Boolean(visitActivity);
      const propTitle = visitProp?.title ?? property?.title ?? null;
      const sellerName = visitProp?.seller?.full_name ?? property?.seller?.full_name ?? null;

      return {
        id: lead.id as string,
        from_user_id: lead.buyer_id as string,
        property_id: (lead.primary_property_id as string) ?? "",
        seller_id: "",
        message: hasVisit ? "Site visit requested" : "CRM lead",
        status: lead.status as AdminLeadRow["status"],
        created_at: lead.created_at as string,
        buyer: enrichLeadRowBuyer({
          ...(lead as Record<string, unknown>),
          status: lead.status as string,
          leadSource: hasVisit ? ("Site Visit" as const) : ("CRM" as const),
        }).buyer,
        property: propTitle ? { title: propTitle, city: visitProp?.city ?? property?.city } : null,
        seller: sellerName ? { full_name: sellerName } : null,
        leadSource: hasVisit ? ("Site Visit" as const) : ("CRM" as const),
        crmStatus: lead.status as string,
        assignedConnect: (lead.connect as { full_name?: string | null } | null)?.full_name ?? null,
        crmLeadId: lead.id as string,
      } as AdminLeadRow;
    }),
  );

  const seenBuyers = new Set(inquiryRows.map((r) => r.from_user_id));
  const merged = [
    ...inquiryRows,
    ...crmRows.filter((r) => !seenBuyers.has(r.from_user_id) || r.leadSource === "Site Visit"),
  ];

  return merged.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function fetchAdminConversations(): Promise<AdminConversationRow[]> {
  if (!(await hasConversationsTable())) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("*, user:profiles(full_name, email, phone)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchAdminConversations:", error.message);
    return [];
  }
  return (data ?? []) as AdminConversationRow[];
}

export async function fetchAdminSiteVisits(): Promise<AdminSiteVisitRow[]> {
  if (!(await hasSiteVisitsTable())) return [];

  const { data, error } = await supabase
    .from("site_visits")
    .select(SITE_VISIT_WITH_USER_SELECT)
    .order("visit_date", { ascending: false });

  if (error) {
    console.error("fetchAdminSiteVisits:", error.message);

    const { data: fallback } = await supabase
      .from("site_visits")
      .select("*, property:properties(title, city)")
      .order("visit_date", { ascending: false });

    const visits = (fallback ?? []) as AdminSiteVisitRow[];
    const userIds = [...new Set(visits.map((v) => v.user_id))];
    const profileMap = await fetchBuyerProfilesByIds(userIds);

    return visits.map((v) => ({
      ...v,
      buyer: profileMap.get(v.user_id) ?? null,
    }));
  }

  return ((data ?? []) as AdminSiteVisitRow[]).map((row) => {
    const enriched = enrichVisitRowBuyer({ ...row } as Record<string, unknown>);
    return { ...row, buyer: enriched.buyer };
  });
}

export function buildOverviewStats(input: {
  properties: AdminPropertyRow[];
  profiles: Profile[];
  leads: AdminLeadRow[];
  conversations: AdminConversationRow[];
  siteVisits: AdminSiteVisitRow[];
  usesApprovalStatus: boolean;
}): AdminOverviewStats {
  const pending = input.usesApprovalStatus
    ? input.properties.filter((p) => p.approval_status === "pending").length
    : input.properties.filter((p) => p.status === "draft").length;

  const approved = input.usesApprovalStatus
    ? input.properties.filter((p) => p.approval_status === "approved").length
    : input.properties.filter((p) => p.status === "active").length;

  return {
    totalProperties: input.properties.length,
    pendingProperties: pending,
    approvedProperties: approved,
    buyers: input.profiles.filter((p) => p.role === "buyer").length,
    sellers: input.profiles.filter((p) => p.role === "seller").length,
    builders: input.profiles.filter((p) => p.role === "builder").length,
    siteVisits: input.siteVisits.length,
    aiChats: input.conversations.length,
    leads: input.leads.length,
  };
}

export function buildAnalytics(input: {
  properties: AdminPropertyRow[];
  profiles: Profile[];
  leads: AdminLeadRow[];
  usesApprovalStatus: boolean;
  hasSiteVisitsTable: boolean;
  hasPropertyViewsTable: boolean;
}): AdminAnalytics {
  const cityMap: Record<string, number> = {};
  for (const p of input.properties) {
    const city = p.city?.trim() || "Unknown";
    cityMap[city] = (cityMap[city] ?? 0) + 1;
  }

  return {
    propertiesByStatus: countBy(input.properties, (p) => p.status),
    leadsByStatus: countBy(input.leads, (l) => l.status),
    usersByRole: countBy(input.profiles, (p) => p.role).map(({ status, count }) => ({
      role: status,
      count,
    })),
    propertiesByCity: Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    hasSiteVisitsTable: input.hasSiteVisitsTable,
    hasPropertyViewsTable: input.hasPropertyViewsTable,
    usesApprovalStatus: input.usesApprovalStatus,
  };
}

export async function fetchAdminData(): Promise<AdminData> {
  const usesApprovalStatus = await hasApprovalStatusColumn();
  const siteVisitsTable = await hasSiteVisitsTable();
  const conversationsTable = await hasConversationsTable();
  const propertyViewsTable = await hasPropertyViewsTable();

  const [properties, profiles, leads, conversations, siteVisits] = await Promise.all([
    fetchAdminProperties(),
    fetchAdminProfiles(),
    fetchAdminLeads(),
    conversationsTable ? fetchAdminConversations() : Promise.resolve([]),
    siteVisitsTable ? fetchAdminSiteVisits() : Promise.resolve([]),
  ]);

  const stats = buildOverviewStats({
    properties,
    profiles,
    leads,
    conversations,
    siteVisits,
    usesApprovalStatus,
  });

  const analytics = buildAnalytics({
    properties,
    profiles,
    leads,
    usesApprovalStatus,
    hasSiteVisitsTable: siteVisitsTable,
    hasPropertyViewsTable: propertyViewsTable,
  });

  return {
    properties,
    profiles,
    leads,
    conversations,
    siteVisits,
    stats,
    analytics,
    usesApprovalStatus,
    hasSiteVisitsTable: siteVisitsTable,
    hasConversationsTable: conversationsTable,
  };
}

export function getPendingProperties(
  properties: AdminPropertyRow[],
  usesApprovalStatus: boolean,
): AdminPropertyRow[] {
  if (usesApprovalStatus) {
    return properties.filter((p) => p.approval_status === "pending");
  }
  return properties.filter((p) => p.status === "draft");
}

export async function approveProperty(id: string): Promise<{ ok: boolean; error?: string }> {
  const usesApproval = await hasApprovalStatusColumn();
  const payload = usesApproval
    ? { approval_status: "approved", status: "active", updated_at: new Date().toISOString() }
    : { status: "active", updated_at: new Date().toISOString() };

  const { error } = await supabase.from("properties").update(payload).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function rejectProperty(id: string): Promise<{ ok: boolean; error?: string }> {
  const usesApproval = await hasApprovalStatusColumn();
  const payload = usesApproval
    ? { approval_status: "rejected", status: "paused", updated_at: new Date().toISOString() }
    : { status: "paused", updated_at: new Date().toISOString() };

  const { error } = await supabase.from("properties").update(payload).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteProperty(id: string): Promise<boolean> {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  return !error;
}

export async function updatePropertyStatus(
  id: string,
  status: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("properties")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export function buildBuilderRows(
  profiles: Profile[],
  properties: AdminPropertyRow[],
): BuilderRow[] {
  const listingCounts: Record<string, number> = {};
  for (const p of properties) {
    listingCounts[p.seller_id] = (listingCounts[p.seller_id] ?? 0) + 1;
  }

  return profiles
    .filter((p) => p.role === "builder")
    .map((p) => ({
      ...p,
      company: (p as Profile & { company?: string }).company ?? null,
      listing_count: listingCounts[p.id] ?? 0,
      project_count: 0,
    }));
}
