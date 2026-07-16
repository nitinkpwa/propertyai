import { NextRequest, NextResponse } from "next/server";
import { recordLeadActivity } from "@/lib/crm/service";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!propertyId || !message) {
    return NextResponse.json({ error: "Property and message required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "buyer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: property, error: propError } = await supabase
    .from("properties")
    .select("id, title, seller_id, connect_partner_id, assigned_connect_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (propError || !property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // The property's Connect partner is stamped on the transaction itself; a DB
  // trigger enforces the same from properties.connect_partner_id.
  const { data: inquiry, error: inqError } = await supabase
    .from("inquiries")
    .insert({
      from_user_id: user.id,
      property_id: propertyId,
      seller_id: property.seller_id,
      message,
      status: "new",
      connect_partner_id: property.connect_partner_id ?? null,
    })
    .select("id")
    .single();

  if (inqError || !inquiry) {
    console.error("CRM inquiry insert:", inqError?.message);
    return NextResponse.json({ error: "Failed to send inquiry" }, { status: 500 });
  }

  await recordLeadActivity(supabase, {
    buyerId: user.id,
    activityType: "inquiry_sent",
    title: "Inquiry sent",
    description: message.slice(0, 200),
    propertyId,
    inquiryId: inquiry.id,
    metadata: {
      property_title: property.title,
      buyer_name: profile?.full_name,
    },
  });

  return NextResponse.json({ inquiryId: inquiry.id });
}
