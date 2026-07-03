import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { loadAdminLeadProfile } from "@/lib/admin/leads/loadLeadProfile";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { LeadStatus } from "@/lib/crm/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;

  try {
    const profile = await loadAdminLeadProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load lead";
    console.error("GET /api/admin/leads/[id]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    status?: LeadStatus;
    assignedConnectId?: string | null;
    buyerNotes?: string;
  };

  try {
    const lead = await loadAdminLeadProfile(id);
    if (!lead?.crmLeadId) {
      return NextResponse.json({ error: "CRM lead record required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const patch: Record<string, unknown> = {};

    if (body.status) patch.status = body.status;
    if (body.assignedConnectId !== undefined) patch.assigned_connect_id = body.assignedConnectId;

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("crm_leads").update(patch).eq("id", lead.crmLeadId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.buyerNotes !== undefined) {
      const { error } = await supabase
        .from("profiles")
        .update({ buyer_notes: body.buyerNotes })
        .eq("id", lead.buyerId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updated = await loadAdminLeadProfile(id);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
