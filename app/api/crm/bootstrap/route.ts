import { NextRequest, NextResponse } from "next/server";
import { ensureLead, markFirstLogin, recordLeadActivity } from "@/lib/crm/service";
import { endPerfRequest, recordPerf, startPerfRequest, timed } from "@/lib/perf/timing";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  startPerfRequest("/api/crm/bootstrap");
  const t0 = performance.now();
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const event = typeof body.event === "string" ? body.event : "register";

    const supabase = await createSupabaseServerClient();

    const { data: profile } = await timed("crm.bootstrap.profile", async () =>
      await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle(),
    );

    if (profile?.role !== "buyer") {
      return NextResponse.json({ success: true, skipped: true });
    }

    if (event === "register") {
      await timed("crm.bootstrap.recordRegister", () =>
        recordLeadActivity(supabase, {
          buyerId: user.id,
          activityType: "buyer_registered",
          title: "Buyer registered",
          description: profile?.full_name
            ? `${profile.full_name} joined AreaIQ`
            : "New buyer account created",
        }),
      );
    } else if (event === "login") {
      await timed("crm.bootstrap.markFirstLogin", () =>
        markFirstLogin(supabase, user.id),
      );
    }

    const lead = await timed("crm.bootstrap.ensureLead", () =>
      ensureLead(supabase, user.id),
    );
    return NextResponse.json({ leadId: lead?.id ?? null });
  } finally {
    recordPerf("crm.bootstrap.total", performance.now() - t0);
    endPerfRequest("crm.bootstrap");
  }
}
