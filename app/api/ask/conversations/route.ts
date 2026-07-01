import { NextRequest, NextResponse } from "next/server";
import {
  createUserConversation,
  fetchUserConversationSummaries,
} from "@/lib/ask/conversations/serverQueries";
import { recordLeadActivity } from "@/lib/crm/service";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { PropertyContext } from "@/lib/ask/engine/types";

function sanitizePropertyContext(raw: unknown): PropertyContext | null {
  if (typeof raw !== "object" || raw === null) return null;
  const ctx = raw as Record<string, unknown>;
  if (typeof ctx.id !== "string" || typeof ctx.name !== "string") return null;
  return {
    id: ctx.id,
    name: ctx.name,
    location: typeof ctx.location === "string" ? ctx.location : "",
    city: typeof ctx.city === "string" ? ctx.city : "",
    price: typeof ctx.price === "number" ? ctx.price : 0,
    bhk: typeof ctx.bhk === "number" ? ctx.bhk : 0,
    area: typeof ctx.area === "number" ? ctx.area : 0,
    builderName: typeof ctx.builderName === "string" ? ctx.builderName : "",
    growthScore: typeof ctx.growthScore === "number" ? ctx.growthScore : null,
    rentalYield: typeof ctx.rentalYield === "number" ? ctx.rentalYield : null,
    possession: typeof ctx.possession === "string" ? ctx.possession : "",
    propertyType: typeof ctx.propertyType === "string" ? ctx.propertyType : "",
  };
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const conversations = await fetchUserConversationSummaries(supabase, user.id);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "New conversation";
  const propertyContext = sanitizePropertyContext(body.propertyContext);

  const supabase = await createSupabaseServerClient();
  const conversation = await createUserConversation(
    supabase,
    user.id,
    title || "New conversation",
    propertyContext,
  );

  if (!conversation) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  await recordLeadActivity(supabase, {
    buyerId: user.id,
    activityType: "ai_chat_started",
    title: "Started AI chat",
    description: title || "New conversation",
    conversationId: conversation.id,
    propertyId: propertyContext?.id,
  });

  return NextResponse.json({ conversation });
}
