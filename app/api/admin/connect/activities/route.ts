import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin/auth";
import { fetchPartnerActivities } from "@/lib/connect/partners/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const access = await requireAdminApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const partnerId = req.nextUrl.searchParams.get("partnerId") ?? undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);

  const supabase = createSupabaseServiceClient();
  const activities = await fetchPartnerActivities(supabase, {
    partnerId,
    limit,
    offset,
  });

  return NextResponse.json({ activities });
}
