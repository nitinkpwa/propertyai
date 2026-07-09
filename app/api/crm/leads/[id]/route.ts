import { NextRequest, NextResponse } from "next/server";
import { fetchLeadActivities } from "@/lib/crm/queries";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getPartnerIdForProfile } from "@/lib/connect/partners/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select(
      `*, buyer:profiles!crm_leads_buyer_id_fkey(id, full_name, phone, email, budget_min, budget_max, buying_purpose, buying_timeline, loan_status, preferred_locations, preferred_property_types, buyer_notes),
       property:properties!crm_leads_primary_property_id_fkey(id, title, city, location, price)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const partnerId = await getPartnerIdForProfile(supabase, user.id);
  const isBuyer = lead.buyer_id === user.id;
  const isPartner = lead.assigned_connect_id === user.id || lead.connect_partner_id === partnerId;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isBuyer && !isPartner && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [activities, followUpsRes] = await Promise.all([
    fetchLeadActivities(id, 50),
    supabase
      .from("crm_follow_ups")
      .select("*")
      .eq("lead_id", id)
      .order("due_at", { ascending: true }),
  ]);

  const intelligence = {
    lead_score: (lead.lead_score as number) ?? 0,
    lead_temperature: (lead.lead_temperature as "cold" | "warm" | "hot") ?? "cold",
    engagement_score: (lead.engagement_score as number) ?? 0,
    visit_score: (lead.visit_score as number) ?? 0,
    interest_score: (lead.interest_score as number) ?? 0,
    budget_match_score: (lead.budget_match_score as number) ?? 0,
    conversion_probability: (lead.conversion_probability as number) ?? 0,
    next_action: (lead.next_action as string) ?? null,
  };

  return NextResponse.json({
    lead,
    activities,
    followUps: followUpsRes.data ?? [],
    intelligence,
  });
}
