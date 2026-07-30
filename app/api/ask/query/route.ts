import { NextRequest, NextResponse } from "next/server";
import { getRateLimitKey, rateLimit } from "@/lib/api/rateLimit";
import type { PropertyContext } from "@/lib/ask/engine";
import type { ConversationMessage } from "@/lib/ask/openai-client";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";

const MAX_MESSAGE_LENGTH = 2000;

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

  const analyticsRaw =
    typeof ctx.analytics === "object" && ctx.analytics !== null
      ? (ctx.analytics as Record<string, unknown>)
      : null;

  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  const analytics = analyticsRaw
    ? {
        currentPsf: numOrNull(analyticsRaw.currentPsf),
        areaAveragePsf: numOrNull(analyticsRaw.areaAveragePsf),
        differencePercent: numOrNull(analyticsRaw.differencePercent),
        marketPosition:
          typeof analyticsRaw.marketPosition === "string"
            ? analyticsRaw.marketPosition
            : null,
        priceConfidence: numOrNull(analyticsRaw.priceConfidence),
        investmentScore: numOrNull(analyticsRaw.investmentScore),
        investmentConfidence: numOrNull(analyticsRaw.investmentConfidence),
        fairValueExpected: numOrNull(analyticsRaw.fairValueExpected),
        growthRange:
          typeof analyticsRaw.growthRange === "string"
            ? analyticsRaw.growthRange
            : null,
        comparableCount:
          typeof analyticsRaw.comparableCount === "number"
            ? analyticsRaw.comparableCount
            : 0,
        priceOpinion:
          typeof analyticsRaw.priceOpinion === "string"
            ? analyticsRaw.priceOpinion
            : null,
      }
    : null;

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
    analytics,
  };
}

function wantsStream(req: NextRequest, body: Record<string, unknown>): boolean {
  if (body.stream === true) return true;
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("text/event-stream");
}

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = sanitizeHistory(body.history);
    const propertyContext = sanitizePropertyContext(body.propertyContext);
    const excludePropertyIds = Array.isArray(body.excludePropertyIds)
      ? body.excludePropertyIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const stream = wantsStream(req, body);

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    let buyerProfileContext = "";
    const user = await getAuthenticatedUser();

    const limited = rateLimit(
      getRateLimitKey(req, user?.id),
      user ? 30 : 10,
      60_000,
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    const [{ processAskMessage, processAskMessageStreaming }, { logAsk }, { buildBuyerProfileContext }] =
      await Promise.all([
        import("@/lib/ask/engine"),
        import("@/lib/ask/engine/logger"),
        import("@/lib/buyer/aiContext"),
      ]);

    logAsk({
      event: "api_ask_query_received",
      userMessage: message,
      historyLength: history.length,
      hasPropertyContext: Boolean(propertyContext),
      stream,
    });

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

    if (!stream) {
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
    }

    const encoder = new TextEncoder();
    let cancelled = false;
    const abort = new AbortController();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          if (cancelled) return;
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        };

        try {
          send("status", { phase: "understanding" });

          const response = await processAskMessageStreaming(
            message,
            history,
            propertyContext,
            excludePropertyIds,
            buyerProfileContext,
            {
              signal: abort.signal,
              onToken: (delta) => {
                send("token", { delta });
              },
            },
          );

          if (!cancelled) {
            send("done", response);
            logAsk({
              event: "api_ask_query_stream_complete",
              intent: response.intent,
              propertyCount: response.properties.length,
            });
          }
        } catch (error) {
          logAsk({
            event: "api_ask_query_stream_error",
            level: "error",
            error: error instanceof Error ? error.message : String(error),
          });
          send("error", {
            message:
              error instanceof Error
                ? error.message
                : "Failed to process your request",
          });
        } finally {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      },
      cancel() {
        cancelled = true;
        abort.abort();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const { logAsk } = await import("@/lib/ask/engine/logger");
    logAsk({
      event: "api_ask_query_error",
      level: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Something went wrong while processing your request. Please try again.",
        retryable: true,
      },
      { status: 500 },
    );
  }
}
