import { NextRequest, NextResponse } from "next/server";
import { recordLeadActivity } from "@/lib/crm/service";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const visitId = typeof body.visitId === "string" ? body.visitId : null;
  const phase = body.phase as "before" | "during" | "after";
  const contextData = body.contextData as Record<string, unknown> | undefined;

  if (!visitId || !phase || !contextData) {
    return NextResponse.json({ error: "visitId, phase, contextData required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: visit } = await supabase
    .from("site_visits")
    .select("id, user_id, property_id, status")
    .eq("id", visitId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  const column = phase === "during" ? "during_visit_notes" : "visit_context";
  const existingCol = phase === "during" ? "during_visit_notes" : "visit_context";

  const { data: existing } = await supabase
    .from("site_visits")
    .select(existingCol)
    .eq("id", visitId)
    .maybeSingle();

  const prev =
    existing && existingCol in existing
      ? ((existing as Record<string, unknown>)[existingCol] as Record<string, unknown>) ?? {}
      : {};
  const merged = { ...prev, [phase]: contextData, updatedAt: new Date().toISOString() };

  const { error: updateError } = await supabase
    .from("site_visits")
    .update({
      [column]: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("visit_context").upsert(
    {
      site_visit_id: visitId,
      property_id: visit.property_id,
      phase,
      context_data: contextData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "site_visit_id,phase" },
  );

  if (phase === "during") {
    await recordLeadActivity(supabase, {
      buyerId: user.id,
      activityType: "visit_notes_saved",
      title: "Visit notes saved",
      description: "During-visit checklist and notes updated",
      propertyId: visit.property_id,
      siteVisitId: visitId,
      metadata: contextData,
      skipNotifications: true,
    });
  }

  return NextResponse.json({ ok: true });
}
