import { NextRequest, NextResponse } from "next/server";
import { getSiteVisitAvailability } from "@/lib/crm/siteVisitAvailability";
import { PROPERTY_UUID_RE } from "@/lib/crm/siteVisitErrors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("propertyId")?.trim() ?? "";

  if (!propertyId || !PROPERTY_UUID_RE.test(propertyId)) {
    return NextResponse.json(
      {
        available: false,
        reason: "not_found",
        message: "Site visits are temporarily unavailable for this property.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const result = await getSiteVisitAvailability(supabase, propertyId);

  return NextResponse.json({
    available: result.available,
    reason: result.reason,
    message: result.message,
    siteVisitEnabled: result.siteVisitEnabled,
    status: result.status,
  });
}
