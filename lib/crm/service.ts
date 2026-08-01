import type { SupabaseClient } from "@supabase/supabase-js";
import { logPartnerEngagementFromProperty } from "@/lib/connect/partners/propagate";
import { tryCreateSupabaseServiceClient } from "@/lib/supabase/service";
import { ACTIVITY_STATUS_MAP, LEAD_STATUS_ORDER } from "./constants";
import { getAdminUserIds, getPropertyOwner } from "./routing";
import { runWorkflowSideEffects } from "./workflowOrchestrator";
import type {
  ActivityType,
  CrmLead,
  LeadStatus,
  NotificationType,
} from "./types";

export interface RecordActivityInput {
  buyerId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  propertyId?: string;
  inquiryId?: string;
  conversationId?: string;
  siteVisitId?: string;
  metadata?: Record<string, unknown>;
  skipStatusAdvance?: boolean;
  skipNotifications?: boolean;
}

function statusRank(status: LeadStatus): number {
  const idx = LEAD_STATUS_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

function shouldAdvanceStatus(current: LeadStatus, next: LeadStatus): boolean {
  if (next === "lost") return true;
  if (current === "lost" || current === "completed") return false;
  return statusRank(next) > statusRank(current);
}

export interface EnsureLeadOptions {
  /** Connect partner owning the property this lead originates from. */
  connectPartnerId?: string | null;
  primaryPropertyId?: string | null;
}

/**
 * Resolve the optional Connect partner assigned to a property.
 * Seller (`properties.seller_id`) remains the owner; Connect Partner only
 * assists when `connect_partner_id` is explicitly set.
 */
export async function getPropertyConnectPartnerId(
  propertyId: string,
  fallbackClient?: SupabaseClient,
): Promise<string | null> {
  const supabase = tryCreateSupabaseServiceClient() ?? fallbackClient;
  if (!supabase) {
    console.error(
      "getPropertyConnectPartnerId: no service role or fallback client available",
    );
    return null;
  }
  const { data, error } = await supabase
    .from("properties")
    .select("connect_partner_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    console.error("getPropertyConnectPartnerId:", error.message);
    return null;
  }
  return (data?.connect_partner_id as string | null) ?? null;
}

/**
 * CRM leads are partner-scoped: one lead per (buyer, connect partner) plus at
 * most one general lead per buyer (connectPartnerId null) for journey events
 * not tied to a partner property. A buyer enquiring on properties of several
 * partners therefore gets independent leads — ownership is never overwritten.
 */
export async function ensureLead(
  supabase: SupabaseClient,
  buyerId: string,
  initialStatus: LeadStatus = "new",
  options: EnsureLeadOptions = {},
): Promise<CrmLead | null> {
  const partnerId = options.connectPartnerId ?? null;

  const findLead = async (client: SupabaseClient): Promise<CrmLead | null> => {
    let query = client.from("crm_leads").select("*").eq("buyer_id", buyerId);
    query = partnerId
      ? query.eq("connect_partner_id", partnerId)
      : query.is("connect_partner_id", null);
    const { data } = await query.maybeSingle();
    return (data as CrmLead) ?? null;
  };

  const existing = await findLead(supabase);
  if (existing) return existing;

  // Partner-scoped leads preferably use the service role (crm_leads guard may
  // strip connect columns from non-privileged inserts). Fall back to user client.
  const service = partnerId ? tryCreateSupabaseServiceClient() : null;
  const writer = service ?? supabase;

  const insertBody: Record<string, unknown> = {
    buyer_id: buyerId,
    status: initialStatus,
  };

  if (partnerId && service) {
    insertBody.connect_partner_id = partnerId;
    insertBody.connect_assignment_source = "auto";
    if (options.primaryPropertyId) {
      insertBody.primary_property_id = options.primaryPropertyId;
    }
    const { data: partner } = await writer
      .from("connect_partners")
      .select("profile_id")
      .eq("id", partnerId)
      .maybeSingle();
    if (partner?.profile_id) {
      insertBody.assigned_connect_id = partner.profile_id;
    }
  } else if (partnerId && !service) {
    console.warn(
      "ensureLead: SUPABASE_SERVICE_ROLE_KEY missing — creating general lead without partner stamp",
    );
  }

  const { data, error } = await writer
    .from("crm_leads")
    .insert(insertBody)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return findLead(writer);
    }
    // Last resort: general lead without partner fields
    if (partnerId) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("crm_leads")
        .insert({ buyer_id: buyerId, status: initialStatus })
        .select("*")
        .single();
      if (!fallbackError && fallback) return fallback as CrmLead;
      if (fallbackError?.code === "23505") return findLead(supabase);
      console.error("ensureLead fallback:", fallbackError?.message ?? error.message);
      return null;
    }
    console.error("ensureLead:", error.message);
    return null;
  }

  return data as CrmLead;
}

export async function ensureInquiry(
  supabase: SupabaseClient,
  input: {
    buyerId: string;
    propertyId: string;
    sellerId: string;
    message: string;
  },
): Promise<string | null> {
  const { data: existing, error: readError } = await supabase
    .from("inquiries")
    .select("id")
    .eq("from_user_id", input.buyerId)
    .eq("property_id", input.propertyId)
    .eq("seller_id", input.sellerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) {
    console.error("ensureInquiry read:", readError.message);
    return null;
  }

  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("inquiries")
    .insert({
      from_user_id: input.buyerId,
      property_id: input.propertyId,
      seller_id: input.sellerId,
      message: input.message,
      status: "new",
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("ensureInquiry insert:", insertError?.message);
    return null;
  }

  return created.id;
}

export async function notifyAdminsOfLead(
  supabase: SupabaseClient,
  input: {
    title: string;
    message: string;
    leadId: string;
    propertyId: string;
  },
): Promise<void> {
  const adminIds = await getAdminUserIds(supabase);
  for (const adminId of adminIds) {
    await createNotification(supabase, {
      userId: adminId,
      type: "new_lead",
      title: input.title,
      message: input.message,
      leadId: input.leadId,
      propertyId: input.propertyId,
    });
  }
}

export async function advanceLeadStatus(
  supabase: SupabaseClient,
  leadId: string,
  newStatus: LeadStatus,
  primaryPropertyId?: string,
): Promise<void> {
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return;

  const current = lead.status as LeadStatus;
  if (!shouldAdvanceStatus(current, newStatus)) return;

  const patch: Record<string, unknown> = { status: newStatus };
  if (primaryPropertyId) patch.primary_property_id = primaryPropertyId;

  await supabase.from("crm_leads").update(patch).eq("id", leadId);
}

export async function createNotification(
  _supabase: SupabaseClient,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    leadId?: string;
    propertyId?: string;
  },
): Promise<void> {
  // Notifications are cross-user by design (a buyer's action notifies a seller).
  // Write through the service role so the hardened RLS INSERT policy
  // (self-or-admin only) cannot be abused to spoof notifications from a client
  // session, while legitimate cross-user delivery still works server-side.
  const supabase = tryCreateSupabaseServiceClient();
  if (!supabase) {
    console.error(
      "createNotification: skipped — SUPABASE_SERVICE_ROLE_KEY missing",
      { type: input.type, userId: input.userId },
    );
    return;
  }
  const { error } = await supabase.from("crm_notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    lead_id: input.leadId ?? null,
    property_id: input.propertyId ?? null,
  });

  if (error) console.error("createNotification:", error.message, error.code);
}

async function notifyForPropertyActivity(
  supabase: SupabaseClient,
  input: {
    propertyId: string;
    leadId: string;
    type: NotificationType;
    title: string;
    message: string;
    buyerName?: string;
  },
): Promise<void> {
  const owner = await getPropertyOwner(supabase, input.propertyId);
  if (!owner) return;

  if (owner.ownerType === "seller") {
    await createNotification(supabase, {
      userId: owner.ownerId,
      type: input.type,
      title: input.title,
      message: input.message,
      leadId: input.leadId,
      propertyId: input.propertyId,
    });
    return;
  }

  const adminIds = await getAdminUserIds(supabase);
  for (const adminId of adminIds) {
    await createNotification(supabase, {
      userId: adminId,
      type: "new_lead",
      title: "Builder property activity",
      message: `${input.buyerName ?? "A buyer"} ${input.message} on a listing. Seller owns the enquiry; assign a Connect Partner only if assistance is needed.`,
      leadId: input.leadId,
      propertyId: input.propertyId,
    });
  }
}

export async function recordLeadActivity(
  supabase: SupabaseClient,
  input: RecordActivityInput,
): Promise<{ leadId: string; activityId: string } | null> {
  // Ownership follows the property: activities on a partner-assigned property
  // attach to that partner's lead for this buyer; everything else goes to the
  // buyer's general (partner-less) lead.
  const connectPartnerId = input.propertyId
    ? await getPropertyConnectPartnerId(input.propertyId, supabase)
    : null;

  const lead = await ensureLead(supabase, input.buyerId, "new", {
    connectPartnerId,
    primaryPropertyId: input.propertyId ?? null,
  });
  if (!lead) return null;

  const { data: activity, error } = await supabase
    .from("crm_lead_activities")
    .insert({
      lead_id: lead.id,
      activity_type: input.activityType,
      title: input.title,
      description: input.description ?? null,
      property_id: input.propertyId ?? null,
      inquiry_id: input.inquiryId ?? null,
      conversation_id: input.conversationId ?? null,
      site_visit_id: input.siteVisitId ?? null,
      connect_partner_id: connectPartnerId,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("recordLeadActivity:", error.message);
    return null;
  }

  if (!input.skipStatusAdvance) {
    const nextStatus = ACTIVITY_STATUS_MAP[input.activityType];
    if (nextStatus) {
      await advanceLeadStatus(supabase, lead.id, nextStatus, input.propertyId);
    }
  }

  const nextStatus = ACTIVITY_STATUS_MAP[input.activityType];
  void runWorkflowSideEffects(supabase, {
    leadId: lead.id,
    buyerId: input.buyerId,
    propertyId: input.propertyId,
    activityType: input.activityType,
    newStatus: nextStatus,
  });

  if (!input.skipNotifications && input.propertyId) {
    const notifMap: Partial<Record<ActivityType, NotificationType>> = {
      property_saved: "property_saved",
      property_compared: "property_compared",
      inquiry_sent: "new_inquiry",
      visit_requested: "site_visit_booked",
      site_visit_booked: "site_visit_booked",
      contact_requested: "new_inquiry",
      visit_feedback_submitted: "visit_feedback_submitted",
      negotiation_started: "negotiation_started",
      deal_booked: "booking_completed",
    };
    const notifType = notifMap[input.activityType];
    if (notifType) {
      await notifyForPropertyActivity(supabase, {
        propertyId: input.propertyId,
        leadId: lead.id,
        type: notifType,
        title: input.title,
        message: input.description ?? input.title,
      });
    }
  }

  if (input.propertyId && connectPartnerId) {
    const partnerActivityType =
      input.activityType === "visit_requested" || input.activityType === "site_visit_booked"
        ? "site_visit"
        : "lead_updated";

    await logPartnerEngagementFromProperty({
      propertyId: input.propertyId,
      buyerId: input.buyerId,
      leadId: lead.id,
      siteVisitId: input.siteVisitId ?? null,
      actorId: input.buyerId,
      activityType: partnerActivityType,
      description: input.description ?? input.title,
    });
  }

  return { leadId: lead.id, activityId: activity.id };
}

export async function assignConnectPartner(
  supabase: SupabaseClient,
  leadId: string,
  connectPartnerProfileId: string,
  assignedByUserId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("crm_leads")
    .select("assigned_connect_id, buyer_id, connect_partner_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!existing) return false;

  const { data: partner } = await supabase
    .from("connect_partners")
    .select("id")
    .eq("profile_id", connectPartnerProfileId)
    .maybeSingle();

  const partnerRecordId = (partner?.id as string) ?? null;

  const isReassign =
    existing.assigned_connect_id &&
    existing.assigned_connect_id !== connectPartnerProfileId;

  const { error } = await supabase
    .from("crm_leads")
    .update({
      assigned_connect_id: connectPartnerProfileId,
      connect_partner_id: partnerRecordId,
      connect_assignment_source: "manual",
    })
    .eq("id", leadId);

  if (error) {
    // 23505: the buyer already has a dedicated lead for this partner —
    // ownership stays with that lead; do not merge or overwrite.
    console.error("assignConnectPartner:", error.message);
    return false;
  }

  // NOTE: ownership is lead-scoped. The buyer profile is intentionally NOT
  // linked to a partner — buyers are never owned by a Connect partner.

  await recordLeadActivity(supabase, {
    buyerId: existing.buyer_id,
    activityType: isReassign ? "lead_reassigned" : "lead_assigned",
    title: isReassign ? "Lead reassigned" : "Connect partner assigned",
    description: `Lead assigned to Connect partner`,
    metadata: {
      connect_partner_id: connectPartnerProfileId,
      assigned_by: assignedByUserId,
    },
    skipStatusAdvance: true,
    skipNotifications: true,
  });

  if (partnerRecordId) {
    await supabase.from("connect_partner_activities").insert({
      type: "buyer_assigned",
      partner_id: partnerRecordId,
      actor_id: assignedByUserId,
      buyer_id: existing.buyer_id,
      description: "Buyer assigned via CRM",
    });
  }

  await createNotification(supabase, {
    userId: connectPartnerProfileId,
    type: isReassign ? "lead_reassigned" : "lead_assigned",
    title: isReassign ? "Lead reassigned to you" : "New lead assigned",
    message: "A buyer lead has been assigned to you for follow-up.",
    leadId,
  });

  return true;
}

export async function markFirstLogin(
  supabase: SupabaseClient,
  buyerId: string,
): Promise<void> {
  const lead = await ensureLead(supabase, buyerId);
  if (!lead || lead.first_login_at) return;

  await supabase
    .from("crm_leads")
    .update({ first_login_at: new Date().toISOString() })
    .eq("id", lead.id);

  await recordLeadActivity(supabase, {
    buyerId,
    activityType: "buyer_first_login",
    title: "First login",
    description: "Buyer logged in for the first time",
    skipStatusAdvance: true,
  });
}

export async function recordPartnerCommunication(
  supabase: SupabaseClient,
  input: {
    leadId: string;
    partnerProfileId: string;
    channel: "call" | "whatsapp" | "email";
    notes?: string;
  },
): Promise<boolean> {
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("buyer_id, primary_property_id, connect_partner_id")
    .eq("id", input.leadId)
    .maybeSingle();

  if (!lead) return false;

  const activityType =
    input.channel === "call"
      ? "partner_call"
      : input.channel === "whatsapp"
        ? "partner_whatsapp"
        : "partner_email";

  const timestampCol =
    input.channel === "call"
      ? "last_call_at"
      : input.channel === "whatsapp"
        ? "last_whatsapp_at"
        : "last_email_at";

  const now = new Date().toISOString();
  await supabase
    .from("crm_leads")
    .update({ [timestampCol]: now, updated_at: now })
    .eq("id", input.leadId);

  await recordLeadActivity(supabase, {
    buyerId: lead.buyer_id as string,
    activityType,
    title: `Partner ${input.channel}`,
    description: input.notes ?? `Connect partner initiated ${input.channel}`,
    propertyId: (lead.primary_property_id as string) ?? undefined,
    metadata: { partner_id: input.partnerProfileId, channel: input.channel },
    skipNotifications: true,
  });

  if (lead.connect_partner_id) {
    await supabase.from("connect_partner_activities").insert({
      type: "lead_updated",
      partner_id: lead.connect_partner_id,
      actor_id: input.partnerProfileId,
      buyer_id: lead.buyer_id,
      description: `${input.channel} with buyer`,
    });
  }

  return true;
}
