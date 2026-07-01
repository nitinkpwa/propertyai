import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureInquiry,
  ensureLead,
  notifyAdminsOfLead,
  recordLeadActivity,
} from "./service";
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
  return message.includes("lead_id") || message.includes("inquiry_id");
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
      message: "Only buyer accounts can book site visits.",
      dev: { buyerId, role: profile.role },
    };
  }

  return { ok: true, profile };
}

async function insertSiteVisit(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<{ visitId: string } | BookSiteVisitFailure> {
  devLogSiteVisit("Site visit insert payload", payload);

  const tryInsert = async (body: Record<string, unknown>) => {
    return supabase.from("site_visits").insert(body).select("id").single();
  };

  let { data: visit, error } = await tryInsert(payload);

  if (error && isMissingColumnError(error.message)) {
    const { lead_id: _l, inquiry_id: _i, ...withoutLinks } = payload;
    ({ data: visit, error } = await tryInsert(withoutLinks));
  }

  if (!error && visit) {
    return { visitId: visit.id };
  }

  const errMsg = error?.message ?? "";

  if (
    errMsg.includes("checklist") ||
    errMsg.includes("pending_approval") ||
    errMsg.includes("purpose")
  ) {
    const legacyPayload: Record<string, unknown> = {
      user_id: payload.user_id,
      property_id: payload.property_id,
      visit_date: payload.visit_date,
      visit_time: payload.visit_time,
      status: "scheduled",
      builder_name: payload.builder_name ?? null,
    };
    if (payload.lead_id) legacyPayload.lead_id = payload.lead_id;
    if (payload.inquiry_id) legacyPayload.inquiry_id = payload.inquiry_id;

    devLogSiteVisit("Retrying legacy site visit insert", legacyPayload);

    const { data: legacyVisit, error: legacyError } = await tryInsert(legacyPayload);

    if (!legacyError && legacyVisit) {
      return { visitId: legacyVisit.id };
    }

    return {
      ok: false,
      status: 500,
      code: "SITE_VISIT_FAILED",
      message: "Unable to create site visit.",
      dev: {
        step: "insertSiteVisit.legacy",
        supabaseError: legacyError?.message ?? errMsg,
        supabaseCode: legacyError?.code ?? error?.code,
      },
    };
  }

  return {
    ok: false,
    status: 500,
    code: "SITE_VISIT_FAILED",
    message: "Unable to create site visit.",
    dev: {
      step: "insertSiteVisit",
      supabaseError: errMsg,
      supabaseCode: error?.code,
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

  const { error } = await supabase.from("crm_notifications").insert({
    user_id: input.ownerId,
    type: "site_visit_booked",
    title: input.title,
    message: input.message,
    lead_id: input.leadId,
    property_id: input.propertyId,
  });

  devLogSiteVisit("Seller notification insert", {
    userId: input.ownerId,
    success: !error,
    error: error?.message,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function bookSiteVisit(
  supabase: SupabaseClient,
  input: BookSiteVisitInput,
): Promise<BookSiteVisitResult> {
  const propertyId = input.propertyId.trim();
  const visitDate = input.visitDate.trim();
  const visitTime = normalizeVisitTime(input.visitTime);
  const purpose = input.purpose?.trim() ?? "";

  devLogSiteVisit("bookSiteVisit start", {
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

  const lead = await ensureLead(supabase, input.buyerId);
  if (!lead) {
    return {
      ok: false,
      status: 500,
      code: "CRM_LEAD_FAILED",
      message: "Unable to create CRM lead.",
      dev: { step: "ensureLead", buyerId: input.buyerId },
    };
  }

  const inquiryMessage =
    purpose ||
    `Site visit requested for ${property.title ?? "property"} on ${visitDate}`;

  const inquiryId = await ensureInquiry(supabase, {
    buyerId: input.buyerId,
    propertyId,
    sellerId: property.seller_id,
    message: inquiryMessage,
  });

  if (!inquiryId) {
    return {
      ok: false,
      status: 500,
      code: "CRM_ACTIVITY_FAILED",
      message: "Unable to create inquiry for this visit.",
      dev: { step: "ensureInquiry", buyerId: input.buyerId, propertyId },
    };
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
    lead_id: lead.id,
    inquiry_id: inquiryId,
  });

  if (!("visitId" in visitInsert)) return visitInsert;

  await linkSiteVisitIds(supabase, visitInsert.visitId, lead.id, inquiryId);

  const dateLabel = new Date(`${visitDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const activityDescription = `${property.title} — ${dateLabel} at ${visitTime.slice(0, 5)}${purpose ? ` · ${purpose}` : ""}`;

  const activityResult = await recordLeadActivity(supabase, {
    buyerId: input.buyerId,
    activityType: "visit_requested",
    title: "Site visit requested",
    description: activityDescription,
    propertyId,
    inquiryId,
    siteVisitId: visitInsert.visitId,
    metadata: { purpose, checklist, source: "site_visit" },
    skipNotifications: true,
  });

  if (!activityResult) {
    await supabase.from("site_visits").delete().eq("id", visitInsert.visitId);
    return {
      ok: false,
      status: 500,
      code: "CRM_ACTIVITY_FAILED",
      message: "Unable to create CRM activity.",
      dev: { step: "recordLeadActivity", leadId: lead.id },
    };
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

  const buyerLabel = buyerCheck.profile.full_name ?? buyerCheck.profile.email ?? "A buyer";

  const sellerNotification = await notifyPropertyOwner(supabase, {
    propertyId,
    leadId: lead.id,
    title: "Site visit requested",
    message: `${buyerLabel} requested a visit — ${activityDescription}`,
    buyerName: buyerCheck.profile.full_name,
    ownerId: ownerProfile.id,
    ownerRole: ownerProfile.role,
  });

  devLogSiteVisit("Seller notification result", sellerNotification);

  await notifyAdminsOfLead(supabase, {
    title: "New site visit lead",
    message: `${buyerLabel} booked a site visit for ${property.title ?? "a property"}.`,
    leadId: lead.id,
    propertyId,
  });

  devLogSiteVisit("bookSiteVisit success", {
    visitId: visitInsert.visitId,
    leadId: lead.id,
    inquiryId,
    propertyId,
  });

  return {
    ok: true,
    visitId: visitInsert.visitId,
    checklist,
    leadId: lead.id,
    inquiryId,
  };
}
