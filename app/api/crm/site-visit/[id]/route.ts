import { NextRequest, NextResponse } from "next/server";
import {
  acceptSiteVisit,
  canManageVisit,
  completeSiteVisit,
  rejectSiteVisit,
  rescheduleSiteVisit,
} from "@/lib/crm/visitService";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? null;
  const allowed = await canManageVisit(supabase, id, user.id, role);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let result: { ok: boolean; error?: string };

  switch (action) {
    case "accept":
      result = await acceptSiteVisit(supabase, id, user.id);
      break;
    case "reject":
      result = await rejectSiteVisit(
        supabase,
        id,
        user.id,
        typeof body.reason === "string" ? body.reason : undefined,
      );
      break;
    case "reschedule":
      if (typeof body.visitDate !== "string" || typeof body.visitTime !== "string") {
        return NextResponse.json({ error: "Date and time required" }, { status: 400 });
      }
      result = await rescheduleSiteVisit(
        supabase,
        id,
        body.visitDate,
        body.visitTime,
        user.id,
      );
      break;
    case "complete":
      result = await completeSiteVisit(supabase, id, user.id);
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
