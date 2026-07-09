import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification, recordLeadActivity } from "./service";
import { getPropertyOwner } from "./routing";
import type { VisitStatus } from "./types";
import { buildPropertyChecklist } from "./visitWorkflow";

export async function acceptSiteVisit(
  supabase: SupabaseClient,
  visitId: string,
  actorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: visit, error } = await supabase
    .from("site_visits")
    .select(
      "*, property:properties(id, title, location, city, sector, contact_phone, contact_name, seller_id, type, rera_number, parking, seller:profiles!properties_seller_id_fkey(full_name, phone, email))",
    )
    .eq("id", visitId)
    .maybeSingle();

  if (error || !visit) return { ok: false, error: "Visit not found" };

  const property = visit.property as {
    title?: string;
    location?: string;
    city?: string;
    sector?: string;
    contact_phone?: string | null;
    seller?: { full_name?: string | null; phone?: string | null; email?: string | null };
  } | null;

  const visitLocation = [
    property?.title,
    property?.location,
    property?.city,
    property?.sector,
  ]
    .filter(Boolean)
    .join(", ");

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("site_visits")
    .update({
      status: "scheduled",
      accepted_at: now,
      accepted_by: actorId,
      visit_location: visitLocation || null,
      updated_at: now,
    })
    .eq("id", visitId);

  if (updateError) return { ok: false, error: updateError.message };

  await recordLeadActivity(supabase, {
    buyerId: visit.user_id,
    activityType: "site_visit_accepted",
    title: "Site visit accepted",
    description: `${property?.title ?? "Property"} — meeting confirmed`,
    propertyId: visit.property_id,
    siteVisitId: visitId,
    metadata: { visit_location: visitLocation },
  });

  await createNotification(supabase, {
    userId: visit.user_id,
    type: "site_visit_accepted",
    title: "Visit request accepted",
    message: `Your site visit for ${property?.title ?? "the property"} has been approved. Contact details are now available.`,
    propertyId: visit.property_id,
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
    .select("user_id, property_id, property:properties(title)")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return { ok: false, error: "Visit not found" };

  const { error: updateError } = await supabase
    .from("site_visits")
    .update({
      status: "rejected",
      accepted_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (updateError) return { ok: false, error: updateError.message };

  const property = visit.property as { title?: string } | null;

  await recordLeadActivity(supabase, {
    buyerId: visit.user_id,
    activityType: "site_visit_rejected",
    title: "Site visit rejected",
    description: reason ?? `Request declined for ${property?.title ?? "property"}`,
    propertyId: visit.property_id,
    siteVisitId: visitId,
  });

  await createNotification(supabase, {
    userId: visit.user_id,
    type: "site_visit_rejected",
    title: "Visit request declined",
    message: reason ?? `Your site visit request could not be confirmed at this time.`,
    propertyId: visit.property_id,
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
    .select("user_id, property_id, status, property:properties(title)")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return { ok: false, error: "Visit not found" };

  const nextStatus: VisitStatus =
    visit.status === "pending_approval" ? "pending_approval" : "scheduled";

  const { error: updateError } = await supabase
    .from("site_visits")
    .update({
      visit_date: visitDate,
      visit_time: visitTime,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (updateError) return { ok: false, error: updateError.message };

  const property = visit.property as { title?: string } | null;

  await recordLeadActivity(supabase, {
    buyerId: visit.user_id,
    activityType: "site_visit_rescheduled",
    title: "Site visit rescheduled",
    description: `${property?.title ?? "Property"} — ${visitDate} at ${visitTime.slice(0, 5)}`,
    propertyId: visit.property_id,
    siteVisitId: visitId,
    metadata: { rescheduled_by: actorId },
  });

  await createNotification(supabase, {
    userId: visit.user_id,
    type: "general",
    title: "Visit rescheduled",
    message: `Your site visit has been rescheduled to ${visitDate}.`,
    propertyId: visit.property_id,
  });

  return { ok: true };
}

export async function completeSiteVisit(
  supabase: SupabaseClient,
  visitId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: visit } = await supabase
    .from("site_visits")
    .select("user_id, property_id, property:properties(title)")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return { ok: false, error: "Visit not found" };

  const { error: updateError } = await supabase
    .from("site_visits")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (updateError) return { ok: false, error: updateError.message };

  await recordLeadActivity(supabase, {
    buyerId: visit.user_id,
    activityType: "site_visit_completed",
    title: "Site visit completed",
    description: (visit.property as { title?: string } | null)?.title ?? undefined,
    propertyId: visit.property_id,
    siteVisitId: visitId,
  });

  await createNotification(supabase, {
    userId: visit.user_id,
    type: "site_visit_completed",
    title: "Site visit marked complete",
    message: `Your visit to ${(visit.property as { title?: string } | null)?.title ?? "the property"} is complete. Share your feedback to help AI refine recommendations.`,
    propertyId: visit.property_id,
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
    hasRera: Boolean(row.rera_number),
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
    .select("user_id, property_id, connect_partner_id, property:properties(seller_id)")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) return false;

  const sellerId = (visit.property as { seller_id?: string } | null)?.seller_id;
  if (role === "seller" && sellerId === userId) return true;

  if (role === "builder") {
    if (sellerId === userId) return true;
    // Property-based ownership: a Connect partner manages a visit only when
    // the visit is stamped with THEIR partner id (i.e. it is on a property
    // assigned to them) — never via buyer-level assignment.
    const visitPartnerId = (visit.connect_partner_id as string | null) ?? null;
    if (!visitPartnerId) return false;
    const { data: partner } = await supabase
      .from("connect_partners")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    return (partner?.id as string | undefined) === visitPartnerId;
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
