import type { SupabaseClient } from "@supabase/supabase-js";
import { isReraApproved } from "@/lib/properties/reraStatus";
import {
  advanceLeadStatus,
  createNotification,
  ensureLead,
  recordLeadActivity,
} from "./service";
import { getAdminUserIds, getPropertyOwner } from "./routing";
import type { NotificationType, VisitStatus } from "./types";
import { buildPropertyChecklist } from "./visitWorkflow";

async function resolvePartnerProfileId(
  supabase: SupabaseClient,
  connectPartnerId: string | null | undefined,
): Promise<string | null> {
  if (!connectPartnerId) return null;
  const { data } = await supabase
    .from("connect_partners")
    .select("profile_id")
    .eq("id", connectPartnerId)
    .maybeSingle();
  return (data?.profile_id as string | null | undefined) ?? null;
}

async function notifyVisitStakeholders(
  supabase: SupabaseClient,
  input: {
    buyerId: string;
    propertyId: string;
    sellerId?: string | null;
    connectPartnerId?: string | null;
    leadId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    notifyBuyer?: boolean;
    notifySeller?: boolean;
    notifyPartner?: boolean;
    notifyAdmins?: boolean;
  },
): Promise<void> {
  const {
    notifyBuyer = true,
    notifySeller = true,
    notifyPartner = true,
    notifyAdmins = true,
  } = input;

  if (notifyBuyer) {
    await createNotification(supabase, {
      userId: input.buyerId,
      type: input.type,
      title: input.title,
      message: input.message,
      leadId: input.leadId ?? undefined,
      propertyId: input.propertyId,
    });
  }

  if (notifySeller && input.sellerId) {
    await createNotification(supabase, {
      userId: input.sellerId,
      type: input.type,
      title: input.title,
      message: input.message,
      leadId: input.leadId ?? undefined,
      propertyId: input.propertyId,
    });
  }

  if (notifyPartner) {
    const partnerProfileId = await resolvePartnerProfileId(
      supabase,
      input.connectPartnerId,
    );
    if (partnerProfileId && partnerProfileId !== input.sellerId) {
      await createNotification(supabase, {
        userId: partnerProfileId,
        type: input.type,
        title: input.title,
        message: input.message,
        leadId: input.leadId ?? undefined,
        propertyId: input.propertyId,
      });
    }
  }

  if (notifyAdmins) {
    const adminIds = await getAdminUserIds(supabase);
    for (const adminId of adminIds) {
      if (
        adminId === input.buyerId ||
        adminId === input.sellerId
      ) {
        continue;
      }
      await createNotification(supabase, {
        userId: adminId,
        type: input.type,
        title: input.title,
        message: input.message,
        leadId: input.leadId ?? undefined,
        propertyId: input.propertyId,
      });
    }
  }
}

type VisitProperty = {
  id?: string;
  title?: string;
  location?: string;
  city?: string;
  sector?: string;
  seller_id?: string | null;
  connect_partner_id?: string | null;
  assigned_connect_id?: string | null;
  contact_phone?: string | null;
  contact_name?: string | null;
  type?: string | null;
  rera_number?: string | null;
  parking?: string | null;
  seller?: { full_name?: string | null; phone?: string | null; email?: string | null };
};

const VISIT_PROPERTY_SELECT =
  "*, property:properties(id, title, location, city, sector, contact_phone, contact_name, seller_id, connect_partner_id, assigned_connect_id, type, rera_number, parking, builder_name, seller:profiles!properties_seller_id_fkey(full_name, phone, email))";

export async function acceptSiteVisit(
  supabase: SupabaseClient,
  visitId: string,
  actorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: visit, error } = await supabase
    .from("site_visits")
    .select(VISIT_PROPERTY_SELECT)
    .eq("id", visitId)
    .maybeSingle();

  if (error || !visit) return { ok: false, error: "Visit not found" };

  const property = visit.property as VisitProperty | null;

  const visitLocation = [
    property?.title,
    property?.location,
    property?.city,
    property?.sector,
  ]
    .filter(Boolean)
    .join(", ");

  const now = new Date().toISOString();
  const connectPartnerId =
    (visit.connect_partner_id as string | null) ??
    property?.connect_partner_id ??
    null;

  const { error: updateError } = await supabase
    .from("site_visits")
    .update({
      status: "accepted",
      accepted_at: now,
      accepted_by: actorId,
      visit_location: visitLocation || null,
      connect_partner_id: connectPartnerId,
      updated_at: now,
    })
    .eq("id", visitId);

  if (updateError) return { ok: false, error: updateError.message };

  const activity = await recordLeadActivity(supabase, {
    buyerId: visit.user_id,
    activityType: "site_visit_accepted",
    title: "Site visit approved",
    description: `${property?.title ?? "Property"} — meeting confirmed`,
    propertyId: visit.property_id,
    siteVisitId: visitId,
    metadata: { visit_location: visitLocation, approved_by: actorId },
    skipNotifications: true,
  });

  await notifyVisitStakeholders(supabase, {
    buyerId: visit.user_id,
    propertyId: visit.property_id,
    sellerId: property?.seller_id,
    connectPartnerId,
    leadId: activity?.leadId ?? (visit.lead_id as string | null),
    type: "site_visit_accepted",
    title: "Site visit approved",
    message: `Site visit for ${property?.title ?? "the property"} has been approved.`,
  });

  return { ok: true };
}

export async function rejectSiteVisit(
  supabase: SupabaseClient,
  visitId: string,
  actorId: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: visit } = await supabase
    .from("site_visits")
    .select(VISIT_PROPERTY_SELECT)
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return { ok: false, error: "Visit not found" };

  const property = visit.property as VisitProperty | null;
  const now = new Date().toISOString();
  const connectPartnerId =
    (visit.connect_partner_id as string | null) ??
    property?.connect_partner_id ??
    null;

  const updatePayload: Record<string, unknown> = {
    status: "rejected",
    accepted_by: actorId,
    rejected_by: actorId,
    rejected_at: now,
    updated_at: now,
  };

  let { error: updateError } = await supabase
    .from("site_visits")
    .update(updatePayload)
    .eq("id", visitId);

  // Resilient if audit columns are not migrated yet.
  if (
    updateError &&
    (updateError.message.includes("rejected_by") ||
      updateError.message.includes("rejected_at") ||
      updateError.code === "42703")
  ) {
    ({ error: updateError } = await supabase
      .from("site_visits")
      .update({
        status: "rejected",
        accepted_by: actorId,
        updated_at: now,
      })
      .eq("id", visitId));
  }

  if (updateError) return { ok: false, error: updateError.message };

  const activity = await recordLeadActivity(supabase, {
    buyerId: visit.user_id,
    activityType: "site_visit_rejected",
    title: "Site visit rejected",
    description: reason ?? `Request declined for ${property?.title ?? "property"}`,
    propertyId: visit.property_id,
    siteVisitId: visitId,
    metadata: { rejected_by: actorId, reason: reason ?? null },
    skipNotifications: true,
  });

  await notifyVisitStakeholders(supabase, {
    buyerId: visit.user_id,
    propertyId: visit.property_id,
    sellerId: property?.seller_id,
    connectPartnerId,
    leadId: activity?.leadId ?? (visit.lead_id as string | null),
    type: "site_visit_rejected",
    title: "Site visit rejected",
    message:
      reason ??
      `Your site visit request for ${property?.title ?? "the property"} was declined.`,
  });

  return { ok: true };
}

export async function rescheduleSiteVisit(
  supabase: SupabaseClient,
  visitId: string,
  visitDate: string,
  visitTime: string,
  actorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: visit } = await supabase
    .from("site_visits")
    .select(VISIT_PROPERTY_SELECT)
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return { ok: false, error: "Visit not found" };

  const property = visit.property as VisitProperty | null;
  const connectPartnerId =
    (visit.connect_partner_id as string | null) ??
    property?.connect_partner_id ??
    null;

  const fromLabel = `${visit.visit_date} ${String(visit.visit_time).slice(0, 5)}`;
  const toLabel = `${visitDate} ${visitTime.slice(0, 5)}`;
  const now = new Date().toISOString();
  const nextStatus: VisitStatus = "rescheduled";

  let { error: updateError } = await supabase
    .from("site_visits")
    .update({
      visit_date: visitDate,
      visit_time: visitTime,
      status: nextStatus,
      rescheduled_from: fromLabel,
      rescheduled_to: toLabel,
      updated_at: now,
    })
    .eq("id", visitId);

  if (
    updateError &&
    (updateError.message.includes("rescheduled") || updateError.code === "42703")
  ) {
    ({ error: updateError } = await supabase
      .from("site_visits")
      .update({
        visit_date: visitDate,
        visit_time: visitTime,
        status: "accepted",
        updated_at: now,
      })
      .eq("id", visitId));
  }

  if (updateError) return { ok: false, error: updateError.message };

  const activity = await recordLeadActivity(supabase, {
    buyerId: visit.user_id,
    activityType: "site_visit_rescheduled",
    title: "Site visit rescheduled",
    description: `${property?.title ?? "Property"} — ${toLabel}`,
    propertyId: visit.property_id,
    siteVisitId: visitId,
    metadata: {
      rescheduled_by: actorId,
      rescheduled_from: fromLabel,
      rescheduled_to: toLabel,
    },
    skipNotifications: true,
  });

  await notifyVisitStakeholders(supabase, {
    buyerId: visit.user_id,
    propertyId: visit.property_id,
    sellerId: property?.seller_id,
    connectPartnerId,
    leadId: activity?.leadId ?? (visit.lead_id as string | null),
    type: "general",
    title: "Site visit rescheduled",
    message: `Site visit for ${property?.title ?? "the property"} was rescheduled to ${toLabel}.`,
  });

  return { ok: true };
}

export async function completeSiteVisit(
  supabase: SupabaseClient,
  visitId: string,
  actorId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: visit } = await supabase
    .from("site_visits")
    .select(VISIT_PROPERTY_SELECT)
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return { ok: false, error: "Visit not found" };

  const property = visit.property as VisitProperty | null;
  const connectPartnerId =
    (visit.connect_partner_id as string | null) ??
    property?.connect_partner_id ??
    null;
  const now = new Date().toISOString();

  let { error: updateError } = await supabase
    .from("site_visits")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", visitId);

  if (
    updateError &&
    (updateError.message.includes("completed_at") || updateError.code === "42703")
  ) {
    ({ error: updateError } = await supabase
      .from("site_visits")
      .update({ status: "completed", updated_at: now })
      .eq("id", visitId));
  }

  if (updateError) return { ok: false, error: updateError.message };

  // Ensure a CRM lead exists and advance after a completed visit.
  const lead = await ensureLead(supabase, visit.user_id, "visited", {
    connectPartnerId: connectPartnerId ?? undefined,
    primaryPropertyId: visit.property_id,
  });
  if (lead) {
    await advanceLeadStatus(supabase, lead.id, "visited", visit.property_id);
  }

  const activity = await recordLeadActivity(supabase, {
    buyerId: visit.user_id,
    activityType: "site_visit_completed",
    title: "Site visit completed",
    description: property?.title ?? undefined,
    propertyId: visit.property_id,
    siteVisitId: visitId,
    metadata: { completed_by: actorId ?? null },
    skipNotifications: true,
  });

  await notifyVisitStakeholders(supabase, {
    buyerId: visit.user_id,
    propertyId: visit.property_id,
    sellerId: property?.seller_id,
    connectPartnerId,
    leadId: activity?.leadId ?? lead?.id ?? (visit.lead_id as string | null),
    type: "site_visit_completed",
    title: "Site visit completed",
    message: `Visit to ${property?.title ?? "the property"} is marked completed.`,
  });

  return { ok: true };
}

export function buildChecklistForProperty(row: {
  type?: string | null;
  rera_number?: string | null;
  parking?: string | null;
}): string[] {
  return buildPropertyChecklist({
    propertyType: row.type,
    hasRera: isReraApproved(row),
    hasParking: Boolean(row.parking),
  });
}

export async function canManageVisit(
  supabase: SupabaseClient,
  visitId: string,
  userId: string,
  role: string | null,
): Promise<boolean> {
  if (role === "admin") return true;

  const { data: visit } = await supabase
    .from("site_visits")
    .select(
      "user_id, property_id, connect_partner_id, property:properties(seller_id, connect_partner_id, assigned_connect_id)",
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return false;

  const property = visit.property as {
    seller_id?: string;
    connect_partner_id?: string | null;
    assigned_connect_id?: string | null;
  } | null;

  const sellerId = property?.seller_id;
  if (role === "seller" && sellerId === userId) return true;

  if (role === "builder") {
    if (sellerId === userId) return true;

    // Property-based ownership: partner manages visits on assigned properties.
    if (property?.assigned_connect_id === userId) return true;

    const { data: partner } = await supabase
      .from("connect_partners")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    const partnerId = partner?.id as string | undefined;
    if (!partnerId) return false;

    if (property?.connect_partner_id === partnerId) return true;
    if ((visit.connect_partner_id as string | null) === partnerId) return true;
  }

  return false;
}

export async function resolveOwnerContact(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<{ phone: string | null; email: string | null; whatsapp: string | null; name: string | null }> {
  const owner = await getPropertyOwner(supabase, propertyId);
  if (!owner) {
    return { phone: null, email: null, whatsapp: null, name: null };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("contact_phone, contact_name, seller:profiles!properties_seller_id_fkey(full_name, phone, email)")
    .eq("id", propertyId)
    .maybeSingle();

  const seller = property?.seller as {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;

  const phone = property?.contact_phone ?? seller?.phone ?? null;
  const whatsapp = phone ? phone.replace(/\D/g, "") : null;

  return {
    phone,
    email: seller?.email ?? null,
    whatsapp,
    name: property?.contact_name ?? seller?.full_name ?? owner.ownerName,
  };
}
