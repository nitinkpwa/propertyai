import { NextRequest, NextResponse } from "next/server";
import { getRateLimitKey, rateLimit } from "@/lib/api/rateLimit";
import { AREA_IQ_SYSTEM_PROMPT } from "@/lib/ask/engine/prompts";
import { getOpenAIClient, OPENAI_MODEL } from "@/lib/ask/openai-client";
import { getAuthenticatedUser } from "@/lib/supabase/server";

const MAX_MESSAGES = 20;

export async function POST(req: NextRequest) {
  try {
    // Legacy streaming proxy — require auth (the primary chat path is
    // POST /api/ask/query) to prevent anonymous OpenAI cost abuse.
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit(getRateLimitKey(req, user.id), 20, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : null;

    if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // H3: never trust client system roles or extraContext — server owns the prompt.
    const sanitized = messages
      .filter(
        (m: { role?: string; content?: unknown }) =>
          (m?.role === "user" || m?.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.length > 0 &&
          m.content.length < 8_000,
      )
      .slice(-MAX_MESSAGES)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    if (sanitized.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const openai = getOpenAIClient();

    const stream = (await openai.chat.completions.create({
      model: OPENAI_MODEL,
      stream: true,
      max_tokens: 1200,
      temperature: 0.7,
      messages: [{ role: "system", content: AREA_IQ_SYSTEM_PROMPT }, ...sanitized],
    })) as AsyncIterable<unknown>;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("OpenAI error:", error);
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
  }
}
