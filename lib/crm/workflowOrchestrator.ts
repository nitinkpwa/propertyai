import type { SupabaseClient } from "@supabase/supabase-js";
import { recalculateLeadIntelligence } from "@/lib/crm/leadIntelligence";
import { createNotification } from "@/lib/crm/service";
import type { ActivityType, LeadStatus, NotificationType } from "@/lib/crm/types";

export interface WorkflowSideEffects {
  leadId: string;
  buyerId: string;
  propertyId?: string | null;
  activityType: ActivityType;
  newStatus?: LeadStatus;
  notifyBuyer?: { title: string; message: string; type: NotificationType };
  notifyPartner?: { profileId: string; title: string; message: string; type: NotificationType };
}

const ACTIVITY_NOTIFY_PARTNER: Partial<Record<ActivityType, NotificationType>> = {
  site_visit_booked: "site_visit_booked",
  visit_requested: "site_visit_booked",
  inquiry_sent: "new_inquiry",
  negotiation_started: "negotiation_started",
};

const ACTIVITY_NOTIFY_BUYER: Partial<Record<ActivityType, boolean>> = {
  site_visit_accepted: true,
  site_visit_rejected: true,
  site_visit_completed: true,
  follow_up_scheduled: true,
  deal_booked: true,
};

export async function runWorkflowSideEffects(
  supabase: SupabaseClient,
  effects: WorkflowSideEffects,
): Promise<void> {
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, buyer_id, status, connect_partner_id, assigned_connect_id, primary_property_id")
    .eq("id", effects.leadId)
    .maybeSingle();

  if (!lead) return;

  const propertyId = effects.propertyId ?? (lead.primary_property_id as string | null);

  let propertyPrice: number | null = null;
  if (propertyId) {
    const { data: prop } = await supabase
      .from("properties")
      .select("price")
      .eq("id", propertyId)
      .maybeSingle();
    propertyPrice = (prop?.price as number) ?? null;
  }

  await recalculateLeadIntelligence(supabase, {
    buyerId: lead.buyer_id as string,
    leadId: lead.id as string,
    status: (effects.newStatus ?? lead.status) as LeadStatus,
    propertyId,
    propertyPrice,
  });

  if (effects.notifyBuyer) {
    await createNotification(supabase, {
      userId: lead.buyer_id as string,
      type: effects.notifyBuyer.type,
      title: effects.notifyBuyer.title,
      message: effects.notifyBuyer.message,
      leadId: lead.id as string,
      propertyId: propertyId ?? undefined,
    });
  }

  if (effects.notifyPartner) {
    await createNotification(supabase, {
      userId: effects.notifyPartner.profileId,
      type: effects.notifyPartner.type,
      title: effects.notifyPartner.title,
      message: effects.notifyPartner.message,
      leadId: lead.id as string,
      propertyId: propertyId ?? undefined,
    });
  } else if (lead.assigned_connect_id && ACTIVITY_NOTIFY_PARTNER[effects.activityType]) {
    const notifType = ACTIVITY_NOTIFY_PARTNER[effects.activityType]!;
    await createNotification(supabase, {
      userId: lead.assigned_connect_id as string,
      type: notifType,
      title: `Lead activity: ${effects.activityType.replace(/_/g, " ")}`,
      message: `A buyer on your assigned property performed: ${effects.activityType.replace(/_/g, " ")}`,
      leadId: lead.id as string,
      propertyId: propertyId ?? undefined,
    });
  }

  if (ACTIVITY_NOTIFY_BUYER[effects.activityType] && !effects.notifyBuyer) {
    // Handled by specific service functions — no duplicate
  }

  await markOverdueFollowUps(supabase, lead.id as string);
}

export async function markOverdueFollowUps(
  supabase: SupabaseClient,
  leadId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("crm_follow_ups")
    .update({ status: "overdue", updated_at: now })
    .eq("lead_id", leadId)
    .eq("status", "pending")
    .lt("due_at", now);
}

export async function scheduleFollowUp(
  supabase: SupabaseClient,
  input: {
    leadId: string;
    partnerId?: string | null;
    assignedTo?: string | null;
    dueAt: string;
    priority?: "low" | "normal" | "high" | "urgent";
    action: string;
    notes?: string;
  },
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("crm_follow_ups")
    .insert({
      lead_id: input.leadId,
      partner_id: input.partnerId ?? null,
      assigned_to: input.assignedTo ?? null,
      due_at: input.dueAt,
      priority: input.priority ?? "normal",
      action: input.action,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("scheduleFollowUp:", error.message);
    return null;
  }

  await supabase
    .from("crm_leads")
    .update({
      follow_up_date: input.dueAt,
      follow_up_priority: input.priority ?? "normal",
      next_action: input.action,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.leadId);

  return { id: data.id as string };
}

export async function completeFollowUp(
  supabase: SupabaseClient,
  followUpId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("crm_follow_ups")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", followUpId);

  return !error;
}

export async function getPendingFollowUps(
  supabase: SupabaseClient,
  partnerId: string,
): Promise<Array<{
  id: string;
  lead_id: string;
  due_at: string;
  priority: string;
  action: string;
  status: string;
  buyer_name?: string | null;
}>> {
  const { data: leads } = await supabase
    .from("crm_leads")
    .select("id")
    .eq("connect_partner_id", partnerId);

  const leadIds = (leads ?? []).map((l) => l.id as string);
  if (leadIds.length === 0) return [];

  const { data, error } = await supabase
    .from("crm_follow_ups")
    .select("id, lead_id, due_at, priority, action, status, lead:crm_leads(buyer:profiles(full_name))")
    .in("lead_id", leadIds)
    .in("status", ["pending", "overdue"])
    .order("due_at", { ascending: true });

  if (error) {
    console.error("getPendingFollowUps:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const lead = row.lead as { buyer?: { full_name?: string } | { full_name?: string }[] } | null;
    const buyer = Array.isArray(lead?.buyer) ? lead?.buyer[0] : lead?.buyer;
    return {
      id: row.id as string,
      lead_id: row.lead_id as string,
      due_at: row.due_at as string,
      priority: row.priority as string,
      action: row.action as string,
      status: row.status as string,
      buyer_name: buyer?.full_name ?? null,
    };
  });
}
