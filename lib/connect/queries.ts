import { supabase } from "@/lib/supabase";
import type { ConnectDashboardStats, ConnectLandingStats } from "./types";

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function fetchConnectLandingStats(): Promise<ConnectLandingStats> {
  const empty: ConnectLandingStats = {
    propertiesListed: 0,
    builders: 0,
    projects: 0,
    cities: 0,
    monthlyBuyerLeads: 0,
  };

  try {
    const monthStart = startOfMonthIso();

    const [propertiesRes, buildersRes, citiesRes, leadsRes] = await Promise.all([
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "builder"),
      supabase.from("properties").select("city").eq("status", "active"),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart),
    ]);

    const uniqueCities = new Set(
      (citiesRes.data ?? [])
        .map((row) => row.city?.trim())
        .filter(Boolean),
    );

    return {
      propertiesListed: propertiesRes.count ?? 0,
      builders: buildersRes.count ?? 0,
      projects: 0,
      cities: uniqueCities.size,
      monthlyBuyerLeads: leadsRes.count ?? 0,
    };
  } catch (error) {
    console.error("fetchConnectLandingStats:", error);
    return empty;
  }
}

async function fetchBuilderPropertyIds(builderId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .eq("seller_id", builderId);

  if (error) {
    console.error("fetchBuilderPropertyIds:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

export async function fetchConnectDashboardStats(
  builderId: string,
): Promise<ConnectDashboardStats> {
  const empty: ConnectDashboardStats = {
    projects: 0,
    inventoryUnits: 0,
    newLeads: 0,
    channelPartners: 0,
    siteVisits: 0,
    documents: 0,
    propertiesListed: 0,
    totalLeads: 0,
  };

  try {
    const propertyIds = await fetchBuilderPropertyIds(builderId);

    const [propertiesRes, leadsRes, newLeadsRes, visitsRes] = await Promise.all([
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", builderId),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", builderId),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", builderId)
        .eq("status", "new"),
      propertyIds.length > 0
        ? supabase
            .from("site_visits")
            .select("id", { count: "exact", head: true })
            .in("property_id", propertyIds)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    return {
      projects: 0,
      inventoryUnits: 0,
      newLeads: newLeadsRes.count ?? 0,
      channelPartners: 0,
      siteVisits: visitsRes.count ?? 0,
      documents: 0,
      propertiesListed: propertiesRes.count ?? 0,
      totalLeads: leadsRes.count ?? 0,
    };
  } catch (error) {
    console.error("fetchConnectDashboardStats:", error);
    return empty;
  }
}
