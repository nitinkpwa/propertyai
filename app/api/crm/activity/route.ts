import { NextRequest, NextResponse } from "next/server";
import { recordLeadActivity } from "@/lib/crm/service";
import type { ActivityType } from "@/lib/crm/types";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

const ALLOWED_TYPES: ActivityType[] = [
  "ai_chat_started",
  "ai_chat_message",
  "property_viewed",
  "property_saved",
  "property_unsaved",
  "contact_requested",
];

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const activityType = body.activityType as ActivityType;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : undefined;
  const propertyId =
    typeof body.propertyId === "string" ? body.propertyId : undefined;
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : undefined;

  if (!activityType || !ALLOWED_TYPES.includes(activityType) || !title) {
    return NextResponse.json({ error: "Invalid activity payload" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const result = await recordLeadActivity(supabase, {
    buyerId: user.id,
    activityType,
    title,
    description,
    propertyId,
    conversationId,
  });

  if (!result) {
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 });
  }

  return NextResponse.json(result);
}
