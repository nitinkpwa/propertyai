import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase";
import { getProfileCompleteness } from "@/lib/buyer/profileCompleteness";
import {
  labelForLoan,
  labelForPurpose,
  labelForPropertyTypes,
  labelForTimeline,
} from "@/lib/buyer/profileFields";
import { calculateLeadScore } from "@/lib/crm/leadScore";
import { PROFILE_EMBED_SELECT } from "@/lib/profiles/schema";
import { supabase as browserSupabase } from "@/lib/supabase";

/** Columns fetched for every CRM buyer embed / batch load */
export const BUYER_PROFILE_COLUMNS =
  "id, full_name, email, phone, avatar_url, city, buying_purpose, buying_timeline, budget_min, budget_max, loan_status, occupation, family_size, preferred_locations, preferred_property_types, buyer_notes, contact_email, created_at";

export const CRM_LEAD_BUYER_EMBED = `buyer:profiles!crm_leads_buyer_id_fkey(${BUYER_PROFILE_COLUMNS})`;
export const INQUIRY_BUYER_EMBED = `buyer:profiles!inquiries_from_user_id_fkey(${BUYER_PROFILE_COLUMNS})`;
export const SITE_VISIT_BUYER_EMBED = `buyer:profiles!site_visits_user_id_fkey(${BUYER_PROFILE_COLUMNS})`;
export const SITE_VISIT_USER_EMBED = `user:profiles!site_visits_user_id_fkey(${BUYER_PROFILE_COLUMNS})`;

/** Full Supabase select strings (must be compile-time literals for typed client) */
export const CRM_LEAD_WITH_BUYER_SELECT =
  "*, buyer:profiles!crm_leads_buyer_id_fkey(id, full_name, email, phone, avatar_url, city, buying_purpose, buying_timeline, budget_min, budget_max, loan_status, occupation, family_size, preferred_locations, preferred_property_types, buyer_notes, contact_email, created_at)";

export const CRM_LEAD_WITH_BUYER_AND_CONNECT_SELECT =
  `*, buyer:profiles!crm_leads_buyer_id_fkey(${BUYER_PROFILE_COLUMNS}), connect:profiles!crm_leads_assigned_connect_id_fkey(${PROFILE_EMBED_SELECT})`;

export const INQUIRY_WITH_BUYER_SELECT =
  `*, property:properties(title, city), buyer:profiles!inquiries_from_user_id_fkey(${BUYER_PROFILE_COLUMNS}), seller:profiles!inquiries_seller_id_fkey(${PROFILE_EMBED_SELECT})`;

export const ADMIN_CRM_LEAD_SELECT =
  `*, buyer:profiles!crm_leads_buyer_id_fkey(${BUYER_PROFILE_COLUMNS}), connect:profiles!crm_leads_assigned_connect_id_fkey(${PROFILE_EMBED_SELECT}), property:properties!crm_leads_primary_property_id_fkey(title, city, seller_id, seller:profiles!properties_seller_id_fkey(${PROFILE_EMBED_SELECT}))`;

export const SITE_VISIT_WITH_BUYER_SELECT =
  "*, property:properties(title, location, city), buyer:profiles!site_visits_user_id_fkey(id, full_name, email, phone, avatar_url, city, buying_purpose, buying_timeline, budget_min, budget_max, loan_status, occupation, family_size, preferred_locations, preferred_property_types, buyer_notes, contact_email, created_at)";

export const SITE_VISIT_WITH_USER_SELECT =
  "*, property:properties(title, city), user:profiles!site_visits_user_id_fkey(id, full_name, email, phone, avatar_url, city, buying_purpose, buying_timeline, budget_min, budget_max, loan_status, occupation, family_size, preferred_locations, preferred_property_types, buyer_notes, contact_email, created_at)";

export const CONNECT_SITE_VISIT_SELECT =
  "*, property:properties(title, location, city), user:profiles!site_visits_user_id_fkey(id, full_name, email, phone, avatar_url, city, buying_purpose, buying_timeline, budget_min, budget_max, loan_status, occupation, family_size, preferred_locations, preferred_property_types, buyer_notes, contact_email, created_at)";

export interface BuyerCrmContext {
  status?: string | null;
  source?: string | null;
  savedCount?: number;
  chatCount?: number;
  visitCount?: number;
}

export interface BuyerProfileForCRM {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  buying_purpose: string | null;
  /** DB column `buying_timeline` — exposed as purchase_timeline for CRM consumers */
  purchase_timeline: string | null;
  buying_timeline: string | null;
  budget_min: number | null;
  budget_max: number | null;
  loan_status: string | null;
  occupation: string | null;
  family_size: number | null;
  preferred_locations: string[] | null;
  preferred_property_types: string[] | null;
  profile_completion: number;
  completed_at: string | null;
  lead_score: number;
  lead_temperature: "hot" | "warm" | "cold";
  source: string | null;
  status: string | null;
  budgetLabel: string;
  purposeLabel: string;
  timelineLabel: string;
  loanLabel: string;
  propertyTypesLabel: string;
  locationsLabel: string;
  occupationLabel: string;
  familySizeLabel: string;
}

export function formatBudgetForCRM(
  min?: number | null,
  max?: number | null,
): string {
  if (min == null && max == null) return "";
  const fmt = (n: number) =>
    n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(1)} Cr` : `₹${(n / 100_000).toFixed(0)} L`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return min != null ? `From ${fmt(min)}` : "";
}

export function getBuyerProfileForCRM(
  raw: Partial<Profile> | Record<string, unknown> | null | undefined,
  ctx: BuyerCrmContext = {},
): BuyerProfileForCRM | null {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id as string | undefined;
  if (!id) return null;

  const profile = raw as Partial<Profile>;
  const completeness = getProfileCompleteness(profile);
  const score = calculateLeadScore({
    profile,
    savedCount: ctx.savedCount ?? 0,
    chatCount: ctx.chatCount ?? 0,
    visitCount: ctx.visitCount ?? 0,
  });

  const timeline = profile.buying_timeline ?? null;

  return {
    id,
    full_name: profile.full_name ?? null,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    avatar_url: profile.avatar_url ?? null,
    city: profile.city ?? null,
    buying_purpose: profile.buying_purpose ?? null,
    purchase_timeline: timeline,
    buying_timeline: timeline,
    budget_min: profile.budget_min ?? null,
    budget_max: profile.budget_max ?? null,
    loan_status: profile.loan_status ?? null,
    occupation: profile.occupation ?? null,
    family_size: profile.family_size ?? null,
    preferred_locations: profile.preferred_locations ?? null,
    preferred_property_types: profile.preferred_property_types ?? null,
    profile_completion: completeness.percent,
    completed_at: completeness.isComplete ? profile.created_at ?? null : null,
    lead_score: score.score,
    lead_temperature: score.temperature,
    source: ctx.source ?? null,
    status: ctx.status ?? null,
    budgetLabel: formatBudgetForCRM(profile.budget_min, profile.budget_max),
    purposeLabel: profile.buying_purpose ? labelForPurpose(profile.buying_purpose) : "",
    timelineLabel: timeline ? labelForTimeline(timeline) : "",
    loanLabel: profile.loan_status ? labelForLoan(profile.loan_status) : "",
    propertyTypesLabel: labelForPropertyTypes(profile.preferred_property_types),
    locationsLabel: profile.preferred_locations?.filter(Boolean).join(", ") ?? "",
    occupationLabel: profile.occupation?.trim() ?? "",
    familySizeLabel:
      profile.family_size != null && profile.family_size > 0
        ? String(profile.family_size)
        : "",
  };
}

export function resolveBuyerFromRow(
  row: { buyer?: unknown; user?: unknown } | null | undefined,
  ctx?: BuyerCrmContext,
): BuyerProfileForCRM | null {
  if (!row) return null;
  const raw = (row.buyer ?? row.user) as Partial<Profile> | undefined;
  return getBuyerProfileForCRM(raw, ctx);
}

export async function fetchBuyerProfilesByIds(
  ids: string[],
  client: SupabaseClient = browserSupabase,
): Promise<Map<string, BuyerProfileForCRM>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await client
    .from("profiles")
    .select(BUYER_PROFILE_COLUMNS)
    .in("id", unique);

  if (error) {
    console.error("fetchBuyerProfilesByIds:", error.message);
    return new Map();
  }

  const map = new Map<string, BuyerProfileForCRM>();
  for (const row of data ?? []) {
    const enriched = getBuyerProfileForCRM(row as Partial<Profile>);
    if (enriched) map.set(enriched.id, enriched);
  }
  return map;
}

export function enrichLeadRowBuyer<T extends { buyer?: unknown; status?: string; leadSource?: string }>(
  row: T,
  ctx?: Pick<BuyerCrmContext, "savedCount" | "chatCount" | "visitCount">,
): T & { buyer: BuyerProfileForCRM | null } {
  return {
    ...row,
    buyer: getBuyerProfileForCRM(row.buyer as Partial<Profile>, {
      status: row.status,
      source: row.leadSource ?? null,
      ...ctx,
    }),
  };
}

export function enrichVisitRowBuyer<T extends Record<string, unknown>>(
  row: T,
): T & { buyer: BuyerProfileForCRM | null } {
  const enriched = resolveBuyerFromRow(row as { buyer?: unknown; user?: unknown });
  return { ...row, buyer: enriched };
}

/** Site visits join properties only — buyer is resolved via crm_leads in TypeScript. */
export const SITE_VISIT_BASE_SELECT =
  "*, property:properties(id, title, location, city, builder_name)";

export const SITE_VISIT_ADMIN_SELECT =
  "*, property:properties(id, title, city, builder_name)";

export const CONNECT_PARTNER_VISIT_SELECT =
  "*, property:properties(id, title, location, city, builder_name)";

export type SiteVisitQueryFilter = {
  propertyIds?: string[];
  userIds?: string[];
  /** Legacy stamp filter — prefer propertyIds for Connect ownership. */
  connectPartnerId?: string;
};

/**
 * Load site visits without embedding profiles (no FK on site_visits → profiles).
 * Buyer: site_visits.lead_id → crm_leads.buyer_id → profiles, with user_id fallback.
 *
 * Pass a server Supabase client from API routes so RLS uses the authenticated session.
 */
export async function fetchSiteVisitsWithBuyers<T = Record<string, unknown>>(
  options: {
    client?: SupabaseClient;
    select?: string;
    filter?: SiteVisitQueryFilter;
    order?: { column: string; ascending: boolean };
  } = {},
): Promise<Array<T & { buyer: BuyerProfileForCRM | null }>> {
  const client = options.client ?? browserSupabase;
  const select = options.select ?? SITE_VISIT_BASE_SELECT;
  let query = client.from("site_visits").select(select);

  if (options.filter?.propertyIds?.length) {
    query = query.in("property_id", options.filter.propertyIds);
  }
  if (options.filter?.userIds?.length) {
    query = query.in("user_id", options.filter.userIds);
  }
  if (options.filter?.connectPartnerId) {
    query = query.eq("connect_partner_id", options.filter.connectPartnerId);
  }

  const order = options.order ?? { column: "visit_date", ascending: false };
  query = query.order(order.column, { ascending: order.ascending });

  const { data, error } = await query;
  if (error) {
    console.error("fetchSiteVisitsWithBuyers:", error.message);
    return [];
  }

  const visits = (data ?? []) as unknown as T[];
  if (visits.length === 0) return [];

  const leadIds = [
    ...new Set(
      visits
        .map((v) => (v as Record<string, unknown>).lead_id as string | null | undefined)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const buyerIdByLeadId = new Map<string, string>();
  if (leadIds.length > 0) {
    const { data: leads, error: leadError } = await client
      .from("crm_leads")
      .select("id, buyer_id")
      .in("id", leadIds);

    if (leadError) {
      console.error("fetchSiteVisitsWithBuyers crm_leads:", leadError.message);
    } else {
      for (const lead of leads ?? []) {
        if (lead.buyer_id) buyerIdByLeadId.set(lead.id, lead.buyer_id);
      }
    }
  }

  const buyerIds = [
    ...new Set(
      visits
        .map((v) => {
          const row = v as Record<string, unknown>;
          const leadId = row.lead_id as string | null | undefined;
          if (leadId) {
            const fromLead = buyerIdByLeadId.get(leadId);
            if (fromLead) return fromLead;
          }
          return (row.user_id as string | null | undefined) ?? null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const profileMap = await fetchBuyerProfilesByIds(buyerIds, client);

  return visits.map((v) => {
    const row = v as Record<string, unknown>;
    const leadId = row.lead_id as string | null | undefined;
    const buyerId =
      (leadId ? buyerIdByLeadId.get(leadId) : undefined) ??
      (row.user_id as string | undefined);
    return {
      ...v,
      buyer: buyerId ? (profileMap.get(buyerId) ?? null) : null,
    };
  });
}
