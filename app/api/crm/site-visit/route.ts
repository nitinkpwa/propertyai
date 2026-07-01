import { NextRequest, NextResponse } from "next/server";
import { bookSiteVisit } from "@/lib/crm/bookSiteVisit";
import {
  PROPERTY_UUID_RE,
  devLogSiteVisit,
  type SiteVisitErrorCode,
} from "@/lib/crm/siteVisitErrors";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

function errorResponse(
  status: number,
  message: string,
  code: SiteVisitErrorCode,
  dev?: Record<string, unknown>,
) {
  devLogSiteVisit("API error", { status, message, code, ...dev });
  const body: Record<string, unknown> = { error: message, code };
  if (process.env.NODE_ENV === "development" && dev) {
    body.dev = dev;
  }
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return errorResponse(401, "Please sign in to book a site visit.", "UNAUTHORIZED");
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const propertyId =
    typeof body.propertyId === "string" ? body.propertyId.trim() : "";
  const visitDate = typeof body.visitDate === "string" ? body.visitDate.trim() : "";
  const visitTime = typeof body.visitTime === "string" ? body.visitTime.trim() : "";
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
  const builderName =
    typeof body.builderName === "string" ? body.builderName.trim() : undefined;

  devLogSiteVisit("POST /api/crm/site-visit", {
    receivedBody: body,
    authenticatedUserId: user.id,
    propertyId,
    buyerId: user.id,
    selectedDate: visitDate,
    selectedTime: visitTime,
    purpose,
  });

  if (!propertyId) {
    return errorResponse(
      400,
      "Unable to identify this property. Please refresh the page.",
      "MISSING_PROPERTY_ID",
    );
  }

  if (!PROPERTY_UUID_RE.test(propertyId)) {
    return errorResponse(
      400,
      "Unable to identify this property. Please refresh the page.",
      "INVALID_PROPERTY_ID",
      { propertyIdReceived: propertyId },
    );
  }

  if (!visitDate || !visitTime) {
    return errorResponse(400, "Please select a visit date and time.", "VALIDATION");
  }

  const supabase = await createSupabaseServerClient();

  const result = await bookSiteVisit(supabase, {
    buyerId: user.id,
    propertyId,
    visitDate,
    visitTime,
    purpose: purpose || undefined,
    builderName,
  });

  if (!result.ok) {
    return errorResponse(result.status, result.message, result.code, result.dev);
  }

  return NextResponse.json({
    visitId: result.visitId,
    checklist: result.checklist,
    leadId: result.leadId,
    inquiryId: result.inquiryId,
  });
}
