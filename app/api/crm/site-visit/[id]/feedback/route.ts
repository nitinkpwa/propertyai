import { NextRequest, NextResponse } from "next/server";
import { recordLeadActivity } from "@/lib/crm/service";
import type { VisitFeedbackPayload } from "@/lib/crm/visitWorkflow";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as VisitFeedbackPayload;

  const supabase = await createSupabaseServerClient();

  const { data: visit, error } = await supabase
    .from("site_visits")
    .select("id, user_id, property_id, status, property:properties(title)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  if (!["scheduled", "accepted", "completed"].includes(visit.status)) {
    return NextResponse.json(
      { error: "Feedback available after visit is scheduled" },
      { status: 400 },
    );
  }

  const feedback = {
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    parkingRating: typeof body.parkingRating === "number" ? body.parkingRating : null,
    builderBehaviour: typeof body.builderBehaviour === "number" ? body.builderBehaviour : null,
    constructionRating: typeof body.constructionRating === "number" ? body.constructionRating : null,
    wouldBuy: typeof body.wouldBuy === "boolean" ? body.wouldBuy : null,
    additionalComments:
      typeof body.additionalComments === "string" ? body.additionalComments.trim() : "",
    photoUrls: Array.isArray(body.photoUrls)
      ? body.photoUrls.filter((u): u is string => typeof u === "string")
      : [],
    submittedAt: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("site_visits")
    .update({
      feedback,
      status: visit.status === "completed" ? "completed" : "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const property = visit.property as { title?: string } | null;
  const summaryParts = [
    feedback.wouldBuy !== null ? (feedback.wouldBuy ? "Would buy" : "Would not buy") : null,
    feedback.constructionRating !== null
      ? `Construction: ${feedback.constructionRating}/5`
      : null,
  ].filter(Boolean);

  await recordLeadActivity(supabase, {
    buyerId: user.id,
    activityType: "visit_feedback_submitted",
    title: "Visit feedback submitted",
    description:
      summaryParts.join(" · ") ||
      feedback.notes?.slice(0, 120) ||
      property?.title ||
      undefined,
    propertyId: visit.property_id,
    siteVisitId: id,
    metadata: feedback,
  });

  return NextResponse.json({ success: true });
}
