import {
  CRM_LEAD_WITH_BUYER_SELECT,
  CRM_LEAD_WITH_BUYER_AND_CONNECT_SELECT,
  CONNECT_SITE_VISIT_SELECT,
  enrichLeadRowBuyer,
  enrichVisitRowBuyer,
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

export async function fetchBuyerLead(buyerId: string): Promise<CrmLead | null> {
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (error) {
    console.error("fetchBuyerLead:", error.message);
    return null;
  }
  return (data as CrmLead) ?? null;
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

export async function fetchBuyerCrmSummary(buyerId: string): Promise<BuyerCrmSummary> {
  const [lead, enquiries, saved, chats, visits] = await Promise.all([
    fetchBuyerLead(buyerId),
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

  const activities = lead ? await fetchLeadActivities(lead.id, 30) : [];

  return {
    lead,
    enquiriesCount: enquiries.count ?? 0,
    savedCount: saved.count ?? 0,
    chatsCount: chats.count ?? 0,
    visitsCount: visits.count ?? 0,
    activities: activities.reverse(),
  };
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

  const rows = (leads as SellerCrmLeadRow[]) ?? [];
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
      let propertyId: string | null =
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

export async function fetchAssignedConnectLeads(
  connectPartnerId: string,
): Promise<SellerCrmLeadRow[]> {
  const { data, error } = await supabase
    .from("crm_leads")
    .select(CRM_LEAD_WITH_BUYER_SELECT)
    .eq("assigned_connect_id", connectPartnerId)
    .order("updated_at", { ascending: false });

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

  if (error) {
    console.error("fetchAllCrmLeads:", error.message);
    return [];
  }

  return ((data as SellerCrmLeadRow[]) ?? []).map((row) => enrichLeadRowBuyer(row));
}

export async function fetchConnectPartners(): Promise<
  Array<{ id: string; full_name: string | null }>
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "builder")
    .order("full_name");

  if (error) {
    console.error("fetchConnectPartners:", error.message);
    return [];
  }

  return data ?? [];
}

export async function fetchUserNotifications(
  userId: string,
  limit = 20,
): Promise<CrmNotification[]> {
  const { data, error } = await supabase
    .from("crm_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchUserNotifications:", error.message);
    return [];
  }

  return (data as CrmNotification[]) ?? [];
}

export async function fetchAssignedConnectSiteVisits(
  connectPartnerId: string,
): Promise<ConnectSiteVisitRow[]> {
  const leads = await fetchAssignedConnectLeads(connectPartnerId);
  const buyerIds = leads.map((l) => l.buyer_id);
  if (buyerIds.length === 0) return [];

  const { data, error } = await supabase
    .from("site_visits")
    .select(CONNECT_SITE_VISIT_SELECT)
    .in("user_id", buyerIds)
    .order("visit_date", { ascending: true });

  if (error) {
    console.error("fetchAssignedConnectSiteVisits:", error.message);
    return [];
  }

  return ((data ?? []) as unknown as ConnectSiteVisitRow[]).map((row) => {
    const enriched = enrichVisitRowBuyer({ ...row } as Record<string, unknown>);
    return { ...row, buyer: enriched.buyer };
  });
}

export async function fetchAssignedConnectProperties(connectPartnerId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, city, location, price, status, photos")
    .eq("seller_id", connectPartnerId)
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
