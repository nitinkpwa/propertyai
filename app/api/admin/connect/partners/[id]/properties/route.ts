import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { assignPropertyToPartner } from "@/lib/connect/partners/service";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id: partnerId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const ok = await assignPropertyToPartner(supabase, propertyId, partnerId, access.userId);

  if (!ok) {
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => ({}));
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const ok = await assignPropertyToPartner(supabase, propertyId, null, access.userId);

  if (!ok) {
    return NextResponse.json({ error: "Removal failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
