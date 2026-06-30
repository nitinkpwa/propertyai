import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
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
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      "*, property:properties(title, city), buyer:profiles!inquiries_from_user_id_fkey(full_name, email, phone), seller:profiles!inquiries_seller_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchAdminLeads:", error.message);
    return [];
  }
  return (data ?? []) as AdminLeadRow[];
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
    .select("*, property:properties(title, city), user:profiles(full_name, phone)")
    .order("visit_date", { ascending: false });

  if (error) {
    console.error("fetchAdminSiteVisits:", error.message);
    return [];
  }
  return (data ?? []) as AdminSiteVisitRow[];
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
