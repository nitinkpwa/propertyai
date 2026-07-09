import { NextRequest, NextResponse } from "next/server";
import { recordPartnerCommunication, createNotification } from "@/lib/crm/service";
import { scheduleFollowUp } from "@/lib/crm/workflowOrchestrator";
import { recordLeadActivity } from "@/lib/crm/service";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getPartnerIdForProfile } from "@/lib/connect/partners/queries";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const leadId = typeof body.leadId === "string" ? body.leadId : null;

  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, assigned_connect_id, connect_partner_id, buyer_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const partnerId = await getPartnerIdForProfile(supabase, user.id);
  const isPartner = lead.assigned_connect_id === user.id || Boolean(partnerId);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isPartner && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "call" || action === "whatsapp" || action === "email") {
    const ok = await recordPartnerCommunication(supabase, {
      leadId,
      partnerProfileId: user.id,
      channel: action,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ ok });
  }

  if (action === "follow_up") {
    const dueAt = typeof body.dueAt === "string" ? body.dueAt : null;
    const followAction = typeof body.followAction === "string" ? body.followAction.trim() : "";
    if (!dueAt || !followAction) {
      return NextResponse.json({ error: "dueAt and followAction required" }, { status: 400 });
    }

    const result = await scheduleFollowUp(supabase, {
      leadId,
      partnerId: partnerId ?? undefined,
      assignedTo: user.id,
      dueAt,
      priority: body.priority ?? "normal",
      action: followAction,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Failed to schedule follow-up" }, { status: 500 });
    }

    await recordLeadActivity(supabase, {
      buyerId: lead.buyer_id as string,
      activityType: "follow_up_scheduled",
      title: "Follow-up scheduled",
      description: followAction,
      metadata: { due_at: dueAt, follow_up_id: result.id },
      skipNotifications: true,
    });

    return NextResponse.json({ ok: true, followUpId: result.id });
  }

  if (action === "note") {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note) {
      return NextResponse.json({ error: "note required" }, { status: 400 });
    }

    await supabase
      .from("crm_leads")
      .update({ notes: note, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    await recordLeadActivity(supabase, {
      buyerId: lead.buyer_id as string,
      activityType: "status_changed",
      title: "Partner note added",
      description: note,
      skipStatusAdvance: true,
      skipNotifications: true,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "status") {
    const status = body.status as string;
    if (!status) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }

    await supabase
      .from("crm_leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    await recordLeadActivity(supabase, {
      buyerId: lead.buyer_id as string,
      activityType: "status_changed",
      title: `Lead status updated to ${status.replace(/_/g, " ")}`,
      description: `Pipeline stage changed by partner`,
      skipStatusAdvance: true,
      skipNotifications: true,
    });

    await createNotification(supabase, {
      userId: lead.buyer_id as string,
      type: "status_changed",
      title: "Lead status updated",
      message: `Your property journey status is now: ${status.replace(/_/g, " ")}`,
      leadId,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
