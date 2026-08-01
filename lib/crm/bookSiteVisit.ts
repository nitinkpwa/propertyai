import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createNotification,
  ensureInquiry,
  ensureLead,
  notifyAdminsOfLead,
  recordLeadActivity,
} from "./service";
import { evaluateSiteVisitAvailability } from "./siteVisitAvailability";
import { lookupPropertyForSiteVisit } from "./lookupPropertyForSiteVisit";
import {
  debugPropertyOwnerResolution,
  PROPERTY_OWNER_FIELD,
  resolveListingOwner,
} from "./resolveListingOwner";
import { devLogSiteVisit, type SiteVisitErrorCode } from "./siteVisitErrors";
import { buildChecklistForProperty } from "./visitService";

export interface BookSiteVisitInput {
  buyerId: string;
  propertyId: string;
  visitDate: string;
  visitTime: string;
  purpose?: string;
  builderName?: string;
}

export interface BookSiteVisitSuccess {
  ok: true;
  visitId: string;
  checklist: string[];
  leadId: string;
  inquiryId: string;
}

export interface BookSiteVisitFailure {
  ok: false;
  status: number;
  message: string;
  code: SiteVisitErrorCode;
  dev?: Record<string, unknown>;
}

export type BookSiteVisitResult = BookSiteVisitSuccess | BookSiteVisitFailure;

function normalizeVisitTime(time: string): string {
  const trimmed = time.trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

function isMissingTableError(message?: string | null): boolean {
  if (!message) return false;
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function isMissingColumnError(message?: string | null): boolean {
  if (!message) return false;
  return (
    /column|does not exist|schema cache/i.test(message) &&
    /lead_id|inquiry_id|checklist|purpose|connect_partner_id|builder_name/i.test(
      message,
    )
  );
}

function classifyInsertFailure(message: string, code?: string): {
  code: SiteVisitErrorCode;
  message: string;
} {
  const lower = message.toLowerCase();
  if (code === "42501" || /row-level security|permission denied|rls/i.test(message)) {
    return {
      code: "PERMISSION_DENIED",
      message: "Database permission denied. Your account cannot create this booking.",
    };
  }
  if (code === "23503" || /foreign key/i.test(lower)) {
    return {
      code: "CONSTRAINT_FAILED",
      message: "Selected property or buyer reference is invalid.",
    };
  }
  if (code === "23505" || /duplicate|unique/i.test(lower)) {
    return {
      code: "DUPLICATE_VISIT",
      message: "You already have an active site visit request for this property.",
    };
  }
  if (
    /status.*check|site_visits_status_check|invalid input value for enum/i.test(lower)
  ) {
    return {
      code: "CONSTRAINT_FAILED",
      message:
        "Visit status is not allowed by the database. Ask admin to apply site visit status migrations.",
    };
  }
  if (/not null/i.test(lower)) {
    return {
      code: "VALIDATION",
      message: `Missing required database field: ${message}`,
    };
  }
  return {
    code: "SITE_VISIT_FAILED",
    message: message || "Unable to create site visit.",
  };
}

async function probeSiteVisitsTable(
  supabase: SupabaseClient,
): Promise<{ ready: boolean; error?: string }> {
  const { error } = await supabase.from("site_visits").select("id").limit(1);
  if (!error) return { ready: true };
  if (isMissingTableError(error.message)) {
    return { ready: false, error: error.message };
  }
  return { ready: true };
}

async function verifyBuyer(
  supabase: SupabaseClient,
  buyerId: string,
): Promise<
  | {
      ok: true;
      profile: {
        id: string;
        role: string;
        full_name: string | null;
        phone: string | null;
        email: string | null;
      };
    }
  | BookSiteVisitFailure
> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, email")
    .eq("id", buyerId)
    .maybeSingle();

  devLogSiteVisit("Buyer lookup", {
    buyerId,
    found: Boolean(profile),
    role: profile?.role,
    error: error?.message,
  });

  if (error) {
    return {
      ok: false,
      status: 500,
      code: "DATABASE",
      message: "Could not verify your profile.",
      dev: { buyerId, supabaseError: error.message, supabaseCode: error.code },
    };
  }

  if (!profile) {
    return {
      ok: false,
      status: 404,
      code: "BUYER_PROFILE_MISSING",
      message: "Buyer profile missing. Please sign out and sign in again.",
      dev: { buyerId },
    };
  }

  if (profile.role !== "buyer") {
    return {
      ok: false,
      status: 403,
      code: "BUYER_NOT_BUYER_ROLE",
      message: "Please continue as a Buyer to book a site visit.",
      dev: { buyerId, role: profile.role },
    };
  }

  return { ok: true, profile };
}

async function insertSiteVisit(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<{ visitId: string } | BookSiteVisitFailure> {
  console.error("[SiteVisit] insert payload", payload);

  const tryInsert = async (body: Record<string, unknown>) => {
    return supabase.from("site_visits").insert(body).select("id").single();
  };

  const attempts: Record<string, unknown>[] = [payload];

  // Drop optional CRM columns if schema is older
  {
    const {
      lead_id: _l,
      inquiry_id: _i,
      connect_partner_id: _c,
      checklist: _ch,
      purpose: _p,
      ...core
    } = payload;
    attempts.push({
      ...core,
      status: payload.status,
      builder_name: payload.builder_name ?? null,
    });
  }

  // Legacy status for DBs that never got pending_approval migration
  attempts.push({
    user_id: payload.user_id,
    property_id: payload.property_id,
    visit_date: payload.visit_date,
    visit_time: payload.visit_time,
    status: "scheduled",
    builder_name: payload.builder_name ?? null,
  });

  let lastError: { message?: string; code?: string } | null = null;

  for (let i = 0; i < attempts.length; i++) {
    const body = attempts[i];
    const { data: visit, error } = await tryInsert(body);
    if (!error && visit) {
      if (i > 0) {
        console.warn("[SiteVisit] insert succeeded on fallback attempt", i, {
          status: body.status,
        });
      }
      return { visitId: visit.id };
    }
    lastError = error;
    console.error("[SiteVisit] insert attempt failed", {
      attempt: i,
      supabaseError: error?.message,
      supabaseCode: error?.code,
      bodyKeys: Object.keys(body),
    });

    const msg = error?.message ?? "";
    const shouldRetry =
      i < attempts.length - 1 &&
      (isMissingColumnError(msg) ||
        /status|check constraint|pending_approval|checklist|purpose|connect_partner|lead_id|inquiry_id|column/i.test(
          msg,
        ));
    if (!shouldRetry) break;
  }

  const errMsg = lastError?.message ?? "Unknown insert failure";
  const classified = classifyInsertFailure(errMsg, lastError?.code);

  return {
    ok: false,
    status: classified.code === "PERMISSION_DENIED" ? 403 : 500,
    code: classified.code,
    message: classified.message,
    dev: {
      step: "insertSiteVisit",
      supabaseError: errMsg,
      supabaseCode: lastError?.code,
    },
  };
}

async function linkSiteVisitIds(
  supabase: SupabaseClient,
  visitId: string,
  leadId: string,
  inquiryId: string,
): Promise<void> {
  const { error } = await supabase
    .from("site_visits")
    .update({ lead_id: leadId, inquiry_id: inquiryId })
    .eq("id", visitId);

  if (error && !isMissingColumnError(error.message)) {
    devLogSiteVisit("Site visit link update skipped", {
      visitId,
      error: error.message,
    });
  }
}

async function notifyPropertyOwner(
  supabase: SupabaseClient,
  input: {
    propertyId: string;
    leadId: string;
    title: string;
    message: string;
    buyerName?: string | null;
    ownerId: string;
    ownerRole: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  devLogSiteVisit("Owner notification routing", {
    propertyId: input.propertyId,
    ownerId: input.ownerId,
    ownerRole: input.ownerRole,
  });

  try {
    await createNotification(supabase, {
      userId: input.ownerId,
      type: "site_visit_booked",
      title: input.title,
      message: input.message,
      leadId: input.leadId,
      propertyId: input.propertyId,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "notification failed";
    return { ok: false, error: message };
  }
}

async function resolveConnectPartnerProfileId(
  supabase: SupabaseClient,
  connectPartnerId: string | null,
): Promise<string | null> {
  if (!connectPartnerId) return null;
  const { data } = await supabase
    .from("connect_partners")
    .select("id, profile_id")
    .eq("id", connectPartnerId)
    .maybeSingle();
  return (data?.profile_id as string | null | undefined) ?? null;
}

export async function bookSiteVisit(
  supabase: SupabaseClient,
  input: BookSiteVisitInput,
): Promise<BookSiteVisitResult> {
  try {
    return await bookSiteVisitInner(supabase, input);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[SiteVisit] UNCAUGHT bookSiteVisit exception", {
      message,
      stack,
      input,
    });
    return {
      ok: false,
      status: 500,
      code: message.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? "SCHEMA_NOT_READY"
        : "UNKNOWN",
      message: message.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in .env.local and restart."
        : `Booking failed: ${message}`,
      dev: { uncaught: true, message, stack },
    };
  }
}

async function bookSiteVisitInner(
  supabase: SupabaseClient,
  input: BookSiteVisitInput,
): Promise<BookSiteVisitResult> {
  const propertyId = input.propertyId.trim();
  const visitDate = input.visitDate.trim();
  const visitTime = normalizeVisitTime(input.visitTime);
  const purpose = input.purpose?.trim() ?? "";

  console.error("[SiteVisit] bookSiteVisit start", {
    propertyId,
    buyerId: input.buyerId,
    visitDate,
    visitTime,
    purpose,
  });

  const schemaProbe = await probeSiteVisitsTable(supabase);
  if (!schemaProbe.ready) {
    return {
      ok: false,
      status: 503,
      code: "SCHEMA_NOT_READY",
      message:
        "Site visit booking is not configured yet. Database tables are missing — run supabase/scripts/site_visit_booking_schema.sql.",
      dev: { supabaseError: schemaProbe.error },
    };
  }

  const buyerCheck = await verifyBuyer(supabase, input.buyerId);
  if (!buyerCheck.ok) return buyerCheck;

  const lookup = await lookupPropertyForSiteVisit(supabase, propertyId);

  if (!lookup.property) {
    if (lookup.code === "DATABASE") {
      return {
        ok: false,
        status: 500,
        code: "DATABASE",
        message: "Property lookup failed.",
        dev: {
          propertyIdReceived: propertyId,
          supabaseError: lookup.error,
        },
      };
    }
    return {
      ok: false,
      status: 404,
      code: "PROPERTY_UNAVAILABLE",
      message: "Property not found.",
      dev: { propertyIdReceived: propertyId },
    };
  }

  const property = lookup.property;

  const availability = evaluateSiteVisitAvailability(property);
  if (!availability.available) {
    return {
      ok: false,
      status: 403,
      code: "SITE_VISITS_DISABLED",
      message: availability.message,
      dev: {
        propertyId,
        reason: availability.reason,
        status: availability.status,
        siteVisitEnabled: availability.siteVisitEnabled,
      },
    };
  }

  // Connect Partner is optional — seller owns the listing; partner assists when assigned.
  const connectPartnerId = property.connect_partner_id?.trim() || null;

  const { data: existingVisit, error: existingVisitError } = await supabase
    .from("site_visits")
    .select("id")
    .eq("user_id", input.buyerId)
    .eq("property_id", propertyId)
    .in("status", ["pending_approval", "accepted", "scheduled"])
    .limit(1)
    .maybeSingle();

  if (existingVisitError) {
    return {
      ok: false,
      status: 500,
      code: "DATABASE",
      message: "Could not verify existing site visits.",
      dev: {
        propertyId,
        buyerId: input.buyerId,
        supabaseError: existingVisitError.message,
      },
    };
  }

  if (existingVisit) {
    return {
      ok: false,
      status: 409,
      code: "DUPLICATE_VISIT",
      message: "You already have an active site visit request for this property.",
      dev: { propertyId, buyerId: input.buyerId, visitId: existingVisit.id },
    };
  }

  const ownerDebug = await debugPropertyOwnerResolution(supabase, propertyId);

  devLogSiteVisit("Canonical owner field audit", {
    canonicalField: PROPERTY_OWNER_FIELD,
    diagnosis: ownerDebug.diagnosis,
  });

  if (!property.seller_id) {
    return {
      ok: false,
      status: 404,
      code: "PROPERTY_OWNER_NOT_FOUND",
      message: "Property owner not found.",
      dev: { propertyId, diagnosis: ownerDebug.diagnosis },
    };
  }

  const ownerProfile = await resolveListingOwner(supabase, {
    sellerId: property.seller_id,
    embedSeller: property.seller ?? ownerDebug.embedSeller,
    debug: ownerDebug,
  });

  if (!ownerProfile) {
    return {
      ok: false,
      status: 404,
      code: "SELLER_PROFILE_MISSING",
      message: "Seller profile missing.",
      dev: { propertyId, sellerId: property.seller_id },
    };
  }

  // Ownership follows the property: the visit and its lead belong to the
  // Connect partner assigned to this property (if any), independent of any
  // other enquiry the buyer has made.
  const lead = await ensureLead(supabase, input.buyerId, "new", {
    connectPartnerId,
    primaryPropertyId: propertyId,
  });
  let leadId = lead?.id ?? "";
  if (!lead) {
    // Soft-fail CRM lead — still attempt the visit insert (primary success).
    console.error("[SiteVisit] ensureLead failed — continuing without lead_id", {
      buyerId: input.buyerId,
      connectPartnerId,
    });
  }

  const inquiryMessage =
    purpose ||
    `Site visit requested for ${property.title ?? "property"} on ${visitDate}`;

  let inquiryId: string | null = null;
  try {
    inquiryId = await ensureInquiry(supabase, {
      buyerId: input.buyerId,
      propertyId,
      sellerId: property.seller_id,
      message: inquiryMessage,
    });
  } catch (err) {
    console.error("[SiteVisit] ensureInquiry threw", err);
  }
  if (!inquiryId) {
    console.error("[SiteVisit] ensureInquiry failed — continuing without inquiry_id", {
      buyerId: input.buyerId,
      propertyId,
    });
  }

  const resolvedBuilderName =
    input.builderName?.trim() ||
    property.builder_name ||
    property.contact_name ||
    ownerProfile.full_name ||
    null;

  const checklist = buildChecklistForProperty({
    type: property.type ?? property.sub_type,
    rera_number: property.rera_number,
    parking: property.parking,
  });

  const visitInsert = await insertSiteVisit(supabase, {
    user_id: input.buyerId,
    property_id: propertyId,
    visit_date: visitDate,
    visit_time: visitTime,
    status: "pending_approval",
    purpose: purpose || null,
    builder_name: resolvedBuilderName,
    checklist,
    ...(leadId ? { lead_id: leadId } : {}),
    ...(inquiryId ? { inquiry_id: inquiryId } : {}),
    ...(connectPartnerId ? { connect_partner_id: connectPartnerId } : {}),
  });

  if (!("visitId" in visitInsert)) return visitInsert;

  if (leadId && inquiryId) {
    await linkSiteVisitIds(supabase, visitInsert.visitId, leadId, inquiryId);
  }

  const dateLabel = new Date(`${visitDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const activityDescription = `${property.title} — ${dateLabel} at ${visitTime.slice(0, 5)}${purpose ? ` · ${purpose}` : ""}`;

  // CRM activity + notifications are secondary — never roll back a created visit.
  try {
    const activityResult = await recordLeadActivity(supabase, {
      buyerId: input.buyerId,
      activityType: "visit_requested",
      title: "Site visit requested",
      description: activityDescription,
      propertyId,
      inquiryId: inquiryId ?? undefined,
      siteVisitId: visitInsert.visitId,
      metadata: { purpose, checklist, source: "site_visit" },
      skipNotifications: true,
    });

    if (!activityResult) {
      // Retry with legacy activity type if visit_requested is not in CHECK constraint
      const legacy = await recordLeadActivity(supabase, {
        buyerId: input.buyerId,
        activityType: "site_visit_booked",
        title: "Site visit requested",
        description: activityDescription,
        propertyId,
        inquiryId: inquiryId ?? undefined,
        siteVisitId: visitInsert.visitId,
        metadata: { purpose, checklist, source: "site_visit" },
        skipNotifications: true,
      });
      if (!legacy) {
        console.error("[SiteVisit] CRM activity failed after visit insert", {
          visitId: visitInsert.visitId,
          leadId,
        });
      } else if (!leadId) {
        leadId = legacy.leadId;
      }
    } else if (!leadId) {
      leadId = activityResult.leadId;
    }

    await recordLeadActivity(supabase, {
      buyerId: input.buyerId,
      activityType: "visit_checklist_generated",
      title: "Visit checklist ready",
      description: `${checklist.length} items to verify during your visit`,
      propertyId,
      siteVisitId: visitInsert.visitId,
      skipStatusAdvance: true,
      skipNotifications: true,
    });
  } catch (err) {
    console.error("[SiteVisit] CRM activity threw after visit insert", {
      visitId: visitInsert.visitId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  const buyerLabel = buyerCheck.profile.full_name ?? buyerCheck.profile.email ?? "A buyer";
  const propertyTitle = property.title ?? "a property";

  try {
    if (leadId) {
      const sellerNotification = await notifyPropertyOwner(supabase, {
        propertyId,
        leadId,
        title: "Site visit requested",
        message: `${buyerLabel} requested a visit — ${activityDescription}`,
        buyerName: buyerCheck.profile.full_name,
        ownerId: ownerProfile.id,
        ownerRole: ownerProfile.role,
      });
      console.error("[SiteVisit] Seller notification result", sellerNotification);

      await notifyAdminsOfLead(supabase, {
        title: "New site visit lead",
        message: `${buyerLabel} booked a site visit for ${propertyTitle}.`,
        leadId,
        propertyId,
      });
    }

    const partnerProfileId = await resolveConnectPartnerProfileId(
      supabase,
      connectPartnerId,
    );
    if (partnerProfileId) {
      await createNotification(supabase, {
        userId: partnerProfileId,
        type: "site_visit_booked",
        title: "Site visit requested",
        message: `${buyerLabel} requested a visit for ${propertyTitle} — ${activityDescription}`,
        leadId: leadId || undefined,
        propertyId,
      });
    }

    await createNotification(supabase, {
      userId: input.buyerId,
      type: "site_visit_booked",
      title: "Site visit request submitted",
      message: `Your visit request for ${propertyTitle} on ${dateLabel} at ${visitTime.slice(0, 5)} is pending confirmation.`,
      leadId: leadId || undefined,
      propertyId,
    });
  } catch (err) {
    console.error("[SiteVisit] Notification phase threw (visit already saved)", {
      visitId: visitInsert.visitId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  console.error("[SiteVisit] bookSiteVisit SUCCESS", {
    visitId: visitInsert.visitId,
    leadId: leadId || null,
    inquiryId,
    propertyId,
    connectPartnerId,
  });

  return {
    ok: true,
    visitId: visitInsert.visitId,
    checklist,
    leadId,
    inquiryId: inquiryId ?? "",
  };
}
