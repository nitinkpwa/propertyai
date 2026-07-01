import { NextRequest, NextResponse } from "next/server";
import { ensureLead, markFirstLogin, recordLeadActivity } from "@/lib/crm/service";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const event = typeof body.event === "string" ? body.event : "register";

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "buyer") {
    return NextResponse.json({ success: true, skipped: true });
  }

  if (event === "register") {
    await recordLeadActivity(supabase, {
      buyerId: user.id,
      activityType: "buyer_registered",
      title: "Buyer registered",
      description: profile?.full_name
        ? `${profile.full_name} joined AreaIQ`
        : "New buyer account created",
    });
  } else if (event === "login") {
    await markFirstLogin(supabase, user.id);
  }

  const lead = await ensureLead(supabase, user.id);
  return NextResponse.json({ leadId: lead?.id ?? null });
}
