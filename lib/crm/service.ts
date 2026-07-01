import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITY_STATUS_MAP, LEAD_STATUS_ORDER } from "./constants";
import { getAdminUserIds, getPropertyOwner } from "./routing";
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

export async function ensureLead(
  supabase: SupabaseClient,
  buyerId: string,
  initialStatus: LeadStatus = "new",
): Promise<CrmLead | null> {
  const { data: existing } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (existing) return existing as CrmLead;

  const { data, error } = await supabase
    .from("crm_leads")
    .insert({ buyer_id: buyerId, status: initialStatus })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("buyer_id", buyerId)
        .maybeSingle();
      return (retry as CrmLead) ?? null;
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
  supabase: SupabaseClient,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    leadId?: string;
    propertyId?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("crm_notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    lead_id: input.leadId ?? null,
    property_id: input.propertyId ?? null,
  });

  if (error) console.error("createNotification:", error.message);
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
      message: `${input.buyerName ?? "A buyer"} ${input.message} on a builder listing. Assign a Connect partner.`,
      leadId: input.leadId,
      propertyId: input.propertyId,
    });
  }
}

export async function recordLeadActivity(
  supabase: SupabaseClient,
  input: RecordActivityInput,
): Promise<{ leadId: string; activityId: string } | null> {
  const lead = await ensureLead(supabase, input.buyerId);
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

  if (!input.skipNotifications && input.propertyId) {
    const notifMap: Partial<Record<ActivityType, NotificationType>> = {
      property_saved: "property_saved",
      inquiry_sent: "new_inquiry",
      visit_requested: "site_visit_booked",
      site_visit_booked: "site_visit_booked",
      contact_requested: "new_inquiry",
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

  return { leadId: lead.id, activityId: activity.id };
}

export async function assignConnectPartner(
  supabase: SupabaseClient,
  leadId: string,
  connectPartnerId: string,
  assignedByUserId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("crm_leads")
    .select("assigned_connect_id, buyer_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!existing) return false;

  const isReassign =
    existing.assigned_connect_id &&
    existing.assigned_connect_id !== connectPartnerId;

  const { error } = await supabase
    .from("crm_leads")
    .update({ assigned_connect_id: connectPartnerId })
    .eq("id", leadId);

  if (error) {
    console.error("assignConnectPartner:", error.message);
    return false;
  }

  await recordLeadActivity(supabase, {
    buyerId: existing.buyer_id,
    activityType: isReassign ? "lead_reassigned" : "lead_assigned",
    title: isReassign ? "Lead reassigned" : "Connect partner assigned",
    description: `Lead assigned to Connect partner`,
    metadata: {
      connect_partner_id: connectPartnerId,
      assigned_by: assignedByUserId,
    },
    skipStatusAdvance: true,
    skipNotifications: true,
  });

  await createNotification(supabase, {
    userId: connectPartnerId,
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
