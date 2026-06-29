import { NextRequest, NextResponse } from "next/server";
import { processAskMessage } from "@/lib/ask/engine";
import { logAsk } from "@/lib/ask/engine/logger";
import type { ConversationMessage } from "@/lib/ask/openai-client";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = sanitizeHistory(body.history);

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    logAsk({ event: "api_ask_query_received", userMessage: message, historyLength: history.length });

    const response = await processAskMessage(message, history);

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
