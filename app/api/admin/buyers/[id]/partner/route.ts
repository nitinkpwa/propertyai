import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { assignBuyerToPartner } from "@/lib/connect/partners/service";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id: buyerId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const partnerId =
    body.connectPartnerId === null || body.connectPartnerId === ""
      ? null
      : typeof body.connectPartnerId === "string"
        ? body.connectPartnerId
        : null;

  const supabase = createSupabaseServiceClient();
  const ok = await assignBuyerToPartner(supabase, buyerId, partnerId, access.userId);

  if (!ok) {
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
