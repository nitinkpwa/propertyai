import { NextRequest, NextResponse } from "next/server";
import { recordLeadActivity } from "@/lib/crm/service";
import { completeFollowUp, scheduleFollowUp } from "@/lib/crm/workflowOrchestrator";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getPartnerIdForProfile } from "@/lib/connect/partners/queries";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const leadId = typeof body.leadId === "string" ? body.leadId : null;
  const dueAt = typeof body.dueAt === "string" ? body.dueAt : null;
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (!leadId || !dueAt || !action) {
    return NextResponse.json({ error: "leadId, dueAt, action required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const partnerId = await getPartnerIdForProfile(supabase, user.id);

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("buyer_id, assigned_connect_id, connect_partner_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const isPartner = lead.assigned_connect_id === user.id || lead.connect_partner_id === partnerId;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isPartner && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await scheduleFollowUp(supabase, {
    leadId,
    partnerId: partnerId ?? undefined,
    assignedTo: user.id,
    dueAt,
    priority: body.priority ?? "normal",
    action,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  if (!result) {
    return NextResponse.json({ error: "Failed to schedule" }, { status: 500 });
  }

  await recordLeadActivity(supabase, {
    buyerId: lead.buyer_id as string,
    activityType: "follow_up_scheduled",
    title: "Follow-up scheduled",
    description: action,
    metadata: { due_at: dueAt },
    skipNotifications: true,
  });

  return NextResponse.json({ ok: true, id: result.id });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const followUpId = typeof body.followUpId === "string" ? body.followUpId : null;

  if (!followUpId) {
    return NextResponse.json({ error: "followUpId required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const ok = await completeFollowUp(supabase, followUpId);

  if (!ok) {
    return NextResponse.json({ error: "Failed to complete" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
