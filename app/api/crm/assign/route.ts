import { NextRequest, NextResponse } from "next/server";
import { assignConnectPartner } from "@/lib/crm/service";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
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

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const connectPartnerId =
    typeof body.connectPartnerId === "string" ? body.connectPartnerId : "";

  if (!leadId || !connectPartnerId) {
    return NextResponse.json(
      { error: "Lead and Connect partner required" },
      { status: 400 },
    );
  }

  const ok = await assignConnectPartner(
    supabase,
    leadId,
    connectPartnerId,
    user.id,
  );

  if (!ok) {
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
