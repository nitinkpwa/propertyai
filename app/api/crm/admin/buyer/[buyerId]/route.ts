import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { AdminBuyerJourney, CrmLeadActivity } from "@/lib/crm/types";
import { getBuyerProfileForCRM } from "@/lib/crm/buyerProfile";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ buyerId: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (actor?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { buyerId } = await params;

  const [
    profileRes,
    leadRes,
    inquiriesRes,
    savedRes,
    visitsRes,
    conversationsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", buyerId).maybeSingle(),
    supabase
      .from("crm_leads")
      .select("*")
      .eq("buyer_id", buyerId)
      .maybeSingle(),
    supabase
      .from("inquiries")
      .select("*, property:properties(title, city)")
      .eq("from_user_id", buyerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_properties")
      .select("*, property:properties(title, city, price)")
      .eq("user_id", buyerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("site_visits")
      .select(
        "*, property:properties(title, location, city, contact_phone, contact_name, seller_id)",
      )
      .eq("user_id", buyerId)
      .order("visit_date", { ascending: false }),
    supabase
      .from("conversations")
      .select("id, title, messages, updated_at")
      .eq("user_id", buyerId)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const lead = leadRes.data;
  let activities: CrmLeadActivity[] = [];
  if (lead) {
    const { data: actData } = await supabase
      .from("crm_lead_activities")
      .select("*, property:properties(title, city, location)")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
      .limit(50);
    activities = (actData as CrmLeadActivity[]) ?? [];
  }

  const conversations = (conversationsRes.data ?? []).map((c) => {
    const messages = Array.isArray(c.messages)
      ? (c.messages as Array<{ role: string; content: string }>)
      : [];
    const userMsgs = messages.filter((m) => m.role === "user");
    return {
      id: c.id,
      title: c.title,
      preview: userMsgs[userMsgs.length - 1]?.content?.slice(0, 120) ?? "",
      messageCount: messages.length,
    };
  });

  const aiSummary =
    conversations.length > 0
      ? conversations
          .map((c) => c.preview)
          .filter(Boolean)
          .slice(0, 3)
          .join(" · ")
      : null;

  const profile = profileRes.data;
  const enrichedProfile = profile ? getBuyerProfileForCRM(profile, {
    status: lead?.status,
    savedCount: (savedRes.data ?? []).length,
    chatCount: conversations.length,
    visitCount: (visitsRes.data ?? []).length,
  }) : null;

  const journey: AdminBuyerJourney = {
    profile: enrichedProfile,
    lead: lead as AdminBuyerJourney["lead"],
    activities,
    enquiries: inquiriesRes.data ?? [],
    savedProperties: savedRes.data ?? [],
    siteVisits: (visitsRes.data ?? []) as AdminBuyerJourney["siteVisits"],
    conversations,
    aiSummary,
  };

  return NextResponse.json(journey);
}
