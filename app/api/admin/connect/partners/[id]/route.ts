import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import {
  fetchConnectPartnerById,
  fetchPartnerActivities,
  fetchPartnerAnalytics,
  fetchPartnerBuyers,
  fetchPartnerProperties,
} from "@/lib/connect/partners/queries";
import { logConnectPartnerActivity } from "@/lib/connect/partners/service";
import { validateUpdateConnectPartner } from "@/lib/connect/partners/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;

  try {
    const supabase = createSupabaseServiceClient();
    const partner = await fetchConnectPartnerById(supabase, id);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const [buyers, properties, activities, analytics] = await Promise.all([
      fetchPartnerBuyers(supabase, id),
      fetchPartnerProperties(supabase, id),
      fetchPartnerActivities(supabase, { partnerId: id, limit: 50 }),
      fetchPartnerAnalytics(supabase, id),
    ]);

    return NextResponse.json({ partner, buyers, properties, activities, analytics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load partner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const validationError = validateUpdateConnectPartner({
    companyName: body.companyName,
    managerName: body.managerName,
    phone: body.phone,
    email: body.email,
    status: body.status,
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.companyName !== undefined) patch.company_name = body.companyName.trim();
  if (body.managerName !== undefined) patch.manager_name = body.managerName.trim();
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.email !== undefined) patch.email = body.email.trim().toLowerCase();
  if (body.address !== undefined) patch.address = body.address?.trim() || null;
  if (body.city !== undefined) patch.city = body.city?.trim() || null;
  if (body.gst !== undefined) patch.gst = body.gst?.trim() || null;
  if (body.rera !== undefined) patch.rera = body.rera?.trim() || null;
  if (body.logo !== undefined) patch.logo = body.logo?.trim() || null;
  if (body.notes !== undefined) patch.notes = body.notes?.trim() || null;
  if (body.status !== undefined) patch.status = body.status;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("connect_partners")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.profile_id) {
      const profilePatch: Record<string, unknown> = {};
      if (body.managerName !== undefined) profilePatch.full_name = body.managerName.trim();
      if (body.email !== undefined) profilePatch.email = body.email.trim().toLowerCase();
      if (body.phone !== undefined) profilePatch.phone = body.phone;
      if (Object.keys(profilePatch).length > 0) {
        await supabase.from("profiles").update(profilePatch).eq("id", data.profile_id);
      }
    }

    await logConnectPartnerActivity(supabase, {
      type: "lead_updated",
      partnerId: id,
      actorId: access.userId,
      description: "Partner profile updated by admin",
      metadata: patch,
    });

    return NextResponse.json({ partner: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update partner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
