import { supabase } from "@/lib/supabase";
import type { PlatformStatsSnapshot } from "../types";
import { STATS_CACHE_TTL_MS } from "../types";

const CACHE_KEY = "areaiq_intel_platform_stats_v2";

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function readCache(): PlatformStatsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlatformStatsSnapshot & { _cachedAt?: number };
    if (!parsed?.fetchedAt) return null;
    if (typeof parsed.visitsToday !== "number") return null;
    const age = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (age > STATS_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(stats: PlatformStatsSnapshot) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(stats));
  } catch {
    /* quota */
  }
}

/** Live platform statistics — counts only, never invented. */
export async function fetchPlatformStats(
  force = false,
): Promise<PlatformStatsSnapshot | null> {
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }

  try {
    const monthStart = startOfMonthIso();
    const today = new Date().toISOString().slice(0, 10);
    const [activeRes, buildersRes, citiesRes, newMonthRes, visitsTodayRes] =
      await Promise.all([
        supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .is("deleted_at", null),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "builder"),
        supabase
          .from("properties")
          .select("city")
          .eq("status", "active")
          .is("deleted_at", null),
        supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .is("deleted_at", null)
          .gte("created_at", monthStart),
        supabase
          .from("site_visits")
          .select("id", { count: "exact", head: true })
          .eq("visit_date", today)
          .not("status", "in", "(cancelled,rejected)"),
      ]);

    const uniqueCities = new Set(
      (citiesRes.data ?? [])
        .map((row: { city?: string | null }) => row.city?.trim())
        .filter(Boolean),
    );

    const stats: PlatformStatsSnapshot = {
      activeProperties: activeRes.count ?? 0,
      builders: buildersRes.count ?? 0,
      cities: uniqueCities.size,
      newPropertiesThisMonth: newMonthRes.count ?? 0,
      visitsToday: visitsTodayRes.count ?? 0,
      fetchedAt: new Date().toISOString(),
    };

    // Require at least one real metric
    if (
      stats.activeProperties <= 0 &&
      stats.builders <= 0 &&
      stats.newPropertiesThisMonth <= 0
    ) {
      return null;
    }

    writeCache(stats);
    return stats;
  } catch (error) {
    console.error("fetchPlatformStats:", error);
    return readCache();
  }
}

export async function fetchActiveListingsSample(limit = 200): Promise<
  {
    id: string;
    price: number | null;
    city: string | null;
    location: string | null;
    rental_yield: number | null;
    bhk: number | null;
    created_at: string | null;
  }[]
> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, price, city, location, bedrooms, created_at")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchActiveListingsSample:", error.message);
    return [];
  }
  return ((data as {
    id: string;
    price: number | null;
    city: string | null;
    location: string | null;
    bedrooms: number | null;
    created_at: string | null;
  }[] | null) ?? []).map((row) => ({
    id: row.id,
    price: row.price,
    city: row.city,
    location: row.location,
    rental_yield: null as number | null,
    bhk: row.bedrooms,
    created_at: row.created_at,
  }));
}

/** Active admin announcements from Supabase when table exists. */
export async function fetchActiveAnnouncements(): Promise<
  {
    id: string;
    title: string;
    message: string | null;
    icon: string | null;
    href: string | null;
    category: string;
    audience: string;
    priority: string;
    created_at: string;
  }[]
> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("site_announcements")
      .select("id, title, message, icon, href, category, audience, priority, created_at")
      .eq("active", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      // Table may not be migrated yet — silent
      return [];
    }
    return (data as typeof data) ?? [];
  } catch {
    return [];
  }
}
