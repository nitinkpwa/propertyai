import { NextRequest, NextResponse } from "next/server";
import { processAskMessage, type PropertyContext } from "@/lib/ask/engine";
import { logAsk } from "@/lib/ask/engine/logger";
import type { ConversationMessage } from "@/lib/ask/openai-client";
import { buildBuyerProfileContext } from "@/lib/buyer/aiContext";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

function sanitizeHistory(raw: unknown): ConversationMessage[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (item): item is ConversationMessage =>
        typeof item === "object" &&
        item !== null &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string",
    )
    .slice(-12);
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = sanitizeHistory(body.history);
    const propertyContext = sanitizePropertyContext(body.propertyContext);
    const excludePropertyIds = Array.isArray(body.excludePropertyIds)
      ? body.excludePropertyIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    logAsk({
      event: "api_ask_query_received",
      userMessage: message,
      historyLength: history.length,
      hasPropertyContext: Boolean(propertyContext),
    });

    let buyerProfileContext = "";
    const user = await getAuthenticatedUser();
    if (user) {
      const supabase = await createSupabaseServerClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "buying_purpose, budget_min, budget_max, buying_timeline, loan_status, preferred_locations, preferred_property_types, city",
        )
        .eq("id", user.id)
        .maybeSingle();
      buyerProfileContext = buildBuyerProfileContext(profile);
    }

    const response = await processAskMessage(
      message,
      history,
      propertyContext,
      excludePropertyIds,
      buyerProfileContext,
    );

    logAsk({
      event: "api_ask_query_response",
      intent: response.intent,
      propertyCount: response.properties.length,
      searchedDatabase: response.searchedDatabase,
    });

    return NextResponse.json(response);
  } catch (error) {
    logAsk({
      event: "api_ask_query_error",
      level: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to process your request" },
      { status: 500 },
    );
  }
}
