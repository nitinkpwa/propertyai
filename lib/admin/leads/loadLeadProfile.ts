import { getInitials } from "@/lib/auth/profile";
import { resolveDisplayName } from "@/lib/admin/profileDisplay";
import type { AdminLeadRow } from "@/lib/admin/types";
import {
  ADMIN_CRM_LEAD_SELECT,
  getBuyerProfileForCRM,
  INQUIRY_WITH_BUYER_SELECT,
} from "@/lib/crm/buyerProfile";
import { calculateLeadScore } from "@/lib/crm/leadScore";
import type { CrmLeadActivity, LeadStatus } from "@/lib/crm/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  buildAiConversationSummary,
  buildAiInsights,
  buildBuyerJourney,
  buildTags,
  buildTimelineEvents,
  deriveFollowUps,
  mapConfiguration,
  mapCrmStage,
  mapInquiryStage,
  mapInterestedLocation,
  mapLeadSource,
  mapPreferredPossession,
  mapPropertyEmbedsFromEnquiries,
  mapPropertyEmbedsFromSaved,
  mapPropertyEmbedsFromViews,
  mapPropertyTypes,
  resolveManagerName,
} from "./mappers";
import type { AdminLeadProfile, AdminLeadSummary } from "./types";

async function countUnreadNotifications(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  buyerId: string,
) {
  const { count } = await supabase
    .from("crm_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", buyerId)
    .is("read_at", null);
  return count ?? 0;
}

async function loadBuyerCounts(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  buyerId: string,
) {
  const [saved, visits, conversations, views, notifications] = await Promise.all([
    supabase.from("saved_properties").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
    supabase.from("site_visits").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
    supabase.from("property_views").select("id", { count: "exact", head: true }).eq("user_id", buyerId),
    countUnreadNotifications(supabase, buyerId),
  ]);

  return {
    savedProperties: saved.count ?? 0,
    siteVisits: visits.count ?? 0,
    conversations: conversations.count ?? 0,
    propertyViews: views.count ?? 0,
    unreadNotifications: notifications,
  };
}

export function buildSummaryFromParts(input: {
  buyerId: string;
  crmLeadId: string | null;
  buyer: ReturnType<typeof getBuyerProfileForCRM>;
  stage: { stage: string; stageKey: string };
  source: string;
  assignedManager: string | null;
  assignedManagerId: string | null;
  lastActivity: CrmLeadActivity | null;
  createdAt: string;
  signupDate: string | null;
  nextFollowUp: string | null;
  unreadMessages: number;
  primaryPropertyTitle: string | null;
  leadSource: string;
  leadScore: ReturnType<typeof calculateLeadScore>;
}): AdminLeadSummary {
  const displayName = resolveDisplayName(input.buyer);
  return {
    id: input.buyerId,
    buyerId: input.buyerId,
    crmLeadId: input.crmLeadId,
    displayName,
    initials: getInitials(
      displayName !== "Unknown User" ? displayName : null,
      input.buyer?.phone ?? input.buyer?.email ?? undefined,
    ),
    avatarUrl: input.buyer?.avatar_url ?? null,
    phone: input.buyer?.phone ?? null,
    email: input.buyer?.email ?? null,
    leadScore: input.leadScore,
    stage: input.stage.stage,
    stageKey: input.stage.stageKey,
    source: input.source,
    interestedLocation: mapInterestedLocation(input.buyer),
    budget: input.buyer?.budgetLabel || "—",
    propertyType: mapPropertyTypes(input.buyer),
    configuration: mapConfiguration(input.buyer),
    preferredPossession: mapPreferredPossession(input.buyer),
    assignedManager: input.assignedManager,
    assignedManagerId: input.assignedManagerId,
    lastActivity: input.lastActivity?.title ?? input.lastActivity?.activity_type?.replace(/_/g, " ") ?? null,
    lastActivityAt: input.lastActivity?.created_at ?? null,
    createdAt: input.createdAt,
    signupDate: input.signupDate,
    nextFollowUp: input.nextFollowUp,
    unreadMessages: input.unreadMessages,
    primaryPropertyTitle: input.primaryPropertyTitle,
    leadSource: input.leadSource,
  };
}

export async function resolveLeadIdentity(leadId: string) {
  const supabase = createSupabaseServiceClient();

  const { data: crmById } = await supabase
    .from("crm_leads")
    .select(ADMIN_CRM_LEAD_SELECT)
    .eq("id", leadId)
    .maybeSingle();

  if (crmById) {
    return {
      supabase,
      navigationId: crmById.buyer_id as string,
      buyerId: crmById.buyer_id as string,
      crmLead: crmById,
      inquiry: null as Record<string, unknown> | null,
    };
  }

  const { data: profileById } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", leadId)
    .maybeSingle();

  if (profileById?.id) {
    const buyerId = profileById.id as string;
    // Buyers can hold several partner-scoped leads; use the most recent.
    const { data: crmByBuyer } = await supabase
      .from("crm_leads")
      .select(ADMIN_CRM_LEAD_SELECT)
      .eq("buyer_id", buyerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      supabase,
      navigationId: buyerId,
      buyerId,
      crmLead: crmByBuyer ?? null,
      inquiry: null as Record<string, unknown> | null,
    };
  }

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select(INQUIRY_WITH_BUYER_SELECT)
    .eq("id", leadId)
    .maybeSingle();

  if (!inquiry) return null;

  const buyerId = inquiry.from_user_id as string;
  const { data: crmByBuyer } = await supabase
    .from("crm_leads")
    .select(ADMIN_CRM_LEAD_SELECT)
    .eq("buyer_id", buyerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    navigationId: buyerId,
    buyerId,
    crmLead: crmByBuyer ?? null,
    inquiry,
  };
}

export async function loadAdminLeadProfile(leadId: string): Promise<AdminLeadProfile | null> {
  const resolved = await resolveLeadIdentity(leadId);
  if (!resolved) return null;

  const { supabase, buyerId, crmLead, inquiry } = resolved;
  const crmLeadId = (crmLead?.id as string) ?? null;

  const [
    profileRes,
    inquiriesRes,
    savedRes,
    visitsRes,
    viewsRes,
    conversationsRes,
    notificationsRes,
    counts,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", buyerId).maybeSingle(),
    supabase
      .from("inquiries")
      .select("*, property:properties(title, city, price, sub_type, type), seller:profiles!inquiries_seller_id_fkey(id, full_name)")
      .eq("from_user_id", buyerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_properties")
      .select("*, property:properties(title, city, price, sub_type, type)")
      .eq("user_id", buyerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("site_visits")
      .select("*, property:properties(title, location, city, contact_phone, contact_name, seller_id, sub_type)")
      .eq("user_id", buyerId)
      .order("visit_date", { ascending: false }),
    supabase
      .from("property_views")
      .select("*, property:properties(title, city, price, sub_type, type, location)")
      .eq("user_id", buyerId)
      .order("viewed_at", { ascending: false }),
    supabase
      .from("conversations")
      .select("id, title, messages, created_at, updated_at")
      .eq("user_id", buyerId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("crm_notifications")
      .select("*")
      .eq("user_id", buyerId)
      .order("created_at", { ascending: false })
      .limit(30),
    loadBuyerCounts(supabase, buyerId),
  ]);

  // Master sees the COMPLETE buyer journey: activities across the buyer's
  // general lead and every partner-scoped lead (one per Connect partner).
  let activities: CrmLeadActivity[] = [];
  const { data: buyerLeads } = await supabase
    .from("crm_leads")
    .select("id")
    .eq("buyer_id", buyerId);
  const buyerLeadIds = (buyerLeads ?? []).map((l) => l.id as string);
  if (buyerLeadIds.length > 0) {
    const { data: actData } = await supabase
      .from("crm_lead_activities")
      .select("*, property:properties(title, city, location)")
      .in("lead_id", buyerLeadIds)
      .order("created_at", { ascending: true })
      .limit(100);
    activities = (actData as CrmLeadActivity[]) ?? [];
  }

  const conversations = (conversationsRes.data ?? []).map((c) => {
    const messages = Array.isArray(c.messages)
      ? (c.messages as Array<{ role: string; content: string; timestamp?: string }>)
      : [];
    const userMsgs = messages.filter((m) => m.role === "user");
    return {
      id: c.id as string,
      title: c.title as string,
      messages,
      preview: userMsgs[userMsgs.length - 1]?.content?.slice(0, 160) ?? "",
      messageCount: messages.length,
      updated_at: c.updated_at as string,
      created_at: c.created_at as string,
    };
  });

  const profile = profileRes.data;
  const buyer = profile
    ? getBuyerProfileForCRM(profile, {
        status: (crmLead?.status as LeadStatus) ?? null,
        savedCount: savedRes.data?.length ?? 0,
        chatCount: conversations.length,
        visitCount: visitsRes.data?.length ?? 0,
      })
    : getBuyerProfileForCRM(
        (crmLead?.buyer as Record<string, unknown>) ??
          (inquiry?.buyer as Record<string, unknown>) ??
          null,
        {
          status: (crmLead?.status as LeadStatus) ?? null,
          savedCount: savedRes.data?.length ?? 0,
          chatCount: conversations.length,
          visitCount: visitsRes.data?.length ?? 0,
        },
      );

  const leadScore = calculateLeadScore({
    profile: buyer,
    savedCount: counts.savedProperties,
    chatCount: counts.conversations,
    visitCount: counts.siteVisits,
    inquiryCount: inquiriesRes.data?.length ?? 0,
  });

  const connect = (crmLead?.connect as AdminLeadProfile["connect"]) ?? null;
  const seller =
    (crmLead?.property as { seller?: AdminLeadProfile["seller"] } | null)?.seller ??
    (inquiry?.seller as AdminLeadProfile["seller"]) ??
    null;

  const crmStatus = (crmLead?.status as LeadStatus) ?? null;
  const stage = crmStatus ? mapCrmStage(crmStatus) : mapInquiryStage(inquiry?.status as string);

  const lastActivity = activities.length > 0 ? activities[activities.length - 1] : null;
  const upcomingVisit = (visitsRes.data ?? []).find(
    (v) => !["completed", "cancelled", "rejected"].includes(v.status as string),
  );

  const leadSource =
    inquiry && !crmLead
      ? "Inquiry"
      : activities.some((a) => a.activity_type.includes("visit"))
        ? "Site Visit"
        : "CRM";

  const summary = buildSummaryFromParts({
    buyerId,
    crmLeadId,
    buyer,
    stage,
    source: mapLeadSource({
      leadSource,
      activities,
      hasAiChat: conversations.length > 0,
    }),
    assignedManager: resolveManagerName(connect),
    assignedManagerId: (crmLead?.assigned_connect_id as string) ?? null,
    lastActivity,
    createdAt:
      (profile?.created_at as string) ??
      (crmLead?.created_at as string) ??
      (inquiry?.created_at as string) ??
      new Date().toISOString(),
    signupDate: (profile?.created_at as string) ?? null,
    nextFollowUp: (upcomingVisit?.visit_date as string) ?? null,
    unreadMessages: counts.unreadNotifications,
    primaryPropertyTitle:
      (crmLead?.property as { title?: string } | null)?.title ??
      (inquiry?.property as { title?: string } | null)?.title ??
      null,
    leadSource,
    leadScore,
  });

  const buyerName = summary.displayName;
  const connectName = resolveManagerName(connect) ?? undefined;
  const signupDate = summary.signupDate;
  const profileCompletion = buyer?.profile_completion ?? 0;

  const aiSummaryResult = buildAiConversationSummary({
    buyer,
    conversations,
    profileCompletion,
  });

  const savedPropertyEmbeds = mapPropertyEmbedsFromSaved(
    (savedRes.data ?? []) as Array<{ property_id: string; property?: Record<string, unknown> | null }>,
  );
  const viewedPropertyEmbeds = mapPropertyEmbedsFromViews(
    (viewsRes.data ?? []) as AdminLeadProfile["propertyViews"],
  );
  const sharedPropertyEmbeds = mapPropertyEmbedsFromEnquiries(
    (inquiriesRes.data ?? []) as Array<{ property_id: string; property?: Record<string, unknown> | null }>,
  );

  const siteVisits = (visitsRes.data ?? []) as AdminLeadProfile["siteVisits"];
  const enquiries = (inquiriesRes.data ?? []) as AdminLeadProfile["enquiries"];
  const savedProperties = (savedRes.data ?? []) as AdminLeadProfile["savedProperties"];

  const buyerJourney = buildBuyerJourney({
    signupDate,
    conversations,
    propertyViews: (viewsRes.data ?? []) as AdminLeadProfile["propertyViews"],
    savedProperties,
    enquiries,
    siteVisits,
    activities,
  });

  const aiInsights = buildAiInsights({
    buyer,
    leadScore,
    savedProperties: savedPropertyEmbeds,
    enquiries: (inquiriesRes.data ?? []) as Array<{
      property?: { title?: string } | null;
      seller?: { full_name?: string | null } | null;
    }>,
    siteVisits,
    crmStatus,
    upcomingVisitDate: (upcomingVisit?.visit_date as string) ?? null,
  });

  return {
    ...summary,
    buyer,
    seller,
    connect,
    crmLead: crmLead as AdminLeadProfile["crmLead"],
    inquiry: (inquiry as AdminLeadProfile["inquiry"]) ?? null,
    crmStatus,
    crmStatusLabel: crmStatus ? mapCrmStage(crmStatus).stage : null,
    inquiryStatus: (inquiry?.status as string) ?? null,
    message: (inquiry?.message as string) ?? null,
    profileCompletion,
    counts: {
      enquiries: inquiriesRes.data?.length ?? 0,
      savedProperties: counts.savedProperties,
      siteVisits: counts.siteVisits,
      conversations: counts.conversations,
      activities: activities.length,
      propertyViews: counts.propertyViews,
      unreadNotifications: counts.unreadNotifications,
    },
    activities,
    enquiries,
    savedProperties,
    siteVisits,
    propertyViews: (viewsRes.data ?? []) as AdminLeadProfile["propertyViews"],
    conversations,
    notifications: (notificationsRes.data ?? []) as AdminLeadProfile["notifications"],
    aiSummary: aiSummaryResult.summary,
    aiSummaryConfidence: aiSummaryResult.confidence,
    aiInsights,
    tags: buildTags(buyer, leadScore),
    lastSeenAt: conversations[0]?.updated_at ?? null,
    whatsApp: buyer?.phone ?? null,
    buyerNotes: (profile?.buyer_notes as string) ?? null,
    signupDate,
    buyerJourney,
    sharedProperties: sharedPropertyEmbeds,
    timeline: buildTimelineEvents(activities, { buyerName, connectName }),
    followUps: deriveFollowUps({ activities, siteVisits }),
  };
}

export async function loadAdminLeadSummaries(): Promise<AdminLeadSummary[]> {
  const supabase = createSupabaseServiceClient();

  const { data: crmRows } = await supabase
    .from("crm_leads")
    .select(ADMIN_CRM_LEAD_SELECT)
    .order("updated_at", { ascending: false });

  const { data: inquiryRows } = await supabase
    .from("inquiries")
    .select(INQUIRY_WITH_BUYER_SELECT)
    .order("created_at", { ascending: false });

  const seenBuyers = new Set<string>();
  const summaries: AdminLeadSummary[] = [];

  for (const lead of crmRows ?? []) {
    const buyerId = lead.buyer_id as string;
    // Leads are partner-scoped; the admin list is buyer-centric, so keep one
    // row per buyer (rows arrive ordered by updated_at DESC → most recent wins).
    if (seenBuyers.has(buyerId)) continue;
    seenBuyers.add(buyerId);
    const counts = await loadBuyerCounts(supabase, buyerId);

    const { data: actData } = await supabase
      .from("crm_lead_activities")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const activities = (actData as CrmLeadActivity[]) ?? [];

    const buyer = getBuyerProfileForCRM(lead.buyer as Record<string, unknown>, {
      status: lead.status as LeadStatus,
      savedCount: counts.savedProperties,
      chatCount: counts.conversations,
      visitCount: counts.siteVisits,
    });

    const leadScore = calculateLeadScore({
      profile: buyer,
      savedCount: counts.savedProperties,
      chatCount: counts.conversations,
      visitCount: counts.siteVisits,
    });

    const connect = lead.connect as { full_name?: string | null } | null;
    const hasVisit = activities.some((a) => a.activity_type.includes("visit"));
    const leadSource = hasVisit ? "Site Visit" : "CRM";

    summaries.push(
      buildSummaryFromParts({
        buyerId,
        crmLeadId: lead.id as string,
        buyer,
        stage: mapCrmStage(lead.status as LeadStatus),
        source: mapLeadSource({ leadSource, activities, hasAiChat: counts.conversations > 0 }),
        assignedManager: resolveManagerName(connect),
        assignedManagerId: (lead.assigned_connect_id as string) ?? null,
        lastActivity: activities[0] ?? null,
        createdAt: (lead.buyer as { created_at?: string } | null)?.created_at ?? (lead.created_at as string),
        signupDate: (lead.buyer as { created_at?: string } | null)?.created_at ?? null,
        nextFollowUp: null,
        unreadMessages: counts.unreadNotifications,
        primaryPropertyTitle: (lead.property as { title?: string } | null)?.title ?? null,
        leadSource,
        leadScore,
      }),
    );
  }

  for (const row of inquiryRows ?? []) {
    const buyerId = row.from_user_id as string;
    if (seenBuyers.has(buyerId)) continue;

    const counts = await loadBuyerCounts(supabase, buyerId);
    const buyer = getBuyerProfileForCRM(row.buyer as Record<string, unknown>, {
      savedCount: counts.savedProperties,
      chatCount: counts.conversations,
      visitCount: counts.siteVisits,
    });
    const leadScore = calculateLeadScore({
      profile: buyer,
      savedCount: counts.savedProperties,
      chatCount: counts.conversations,
      visitCount: counts.siteVisits,
    });

    summaries.push(
      buildSummaryFromParts({
        buyerId,
        crmLeadId: null,
        buyer,
        stage: mapInquiryStage(row.status as string),
        source: mapLeadSource({ leadSource: "Inquiry", hasAiChat: counts.conversations > 0 }),
        assignedManager: null,
        assignedManagerId: null,
        lastActivity: null,
        createdAt: (row.buyer as { created_at?: string } | null)?.created_at ?? (row.created_at as string),
        signupDate: (row.buyer as { created_at?: string } | null)?.created_at ?? null,
        nextFollowUp: null,
        unreadMessages: counts.unreadNotifications,
        primaryPropertyTitle: (row.property as { title?: string } | null)?.title ?? null,
        leadSource: "Inquiry",
        leadScore,
      }),
    );
  }

  return summaries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function buildLeadSummaryFromRow(
  row: AdminLeadRow,
  counts?: Partial<AdminLeadProfile["counts"]>,
): AdminLeadSummary {
  const buyer = row.buyer ?? null;
  const leadScore = calculateLeadScore({
    profile: buyer,
    savedCount: counts?.savedProperties ?? 0,
    chatCount: counts?.conversations ?? 0,
    visitCount: counts?.siteVisits ?? 0,
  });

  const stage = row.crmStatus
    ? mapCrmStage(row.crmStatus as LeadStatus)
    : mapInquiryStage(row.status);

  return buildSummaryFromParts({
    buyerId: row.from_user_id,
    crmLeadId: row.crmLeadId ?? null,
    buyer,
    stage,
    source: mapLeadSource({
      leadSource: row.leadSource ?? "Inquiry",
      hasAiChat: (counts?.conversations ?? 0) > 0,
    }),
    assignedManager: resolveManagerName(row.connect, row.assignedConnect),
    assignedManagerId: row.connect?.id ?? null,
    lastActivity: null,
    createdAt: row.created_at,
    signupDate: (row.buyer as { created_at?: string } | null)?.created_at ?? null,
    nextFollowUp: null,
    unreadMessages: counts?.unreadNotifications ?? 0,
    primaryPropertyTitle: row.property?.title ?? null,
    leadSource: row.leadSource ?? "Inquiry",
    leadScore,
  });
}
