import { NextRequest, NextResponse } from "next/server";
import { recordLeadActivity } from "@/lib/crm/service";
import { buyerCanSeeOwnerContact } from "@/lib/crm/visitWorkflow";
import { resolveOwnerContact } from "@/lib/crm/visitService";
import type { VisitStatus } from "@/lib/crm/types";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { BUYER_PROFILE_COLUMNS, getBuyerProfileForCRM } from "@/lib/crm/buyerProfile";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "buyer";

  const { data: visit, error } = await supabase
    .from("site_visits")
    .select("id, user_id, property_id, status, visit_location, visit_date, visit_time")
    .eq("id", id)
    .maybeSingle();

  if (error || !visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  const isOwner = visit.user_id === user.id;
  const isAdmin = role === "admin";

  if (!isOwner && !isAdmin) {
    const canManage = await import("@/lib/crm/visitService").then((m) =>
      m.canManageVisit(supabase, id, user.id, role),
    );
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const status = visit.status as VisitStatus;

  if (isAdmin || (isOwner === false && role !== "buyer")) {
    const contact = await resolveOwnerContact(supabase, visit.property_id);
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select(BUYER_PROFILE_COLUMNS)
      .eq("id", visit.user_id)
      .maybeSingle();

    return NextResponse.json({
      visitLocation: visit.visit_location,
      visitDate: visit.visit_date,
      visitTime: visit.visit_time,
      status,
      ownerContact: contact,
      buyerContact: getBuyerProfileForCRM(buyerProfile),
    });
  }

  if (!buyerCanSeeOwnerContact(status)) {
    return NextResponse.json({
      status,
      visitLocation: null,
      ownerContact: null,
      message: "Contact details will be available after your visit request is accepted.",
    });
  }

  const contact = await resolveOwnerContact(supabase, visit.property_id);

  return NextResponse.json({
    status,
    visitLocation: visit.visit_location,
    visitDate: visit.visit_date,
    visitTime: visit.visit_time,
    ownerContact: contact,
  });
}
