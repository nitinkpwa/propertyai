import { NextRequest, NextResponse } from "next/server";
import { bookSiteVisit } from "@/lib/crm/bookSiteVisit";
import {
  PROPERTY_UUID_RE,
  type SiteVisitErrorCode,
} from "@/lib/crm/siteVisitErrors";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

function errorResponse(
  status: number,
  message: string,
  code: SiteVisitErrorCode,
  details?: Record<string, unknown>,
) {
  console.error("[SiteVisit] API error", {
    route: "POST /api/crm/site-visit",
    status,
    message,
    code,
    ...details,
  });
  return NextResponse.json(
    {
      error: message,
      code,
      // Always return diagnostic details so the UI can show the real cause
      details: details ?? null,
    },
    { status },
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse(
        401,
        "Please sign in to request a property visit.",
        "UNAUTHORIZED",
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("[SiteVisit] Invalid JSON body", parseErr);
      return errorResponse(400, "Invalid request body.", "VALIDATION", {
        parseError: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
    }

    // Accept both camelCase API fields and snake_case aliases from clients
    const propertyId = String(
      body.propertyId ?? body.property_id ?? "",
    ).trim();
    const visitDate = String(
      body.visitDate ?? body.preferred_date ?? body.visit_date ?? "",
    ).trim();
    const visitTime = String(
      body.visitTime ?? body.preferred_time ?? body.visit_time ?? "",
    ).trim();
    const purpose = String(body.purpose ?? "").trim();
    const builderName =
      typeof body.builderName === "string"
        ? body.builderName.trim()
        : typeof body.builder_name === "string"
          ? body.builder_name.trim()
          : undefined;

    const contactName =
      typeof body.contact_name === "string"
        ? body.contact_name.trim()
        : typeof body.contactName === "string"
          ? body.contactName.trim()
          : undefined;
    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : typeof body.contact_phone === "string"
          ? body.contact_phone.trim()
          : undefined;

    console.error("[SiteVisit] POST /api/crm/site-visit received", {
      authenticatedUserId: user.id,
      propertyId,
      visitDate,
      visitTime,
      purpose,
      builderName,
      contactName,
      phone,
      loan_required: body.loan_required ?? body.loanAssist ?? null,
      preferred_language: body.preferred_language ?? body.language ?? null,
      transport_mode: body.transport_mode ?? body.transport ?? null,
      notes: body.notes ?? body.buyerNotes ?? null,
      rawKeys: Object.keys(body),
    });

    if (!propertyId) {
      return errorResponse(
        400,
        "Selected property not found. Please refresh the page.",
        "MISSING_PROPERTY_ID",
        { receivedBody: body },
      );
    }

    if (!PROPERTY_UUID_RE.test(propertyId)) {
      return errorResponse(
        400,
        "Selected property not found. Invalid property id.",
        "INVALID_PROPERTY_ID",
        { propertyIdReceived: propertyId },
      );
    }

    if (!visitDate || !visitTime) {
      return errorResponse(
        400,
        "Please select a visit date and time.",
        "VALIDATION",
        { visitDate, visitTime },
      );
    }

    // Enrich purpose with optional concierge fields when sent separately
    const purposeParts = [purpose].filter(Boolean);
    if (body.loan_required === true || body.loan_required === "yes" || body.loanAssist === "yes") {
      purposeParts.push("Home loan assistance: Yes");
    }
    if (body.preferred_language || body.language) {
      purposeParts.push(`Language: ${body.preferred_language ?? body.language}`);
    }
    if (body.transport_mode || body.transport) {
      purposeParts.push(`Arrival: ${body.transport_mode ?? body.transport}`);
    }
    if (body.notes || body.buyerNotes) {
      purposeParts.push(`Notes: ${body.notes ?? body.buyerNotes}`);
    }
    if (contactName) purposeParts.push(`Contact: ${contactName}`);
    if (phone) purposeParts.push(`Phone: ${phone}`);

    const supabase = await createSupabaseServerClient();

    const result = await bookSiteVisit(supabase, {
      buyerId: user.id,
      propertyId,
      visitDate,
      visitTime,
      purpose: purposeParts.length ? purposeParts.join(" · ") : undefined,
      builderName,
    });

    if (!result.ok) {
      return errorResponse(result.status, result.message, result.code, {
        ...result.dev,
        buyerId: user.id,
        propertyId,
        visitDate,
        visitTime,
      });
    }

    console.error("[SiteVisit] POST success", {
      visitId: result.visitId,
      leadId: result.leadId,
      inquiryId: result.inquiryId,
      buyerId: user.id,
      propertyId,
    });

    return NextResponse.json({
      ok: true,
      visitId: result.visitId,
      checklist: result.checklist,
      leadId: result.leadId,
      inquiryId: result.inquiryId,
      redirectTo: "/buyer/site-visits",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[SiteVisit] API UNCAUGHT", { message, stack });
    return errorResponse(500, `Booking failed: ${message}`, "UNKNOWN", {
      uncaught: true,
      message,
      stack,
    });
  }
}
