import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMobileNumber, mobileToAuthEmail } from "@/lib/auth/mobile";
import { normalizeUsername } from "@/lib/auth/username";
import type {
  ConnectPartnerActivityType,
  CreateConnectPartnerInput,
} from "@/lib/connect/partners/types";

export async function logConnectPartnerActivity(
  supabase: SupabaseClient,
  input: {
    type: ConnectPartnerActivityType;
    partnerId: string;
    actorId?: string | null;
    buyerId?: string | null;
    propertyId?: string | null;
    description: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("connect_partner_activities").insert({
    type: input.type,
    partner_id: input.partnerId,
    actor_id: input.actorId ?? null,
    buyer_id: input.buyerId ?? null,
    property_id: input.propertyId ?? null,
    description: input.description,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("logConnectPartnerActivity:", error.message);
  }
}

export async function createConnectPartnerAccount(
  supabase: SupabaseClient,
  input: CreateConnectPartnerInput,
  createdByUserId: string,
): Promise<{ partnerId: string; profileId: string }> {
  const normalizedPhone = normalizeMobileNumber(input.phone);
  const authEmail = mobileToAuthEmail(normalizedPhone);
  const username = normalizeUsername(
    `partner_${input.companyName.replace(/\W+/g, "_").slice(0, 20)}_${normalizedPhone.slice(-4)}`,
  );

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: authEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.managerName.trim(),
      username,
      role: "builder",
      phone: normalizedPhone,
    },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Failed to create auth user");
  }

  const profileId = authData.user.id;

  const { data: partner, error: partnerError } = await supabase
    .from("connect_partners")
    .insert({
      profile_id: profileId,
      company_name: input.companyName.trim(),
      manager_name: input.managerName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: normalizedPhone,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      gst: input.gst?.trim() || null,
      rera: input.rera?.trim() || null,
      logo: input.logo?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status ?? "pending",
      created_by: createdByUserId,
    })
    .select("id")
    .single();

  if (partnerError || !partner) {
    await supabase.auth.admin.deleteUser(profileId);
    throw new Error(partnerError?.message ?? "Failed to create partner record");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: profileId,
      email: input.email.trim().toLowerCase(),
      full_name: input.managerName.trim(),
      phone: normalizedPhone,
      role: "builder",
      connect_partner_id: partner.id,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await supabase.from("connect_partners").delete().eq("id", partner.id);
    await supabase.auth.admin.deleteUser(profileId);
    throw new Error(profileError.message);
  }

  await logConnectPartnerActivity(supabase, {
    type: "partner_created",
    partnerId: partner.id,
    actorId: createdByUserId,
    description: `Connect partner "${input.companyName.trim()}" created`,
    metadata: { manager_name: input.managerName.trim(), email: input.email.trim() },
  });

  return { partnerId: partner.id, profileId };
}

/**
 * Manual admin routing of a buyer to a Connect partner.
 *
 * Ownership model is Property → Connect Partner → Lead, so this NEVER writes
 * to the buyer profile and never disturbs the buyer's leads with other
 * partners. Assigning creates (or flags) a manual partner-scoped CRM lead;
 * unassigning removes only manual routings — leads backed by real property
 * transactions belong to the property's partner and must be changed by
 * reassigning the property.
 */
export async function assignBuyerToPartner(
  supabase: SupabaseClient,
  buyerId: string,
  partnerId: string | null,
  actorId: string,
): Promise<boolean> {
  const { data: buyer } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", buyerId)
    .maybeSingle();

  if (!buyer || buyer.role !== "buyer") return false;

  if (partnerId) {
    const { data: partner } = await supabase
      .from("connect_partners")
      .select("id, profile_id")
      .eq("id", partnerId)
      .maybeSingle();

    if (!partner) return false;

    const { data: existingLead } = await supabase
      .from("crm_leads")
      .select("id")
      .eq("buyer_id", buyerId)
      .eq("connect_partner_id", partnerId)
      .maybeSingle();

    let leadId = (existingLead?.id as string) ?? null;

    if (leadId) {
      await supabase
        .from("crm_leads")
        .update({
          assigned_connect_id: partner.profile_id ?? null,
          connect_assignment_source: "manual",
        })
        .eq("id", leadId);
    } else {
      const { data: created, error } = await supabase
        .from("crm_leads")
        .insert({
          buyer_id: buyerId,
          status: "new",
          connect_partner_id: partnerId,
          assigned_connect_id: partner.profile_id ?? null,
          connect_assignment_source: "manual",
        })
        .select("id")
        .single();

      if (error || !created) {
        console.error("assignBuyerToPartner lead insert:", error?.message);
        return false;
      }
      leadId = created.id as string;
    }

    // Direct insert to avoid a circular import with lib/crm/service.
    await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      activity_type: "lead_assigned",
      title: "Connect partner assigned",
      description: "Buyer routed to partner by admin",
      metadata: { partner_id: partnerId, assigned_by: actorId, source: "manual" },
    });

    await logConnectPartnerActivity(supabase, {
      type: "buyer_assigned",
      partnerId,
      actorId,
      buyerId,
      description: `Buyer ${buyer.full_name ?? buyerId} routed to partner by admin`,
    });

    return true;
  }

  // Unassign: remove manual routings only.
  const { data: manualLeads } = await supabase
    .from("crm_leads")
    .select("id, connect_partner_id")
    .eq("buyer_id", buyerId)
    .eq("connect_assignment_source", "manual")
    .not("connect_partner_id", "is", null);

  for (const lead of manualLeads ?? []) {
    const leadPartnerId = lead.connect_partner_id as string;

    const [inquiriesRes, visitsRes] = await Promise.all([
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("from_user_id", buyerId)
        .eq("connect_partner_id", leadPartnerId),
      supabase
        .from("site_visits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", buyerId)
        .eq("connect_partner_id", leadPartnerId),
    ]);

    const hasTransactions =
      (inquiriesRes.count ?? 0) > 0 || (visitsRes.count ?? 0) > 0;

    if (hasTransactions) {
      // The buyer genuinely engaged with this partner's properties: ownership
      // follows the property, so the lead stays — only the manual flag drops.
      await supabase
        .from("crm_leads")
        .update({ connect_assignment_source: "auto" })
        .eq("id", lead.id);
      continue;
    }

    await supabase.from("crm_leads").delete().eq("id", lead.id);

    await logConnectPartnerActivity(supabase, {
      type: "buyer_removed",
      partnerId: leadPartnerId,
      actorId,
      buyerId,
      description: `Buyer ${buyer.full_name ?? buyerId} removed from partner by admin`,
    });
  }

  return true;
}

export async function assignPropertyToPartner(
  supabase: SupabaseClient,
  propertyId: string,
  partnerId: string | null,
  actorId: string,
): Promise<boolean> {
  const { data: property } = await supabase
    .from("properties")
    .select("id, title, connect_partner_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (!property) return false;

  let profileId: string | null = null;
  if (partnerId) {
    const { data: partner } = await supabase
      .from("connect_partners")
      .select("profile_id")
      .eq("id", partnerId)
      .maybeSingle();
    profileId = (partner?.profile_id as string) ?? null;
  }

  const { error } = await supabase
    .from("properties")
    .update({
      connect_partner_id: partnerId,
      assigned_connect_id: profileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", propertyId);

  if (error) {
    console.error("assignPropertyToPartner:", error.message);
    return false;
  }

  if (partnerId) {
    await logConnectPartnerActivity(supabase, {
      type: "property_assigned",
      partnerId,
      actorId,
      propertyId,
      description: `Property "${property.title ?? propertyId}" assigned to partner`,
    });
  }

  return true;
}
