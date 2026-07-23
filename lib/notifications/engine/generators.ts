import type {
  IntelligenceNotification,
  IntelligencePriorityScore,
  PlatformStatsSnapshot,
} from "../types";
import { MIN_CONFIDENCE } from "../types";
import type { CrmNotification } from "@/lib/crm/types";
import type { SiteVisitRow } from "@/lib/buyer/types";
import type { PropertyCardProps } from "@/app/components/PropertyCard";
import type { Profile } from "@/lib/supabase";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}

function formatPriceShort(price: number): string {
  return formatInrAmount(price);
}

function pass(n: IntelligenceNotification): IntelligenceNotification | null {
  if (n.confidence < MIN_CONFIDENCE) return null;
  if (!n.title?.trim()) return null;
  return n;
}

/** Priority 100 — CRM + visits rooted in real rows. */
export function generateCriticalFromCrm(
  notifications: CrmNotification[],
): IntelligenceNotification[] {
  const criticalTypes = new Set([
    "site_visit_booked",
    "site_visit_accepted",
    "site_visit_rejected",
    "site_visit_completed",
    "site_visit_cancelled",
    "new_inquiry",
    "reminder",
    "follow_up_due",
    "negotiation_started",
    "booking_completed",
  ]);

  return notifications
    .filter((n) => criticalTypes.has(n.type) || /visit|reply|document|offer|payment/i.test(n.title))
    .map((n) => {
      const score: IntelligencePriorityScore = 100;
      const item: IntelligenceNotification = {
        id: `crm-${n.id}`,
        title: n.title,
        message: n.message || undefined,
        icon: "🔴",
        href: n.property_id
          ? `/property/${n.property_id}`
          : "/buyer/notifications",
        score,
        kind: "critical",
        source: "crm",
        reason: `CRM notification type “${n.type}” for this account`,
        confidence: 95,
        timestamp: n.created_at,
        read: Boolean(n.read_at),
        propertyId: n.property_id,
      };
      return pass(item);
    })
    .filter((x): x is IntelligenceNotification => Boolean(x));
}

export function generateCriticalFromVisits(
  visits: SiteVisitRow[],
): IntelligenceNotification[] {
  const today = todayIsoDate();
  const out: IntelligenceNotification[] = [];

  for (const v of visits) {
    if (v.visit_date !== today) continue;
    if (["cancelled", "rejected"].includes(v.status)) {
      const item = pass({
        id: `visit-cancel-${v.id}`,
        title: `Visit ${v.status === "cancelled" ? "cancelled" : "rejected"}: ${v.property?.title ?? "property"}`,
        icon: "🔴",
        href: "/buyer/site-visits",
        score: 100,
        kind: "critical",
        source: "site_visit",
        reason: `Site visit row ${v.id} status=${v.status} on ${v.visit_date}`,
        confidence: 98,
        timestamp: `${v.visit_date}T${v.visit_time || "00:00:00"}`,
        propertyId: v.property_id,
      });
      if (item) out.push(item);
      continue;
    }

    if (["pending_approval", "accepted", "scheduled", "rescheduled"].includes(v.status)) {
      const time = v.visit_time ? ` at ${v.visit_time.slice(0, 5)}` : "";
      const item = pass({
        id: `visit-today-${v.id}`,
        title: `Site visit today${time}${v.property?.title ? ` · ${v.property.title}` : ""}`,
        icon: "🔴",
        href: "/buyer/site-visits",
        score: 100,
        kind: "critical",
        source: "site_visit",
        reason: `Upcoming visit scheduled for ${v.visit_date}`,
        confidence: 98,
        timestamp: `${v.visit_date}T${v.visit_time || "09:00:00"}`,
        propertyId: v.property_id,
      });
      if (item) out.push(item);
    }
  }

  return out;
}

/** Priority 80 — buyer prefs + recommendations from live inventory. */
export function generateBuyerIntelligence(input: {
  profile: Profile | null;
  recommended: PropertyCardProps[];
  recent: (PropertyCardProps & { viewedAt?: string })[];
}): IntelligenceNotification[] {
  const out: IntelligenceNotification[] = [];
  const { profile, recommended, recent } = input;

  if (recommended.length > 0) {
    const locs = Array.isArray(profile?.preferred_locations)
      ? profile.preferred_locations.filter(Boolean)
      : [];
    const budget =
      profile?.budget_max != null
        ? ` under ${formatPriceShort(profile.budget_max)}`
        : "";
    const locLabel = locs.length ? ` in ${locs.slice(0, 2).join(", ")}` : "";
    const item = pass({
      id: `buyer-rec-${recommended.length}-${recommended[0]?.id ?? "x"}`,
      title: `You have ${recommended.length} matching propert${recommended.length === 1 ? "y" : "ies"}${budget}${locLabel}`,
      icon: "🟢",
      href: "/buyer#recommended",
      score: 80,
      kind: "buyer_intel",
      source: "buyer_profile",
      reason: `Recommended from live listings using profile preferences (budget/locations)`,
      confidence: 88,
      timestamp: new Date().toISOString(),
    });
    if (item) out.push(item);
  }

  if (recent.length > 0) {
    const latest = recent[0];
    const item = pass({
      id: `view-resume-${latest.id}`,
      title: `Continue where you left off: ${latest.name}`,
      icon: "👀",
      href: `/property/${latest.id}`,
      score: 80,
      kind: "buyer_intel",
      source: "property_view",
      reason: `Most recent property view at ${latest.viewedAt ?? "unknown"}`,
      confidence: 92,
      timestamp: latest.viewedAt ?? new Date().toISOString(),
      propertyId: latest.id,
    });
    if (item) out.push(item);
  }

  return out;
}

/** Priority 90 — saved property signals (price presence only; no invented drops). */
export function generateSavedIntelligence(
  saved: (PropertyCardProps & { savedRowId: string })[],
): IntelligenceNotification[] {
  if (saved.length === 0) return [];

  const withPrice = saved.filter((s) => typeof s.price === "number" && s.price > 0);
  if (withPrice.length === 0) {
    const item = pass({
      id: `saved-count-${saved.length}`,
      title: `${saved.length} propert${saved.length === 1 ? "y" : "ies"} in your saved list`,
      icon: "❤️",
      href: "/buyer/saved",
      score: 90,
      kind: "saved_intel",
      source: "saved_property",
      reason: "Count of saved_properties rows for this user",
      confidence: 95,
      timestamp: new Date().toISOString(),
    });
    return item ? [item] : [];
  }

  const avg =
    withPrice.reduce((sum, s) => sum + s.price, 0) / withPrice.length;
  const item = pass({
    id: `saved-watch-${saved.length}-${Math.round(avg)}`,
    title: `Watching ${saved.length} saved propert${saved.length === 1 ? "y" : "ies"} · avg ${formatPriceShort(avg)}`,
    icon: "💚",
    href: "/buyer/saved",
    score: 90,
    kind: "saved_intel",
    source: "saved_property",
    reason: "Average price computed from saved property cards currently in inventory",
    confidence: 90,
    timestamp: new Date().toISOString(),
  });
  return item ? [item] : [];
}

/** Priority 70 — market intel from live listing aggregates only. */
export function generateMarketFromListings(
  listings: {
    price: number | null;
    city: string | null;
    location: string | null;
    rental_yield: number | null;
    bhk: number | null;
  }[],
): IntelligenceNotification[] {
  if (listings.length < 5) return [];

  const out: IntelligenceNotification[] = [];
  const prices = listings.map((l) => l.price).filter((p): p is number => typeof p === "number" && p > 0);
  if (prices.length >= 5) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const item = pass({
      id: `mkt-avg-${Math.round(avg)}-${listings.length}`,
      title: `Average listed price across ${formatCount(listings.length)} active properties: ${formatPriceShort(avg)}`,
      icon: "📊",
      href: "/properties",
      score: 70,
      kind: "market_intel",
      source: "market_listings",
      reason: `Mean of ${prices.length} non-null prices from active inventory sample`,
      confidence: 90,
      timestamp: new Date().toISOString(),
    });
    if (item) out.push(item);
  }

  const cityCounts = new Map<string, number>();
  for (const l of listings) {
    const city = (l.city || l.location || "").trim();
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const top = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 3) {
    const item = pass({
      id: `mkt-hot-${top[0]}-${top[1]}`,
      title: `${top[0]} leads live inventory with ${top[1]} active listings`,
      icon: "🔥",
      href: `/properties?location=${encodeURIComponent(top[0])}`,
      score: 70,
      kind: "market_intel",
      source: "market_listings",
      reason: `City/location frequency in active listings sample (${listings.length} rows)`,
      confidence: 88,
      timestamp: new Date().toISOString(),
    });
    if (item) out.push(item);
  }

  const bhk3 = listings.filter((l) => l.bhk === 3 && typeof l.price === "number" && l.price > 0);
  if (bhk3.length >= 5) {
    const avg = bhk3.reduce((s, l) => s + (l.price as number), 0) / bhk3.length;
    const item = pass({
      id: `mkt-3bhk-${Math.round(avg)}`,
      title: `Average 3BHK ask across ${bhk3.length} listings: ${formatPriceShort(avg)}`,
      icon: "🏘",
      href: "/properties?bhk=3",
      score: 70,
      kind: "market_intel",
      source: "market_listings",
      reason: `Mean price of ${bhk3.length} active 3BHK rows with price > 0`,
      confidence: 90,
      timestamp: new Date().toISOString(),
    });
    if (item) out.push(item);
  }

  const yields = listings
    .map((l) => l.rental_yield)
    .filter((y): y is number => typeof y === "number" && y > 0);
  if (yields.length >= 5) {
    const avg = yields.reduce((a, b) => a + b, 0) / yields.length;
    const item = pass({
      id: `mkt-yield-${avg.toFixed(1)}`,
      title: `Average listed rental yield: ${avg.toFixed(1)}% (${yields.length} properties)`,
      icon: "💰",
      href: "/ask?q=Highest+rental+yield+Tricity",
      score: 70,
      kind: "market_intel",
      source: "market_listings",
      reason: `Mean of rental_yield column where present on active listings`,
      confidence: 85,
      timestamp: new Date().toISOString(),
    });
    if (item) out.push(item);
  }

  return out;
}

/** Logged-out platform stats — verified counts only. */
export function generatePlatformStatNotifications(
  stats: PlatformStatsSnapshot,
): IntelligenceNotification[] {
  const out: IntelligenceNotification[] = [];
  const ts = stats.fetchedAt;

  if (stats.activeProperties > 0) {
    const item = pass({
      id: `stat-props-${stats.activeProperties}`,
      title: `${formatCount(stats.activeProperties)} verified active properties`,
      icon: "📍",
      href: "/properties",
      score: 70,
      kind: "platform_stat",
      source: "platform_stats",
      reason: "Exact count of properties where status=active and deleted_at is null",
      confidence: 99,
      timestamp: ts,
    });
    if (item) out.push(item);
  }

  if (stats.builders > 0) {
    const item = pass({
      id: `stat-builders-${stats.builders}`,
      title: `${formatCount(stats.builders)} verified builders on AreaIQ`,
      icon: "🏗",
      href: "/connect",
      score: 70,
      kind: "platform_stat",
      source: "platform_stats",
      reason: "Exact count of profiles where role=builder",
      confidence: 99,
      timestamp: ts,
    });
    if (item) out.push(item);
  }

  if (stats.newPropertiesThisMonth > 0) {
    const item = pass({
      id: `stat-new-month-${stats.newPropertiesThisMonth}`,
      title: `${formatCount(stats.newPropertiesThisMonth)} new active listings this month`,
      icon: "✨",
      href: "/properties?sort=newest",
      score: 70,
      kind: "platform_stat",
      source: "platform_stats",
      reason: "Count of active properties with created_at ≥ start of current month",
      confidence: 97,
      timestamp: ts,
    });
    if (item) out.push(item);
  }

  if (stats.cities > 0) {
    const item = pass({
      id: `stat-cities-${stats.cities}`,
      title: `Covering ${formatCount(stats.cities)} cities in live inventory`,
      icon: "🗺",
      href: "/properties",
      score: 70,
      kind: "platform_stat",
      source: "platform_stats",
      reason: "Distinct non-empty city values on active properties",
      confidence: 95,
      timestamp: ts,
    });
    if (item) out.push(item);
  }

  if ((stats.visitsToday ?? 0) > 0) {
    const item = pass({
      id: `stat-visits-today-${stats.visitsToday}`,
      title: `${formatCount(stats.visitsToday)} buyer${stats.visitsToday === 1 ? "" : "s"} scheduled visits today`,
      icon: "📅",
      href: "/login",
      score: 70,
      kind: "platform_stat",
      source: "platform_stats",
      reason: "Exact count of site_visits with visit_date=today excluding cancelled/rejected",
      confidence: 98,
      timestamp: ts,
    });
    if (item) out.push(item);
  }

  return out;
}

/** Fallback when nothing else qualifies — date + market status only. */
export function generateMarketStatusFallback(
  statsFetchedAt: string | null,
): IntelligenceNotification {
  const now = new Date();
  const date = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  let refresh = "Intelligence standing by";
  if (statsFetchedAt) {
    const mins = Math.max(
      0,
      Math.floor((Date.now() - new Date(statsFetchedAt).getTime()) / 60_000),
    );
    refresh =
      mins <= 0
        ? "Intelligence updated just now"
        : `Intelligence updated ${mins} min${mins === 1 ? "" : "s"} ago`;
  }

  return {
    id: "market-status-clock",
    title: `${date} · Market Open · ${refresh}`,
    icon: "📅",
    score: 10,
    kind: "market_status",
    source: "system_clock",
    reason: "No higher-confidence intelligence available; showing live clock + last stats refresh",
    confidence: 100,
    timestamp: now.toISOString(),
    href: "/properties",
  };
}

export function generateFromAnnouncements(
  rows: {
    id: string;
    title: string;
    message: string | null;
    icon: string | null;
    href: string | null;
    created_at: string;
  }[],
): IntelligenceNotification[] {
  return rows
    .map((r) =>
      pass({
        id: `announce-${r.id}`,
        title: r.title,
        message: r.message ?? undefined,
        icon: r.icon || "📢",
        href: r.href || undefined,
        score: 80,
        kind: "buyer_intel",
        source: "admin_broadcast",
        reason: "Active row in site_announcements within schedule window",
        confidence: 100,
        timestamp: r.created_at,
      }),
    )
    .filter((x): x is IntelligenceNotification => Boolean(x));
}
