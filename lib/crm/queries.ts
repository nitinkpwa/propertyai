import {
  CRM_LEAD_WITH_BUYER_SELECT,
  CRM_LEAD_WITH_BUYER_AND_CONNECT_SELECT,
  enrichLeadRowBuyer,
  fetchSiteVisitsWithBuyers,
} from "@/lib/crm/buyerProfile";
import { supabase } from "@/lib/supabase";
import {
  mapSiteVisitError,
  PROPERTY_UUID_RE,
} from "@/lib/crm/siteVisitErrors";
import type {
  BuyerCrmSummary,
  ConnectSiteVisitRow,
  CrmLead,
  CrmLeadActivity,
  CrmNotification,
  SellerCrmLeadRow,
} from "./types";

/**
 * A buyer can have several partner-scoped leads (one per Connect partner whose
 * property they engaged with) plus a general lead.
 */
export async function fetchBuyerLeads(buyerId: string): Promise<CrmLead[]> {
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("fetchBuyerLeads:", error.message);
    return [];
  }
  return (data as CrmLead[]) ?? [];
}

/** Most recently active lead (compat for single-lead call sites). */
export async function fetchBuyerLead(buyerId: string): Promise<CrmLead | null> {
  const leads = await fetchBuyerLeads(buyerId);
  return leads[0] ?? null;
}

export async function fetchLeadActivities(
  leadId: string,
  limit = 50,
): Promise<CrmLeadActivity[]> {
  const { data, error } = await supabase
    .from("crm_lead_activities")
    .select(
      "*, property:properties(title, city, location)",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchLeadActivities:", error.message);
    return [];
  }

  return (data as CrmLeadActivity[]) ?? [];
}

/** Activities across several leads (a buyer's general + partner-scoped leads). */
export async function fetchActivitiesForLeadIds(
  leadIds: string[],
  limit = 50,
): Promise<CrmLeadActivity[]> {
  if (leadIds.length === 0) return [];

  const { data, error } = await supabase
    .from("crm_lead_activities")
    .select(
      "*, property:properties(title, city, location)",
    )
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchActivitiesForLeadIds:", error.message);
    return [];
  }

  return (data as CrmLeadActivity[]) ?? [];
}

export async function fetchBuyerCrmSummary(buyerId: string): Promise<BuyerCrmSummary> {
  try {
    const [leads, enquiries, saved, chats, visits] = await Promise.all([
      fetchBuyerLeads(buyerId),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("from_user_id", buyerId),
      supabase
        .from("saved_properties")
        .select("id", { count: "exact", head: true })
        .eq("user_id", buyerId),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", buyerId),
      supabase
        .from("site_visits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", buyerId),
    ]);

    const leadIds = leads.map((l) => l.id);
    const activities = leadIds.length > 0 ? await fetchActivitiesForLeadIds(leadIds, 30) : [];

    return {
      lead: leads[0] ?? null,
      leads,
      enquiriesCount: enquiries.count ?? 0,
      savedCount: saved.count ?? 0,
      chatsCount: chats.count ?? 0,
      visitsCount: visits.count ?? 0,
      activities: activities.reverse(),
    };
  } catch (err) {
    console.error("fetchBuyerCrmSummary:", err);
    return {
      lead: null,
      leads: [],
      enquiriesCount: 0,
      savedCount: 0,
      chatsCount: 0,
      visitsCount: 0,
      activities: [],
    };
  }
}

export async function fetchSellerCrmLeads(sellerId: string): Promise<SellerCrmLeadRow[]> {
  const propertyIds = await (async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .eq("seller_id", sellerId);
    if (error) {
      console.error("fetchSellerCrmLeads properties:", error.message);
      return [] as string[];
    }
    return (data ?? []).map((p) => p.id);
  })();

  const [inquiriesRes, visitsRes] = await Promise.all([
    supabase.from("inquiries").select("from_user_id").eq("seller_id", sellerId),
    propertyIds.length > 0
      ? supabase.from("site_visits").select("user_id, id, property_id").in("property_id", propertyIds)
      : Promise.resolve({ data: [] as Array<{ user_id: string; id: string; property_id: string }>, error: null }),
  ]);

  if (inquiriesRes.error) {
    console.error("fetchSellerCrmLeads inquiries:", inquiriesRes.error.message);
  }

  const visitByBuyer = new Map<string, { id: string; property_id: string }>();
  for (const visit of visitsRes.data ?? []) {
    visitByBuyer.set(visit.user_id, { id: visit.id, property_id: visit.property_id });
  }

  const buyerIds = [
    ...new Set([
      ...(inquiriesRes.data ?? []).map((i) => i.from_user_id),
      ...(visitsRes.data ?? []).map((v) => v.user_id),
    ]),
  ];

  if (buyerIds.length === 0) return [];

  const { data: leads, error } = await supabase
    .from("crm_leads")
    .select(CRM_LEAD_WITH_BUYER_SELECT)
    .in("buyer_id", buyerIds)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("fetchSellerCrmLeads:", error.message);
    return [];
  }

  const inquiryBuyerIds = new Set((inquiriesRes.data ?? []).map((i) => i.from_user_id));
  const visitBuyerIds = new Set((visitsRes.data ?? []).map((v) => v.user_id));

  // Leads are partner-scoped (a buyer can have one per Connect partner); the
  // seller CRM shows one row per buyer, keeping the most recently updated lead.
  const seenBuyers = new Set<string>();
  const rows = ((leads as SellerCrmLeadRow[]) ?? []).filter((lead) => {
    if (seenBuyers.has(lead.buyer_id)) return false;
    seenBuyers.add(lead.buyer_id);
    return true;
  });
  const enriched = await Promise.all(
    rows.map(async (lead) => {
      const activities = await fetchLeadActivities(lead.id, 5);
      const visitActivity = activities.find(
        (a) =>
          a.activity_type === "visit_requested" ||
          a.activity_type === "site_visit_booked",
      );
      const inquiryActivity = activities.find((a) => a.activity_type === "inquiry_sent");

      const visitMeta = visitByBuyer.get(lead.buyer_id);
      let propertyTitle: string | null = null;
      const propertyId: string | null =
        visitActivity?.property_id ?? lead.primary_property_id ?? visitMeta?.property_id ?? null;

      if (propertyId) {
        const { data: prop } = await supabase
          .from("properties")
          .select("title")
          .eq("id", propertyId)
          .maybeSingle();
        propertyTitle = prop?.title ?? null;
      }

      if (!propertyTitle) {
        const { data: prop } = await supabase
          .from("crm_lead_activities")
          .select("property:properties(title)")
          .eq("lead_id", lead.id)
          .not("property_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        propertyTitle = (prop?.property as { title?: string } | null)?.title ?? null;
      }

      let leadSource: SellerCrmLeadRow["leadSource"] = "Registration";
      if (visitBuyerIds.has(lead.buyer_id) || visitActivity) {
        leadSource = "Site Visit";
      } else if (inquiryBuyerIds.has(lead.buyer_id) || inquiryActivity) {
        leadSource = "Inquiry";
      }

      return enrichLeadRowBuyer({
        ...lead,
        recentActivity: activities[0] ?? null,
        propertyTitle,
        propertyId,
        leadSource,
        siteVisitId: visitActivity?.site_visit_id ?? visitMeta?.id ?? null,
      });
    }),
  );

  return enriched;
}

/**
 * Leads visible to a Connect partner (identified by their profile id).
 * Ownership is property-based: a partner only receives the leads generated by
 * enquiries/visits on properties assigned to them (partner-scoped crm_leads
 * rows), never the buyer's activity with other partners.
 */
export async function fetchAssignedConnectLeads(
  connectPartnerProfileId: string,
): Promise<SellerCrmLeadRow[]> {
  const { data: partner } = await supabase
    .from("connect_partners")
    .select("id")
    .eq("profile_id", connectPartnerProfileId)
    .maybeSingle();

  let query = supabase
    .from("crm_leads")
    .select(CRM_LEAD_WITH_BUYER_SELECT)
    .order("updated_at", { ascending: false });

  query = partner?.id
    ? query.or(
        `assigned_connect_id.eq.${connectPartnerProfileId},connect_partner_id.eq.${partner.id}`,
      )
    : query.eq("assigned_connect_id", connectPartnerProfileId);

  const { data, error } = await query;

  if (error) {
    console.error("fetchAssignedConnectLeads:", error.message);
    return [];
  }

  return ((data as SellerCrmLeadRow[]) ?? []).map((row) => enrichLeadRowBuyer(row));
}

export async function fetchAllCrmLeads(): Promise<SellerCrmLeadRow[]> {
  const { data, error } = await supabase
    .from("crm_leads")
    .select(CRM_LEAD_WITH_BUYER_AND_CONNECT_SELECT)
    .order("updated_at", { ascending: false });

  if (!error) {
    return ((data as SellerCrmLeadRow[]) ?? []).map((row) => enrichLeadRowBuyer(row));
  }

  console.error("fetchAllCrmLeads embed failed:", error.message);

  const { data: fallback, error: fallbackError } = await supabase
    .from("crm_leads")
    .select(CRM_LEAD_WITH_BUYER_SELECT)
    .order("updated_at", { ascending: false });

  if (fallbackError) {
    console.error("fetchAllCrmLeads fallback:", fallbackError.message);
    return [];
  }

  return ((fallback as SellerCrmLeadRow[]) ?? []).map((row) => enrichLeadRowBuyer(row));
}

export async function fetchConnectPartners(): Promise<
  Array<{
    id: string;
    profile_id: string | null;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    company: string | null;
    created_at: string | null;
  }>
> {
  const { data, error } = await supabase
    .from("connect_partners")
    .select("id, profile_id, company_name, manager_name, email, phone, created_at, status")
    .eq("status", "active")
    .order("company_name");

  if (error) {
    console.error("fetchConnectPartners:", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.profile_id ?? p.id,
    profile_id: p.profile_id,
    full_name: p.manager_name,
    email: p.email,
    phone: p.phone,
    role: "builder",
    company: p.company_name,
    created_at: p.created_at,
  }));
}

export async function fetchUserNotifications(
  userId: string,
  limit = 20,
): Promise<CrmNotification[]> {
  if (!userId) return [];
  const started = Date.now();
  try {
    const { data, error, status } = await supabase
      .from("crm_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      const msg = error.message ?? "unknown";
      const code = (error as { code?: string }).code ?? "";
      console.error("[AreaIQ:notifications] SELECT failed", {
        userId,
        api: "crm_notifications.select",
        status,
        code,
        message: msg,
        durationMs: Date.now() - started,
        rls: /policy|permission|rls|401|403/i.test(msg),
        missingTable: /does not exist|schema cache/i.test(msg),
        missingColumn: /column .* does not exist/i.test(msg),
      });
      return [];
    }

    const rows = Array.isArray(data) ? data : [];
    console.info("[AreaIQ:notifications] SELECT ok", {
      userId,
      api: "crm_notifications.select",
      status,
      count: rows.length,
      durationMs: Date.now() - started,
    });
    return rows as CrmNotification[];
  } catch (err) {
    console.error("[AreaIQ:notifications] SELECT threw", {
      userId,
      api: "crm_notifications.select",
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - started,
    });
    return [];
  }
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;
  const started = Date.now();
  try {
    const { count, error, status } = await supabase
      .from("crm_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      const msg = error.message ?? "unknown";
      console.error("[AreaIQ:notifications] COUNT failed", {
        userId,
        api: "crm_notifications.count",
        status,
        message: msg,
        durationMs: Date.now() - started,
        rls: /policy|permission|rls|401|403/i.test(msg),
        missingTable: /does not exist|schema cache/i.test(msg),
      });
      return 0;
    }

    return count ?? 0;
  } catch (err) {
    console.error("[AreaIQ:notifications] COUNT threw", {
      userId,
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - started,
    });
    return 0;
  }
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  if (!notificationId) return false;
  try {
    const { error, status } = await supabase
      .from("crm_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) {
      console.error("[AreaIQ:notifications] markRead failed", {
        notificationId,
        status,
        message: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[AreaIQ:notifications] markRead threw", err);
    return false;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { error, status } = await supabase
      .from("crm_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("[AreaIQ:notifications] markAllRead failed", {
        userId,
        status,
        message: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[AreaIQ:notifications] markAllRead threw", err);
    return false;
  }
}

/**
 * Client-side Connect visits loader. Prefer /api/connect/dashboard which uses
 * the server client and property-assignment ownership.
 */
export async function fetchAssignedConnectSiteVisits(
  connectPartnerProfileId: string,
): Promise<ConnectSiteVisitRow[]> {
  const { data: partner } = await supabase
    .from("connect_partners")
    .select("id, profile_id")
    .eq("profile_id", connectPartnerProfileId)
    .maybeSingle();

  if (!partner?.id) return [];

  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .or(
      `connect_partner_id.eq.${partner.id},assigned_connect_id.eq.${connectPartnerProfileId}`,
    )
    .is("deleted_at", null);

  const propertyIds = (properties ?? []).map((p) => p.id as string);
  if (propertyIds.length === 0) return [];

  return fetchSiteVisitsWithBuyers<ConnectSiteVisitRow>({
    filter: { propertyIds },
    order: { column: "created_at", ascending: false },
  });
}

export async function fetchAssignedConnectProperties(connectPartnerId: string) {
  const { data: partner } = await supabase
    .from("connect_partners")
    .select("id")
    .eq("profile_id", connectPartnerId)
    .maybeSingle();

  const partnerRecordId = partner?.id ?? connectPartnerId;

  const { data, error } = await supabase
    .from("properties")
    .select("id, title, city, location, price, status, photos")
    .eq("connect_partner_id", partnerRecordId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("fetchAssignedConnectProperties:", error.message);
    return [];
  }

  return data ?? [];
}

export async function bookSiteVisit(input: {
  userId: string;
  propertyId: string;
  visitDate: string;
  visitTime: string;
  builderName?: string;
  purpose?: string;
}): Promise<{ visitId: string; checklist?: string[] } | { error: string }> {
  const propertyId = input.propertyId?.trim() ?? "";

  if (!propertyId || !PROPERTY_UUID_RE.test(propertyId)) {
    return { error: "Unable to identify this property. Please refresh the page." };
  }

  const payload = {
    propertyId,
    visitDate: input.visitDate,
    visitTime: input.visitTime,
    builderName: input.builderName,
    purpose: input.purpose,
  };

  try {
    const res = await fetch("/api/crm/site-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data: { error?: string; code?: string; visitId?: string; checklist?: string[] } = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[SiteVisit] bookSiteVisit response", {
        propertyId,
        buyerId: input.userId,
        status: res.status,
        data,
      });
    }

    if (!res.ok) {
      const mapped = mapSiteVisitError(res.status, data);
      return { error: mapped.message };
    }

    return { visitId: data.visitId!, checklist: data.checklist };
  } catch (cause) {
    const mapped = mapSiteVisitError(0, null, cause);
    return { error: mapped.message };
  }
}

export async function manageSiteVisit(
  visitId: string,
  action: "accept" | "reject" | "reschedule" | "complete",
  extra?: { visitDate?: string; visitTime?: string; reason?: string },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/crm/site-visit/${visitId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error ?? "Action failed" };
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("areaiq:site-visit-updated", {
        detail: { visitId, action },
      }),
    );
  }
  return { ok: true };
}

export async function fetchVisitContact(visitId: string) {
  const res = await fetch(`/api/crm/site-visit/${visitId}/contact`);
  if (!res.ok) return null;
  return res.json();
}

export async function submitVisitFeedback(
  visitId: string,
  feedback: Record<string, unknown>,
): Promise<boolean> {
  const res = await fetch(`/api/crm/site-visit/${visitId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedback),
  });
  return res.ok;
}

export async function fetchAdminBuyerJourney(buyerId: string) {
  const res = await fetch(`/api/crm/admin/buyer/${buyerId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function sendCrmInquiry(input: {
  propertyId: string;
  message: string;
}): Promise<{ inquiryId: string } | { error: string }> {
  const res = await fetch("/api/crm/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? "Failed to send inquiry" };
  return { inquiryId: data.inquiryId };
}

export async function trackCrmEvent(input: {
  activityType: string;
  title: string;
  description?: string;
  propertyId?: string;
  conversationId?: string;
}): Promise<void> {
  try {
    await fetch("/api/crm/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    /* non-blocking */
  }
}
