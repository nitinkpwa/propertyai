import { NextResponse } from "next/server";
import {
  fetchConnectPartnerById,
  fetchPartnerActivities,
  fetchPartnerAnalytics,
  fetchPartnerBuyers,
  fetchPartnerProperties,
  fetchPartnerSiteVisits,
  getPartnerIdForProfile,
} from "@/lib/connect/partners/queries";
import { logConnectPartnerActivity } from "@/lib/connect/partners/service";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, connect_partner_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "builder") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const partnerId = await getPartnerIdForProfile(supabase, user.id);
  if (!partnerId) {
    return NextResponse.json({ error: "Partner record not found" }, { status: 404 });
  }

  const partner = await fetchConnectPartnerById(supabase, partnerId);
  if (!partner || partner.status !== "active") {
    // Suspended / archived / pending partners must not receive buyer PII.
    return NextResponse.json(
      { error: "Partner account is not active. Contact AreaIQ support." },
      { status: 403 },
    );
  }

  const [buyers, properties, activities, analytics, siteVisits] = await Promise.all([
    fetchPartnerBuyers(supabase, partnerId),
    fetchPartnerProperties(supabase, partnerId, user.id),
    fetchPartnerActivities(supabase, { partnerId, limit: 30 }),
    fetchPartnerAnalytics(supabase, partnerId),
    // Visits via assigned properties — never by buyer ownership.
    fetchPartnerSiteVisits(supabase, partnerId, user.id),
  ]);

  return NextResponse.json({ partner, buyers, properties, activities, analytics, siteVisits });
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "builder") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const partnerId = await getPartnerIdForProfile(supabase, user.id);
  if (!partnerId) {
    return NextResponse.json({ error: "Partner record not found" }, { status: 404 });
  }

  const partner = await fetchConnectPartnerById(supabase, partnerId);
  if (!partner || partner.status !== "active") {
    return NextResponse.json(
      { error: "Partner account is not active. Contact AreaIQ support." },
      { status: 403 },
    );
  }

  await logConnectPartnerActivity(supabase, {
    type: "login",
    partnerId,
    actorId: user.id,
    description: "Partner logged in",
  });

  return NextResponse.json({ success: true });
}
