import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { fetchConnectPartnerById } from "@/lib/connect/partners/queries";
import { assignPropertyToPartner } from "@/lib/connect/partners/service";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id: propertyId } = await context.params;
  const supabase = createSupabaseServiceClient();

  const { data: property } = await supabase
    .from("properties")
    .select("connect_partner_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (!property?.connect_partner_id) {
    return NextResponse.json({ partner: null });
  }

  const partner = await fetchConnectPartnerById(supabase, property.connect_partner_id as string);
  return NextResponse.json({ partner });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id: propertyId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const partnerId =
    body.connectPartnerId === null || body.connectPartnerId === ""
      ? null
      : typeof body.connectPartnerId === "string"
        ? body.connectPartnerId
        : null;

  const supabase = createSupabaseServiceClient();
  const ok = await assignPropertyToPartner(supabase, propertyId, partnerId, access.userId);

  if (!ok) {
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
