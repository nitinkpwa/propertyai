import { NextRequest, NextResponse } from "next/server";
import { assignBuyerToPartner } from "@/lib/connect/partners/service";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { loadAdminLeadProfile } from "@/lib/admin/leads/loadLeadProfile";
import { LEAD_STATUS_ORDER } from "@/lib/crm/constants";
import { recordLeadActivity } from "@/lib/crm/service";
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
    connectPartnerId?: string | null;
    buyerNotes?: string;
  };

  try {
    const lead = await loadAdminLeadProfile(id);
    if (!lead?.crmLeadId) {
      return NextResponse.json({ error: "CRM lead record required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const patch: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!LEAD_STATUS_ORDER.includes(body.status)) {
        return NextResponse.json({ error: "Invalid lead status" }, { status: 400 });
      }
      patch.status = body.status;
    }

    if (body.connectPartnerId !== undefined) {
      const ok = await assignBuyerToPartner(
        supabase,
        lead.buyerId,
        body.connectPartnerId,
        access.userId,
      );
      if (!ok) {
        return NextResponse.json({ error: "Partner assignment failed" }, { status: 500 });
      }
    } else if (body.assignedConnectId !== undefined) {
      const { data: partner } = body.assignedConnectId
        ? await supabase
            .from("connect_partners")
            .select("id")
            .eq("profile_id", body.assignedConnectId)
            .maybeSingle()
        : { data: null };

      // Lead-scoped manual routing only: buyers are never owned by a partner
      // at the profile level (ownership is Property → Partner → Lead).
      patch.assigned_connect_id = body.assignedConnectId;
      patch.connect_partner_id = (partner?.id as string) ?? null;
      patch.connect_assignment_source = body.assignedConnectId ? "manual" : "auto";
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("crm_leads").update(patch).eq("id", lead.crmLeadId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Log admin status changes to the lead timeline so history is preserved.
      if (patch.status !== undefined && lead.buyerId) {
        await recordLeadActivity(supabase, {
          buyerId: lead.buyerId,
          activityType: "status_changed",
          title: "Status updated by admin",
          description: `Lead status set to "${String(patch.status)}"`,
          metadata: { new_status: patch.status, changed_by: access.userId },
          skipStatusAdvance: true,
          skipNotifications: true,
        });
      }
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
