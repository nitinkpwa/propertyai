import type { AskEngineIntent, AskEngineResponse, PropertyContext } from "./engine/types";
import type { ConversationMessage } from "./types";
import { parseMarkdownSections } from "./markdown";
import type { AskIntent, AskTurn } from "./types";
import { apiFetch } from "@/lib/stability/fetch";

export type { ConversationMessage, PropertyContext };

export async function queryAskEngine(
  message: string,
  history: ConversationMessage[] = [],
  propertyContext?: PropertyContext | null,
  excludePropertyIds: string[] = [],
  signal?: AbortSignal,
): Promise<AskEngineResponse> {
  const response = await apiFetch("/api/ask/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history,
      propertyContext: propertyContext ?? null,
      excludePropertyIds,
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || "Ask engine request failed");
  }

  return response.json() as Promise<AskEngineResponse>;
}

export type AskStreamHandlers = {
  onStatus?: (phase: string) => void;
  onToken?: (delta: string) => void;
  onDone?: (response: AskEngineResponse) => void;
  onError?: (message: string) => void;
};

/**
 * True SSE streaming against /api/ask/query (stream: true).
 * Tokens arrive as the LLM generates; done carries the full engine response.
 */
export async function queryAskEngineStream(
  message: string,
  history: ConversationMessage[] = [],
  propertyContext?: PropertyContext | null,
  excludePropertyIds: string[] = [],
  signal?: AbortSignal,
  handlers: AskStreamHandlers = {},
): Promise<AskEngineResponse> {
  const response = await apiFetch("/api/ask/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      history,
      propertyContext: propertyContext ?? null,
      excludePropertyIds,
      stream: true,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || "Ask engine stream failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: AskEngineResponse | null = null;
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;

      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "status" && typeof parsed.phase === "string") {
          handlers.onStatus?.(parsed.phase);
        } else if (event === "token" && typeof parsed.delta === "string") {
          handlers.onToken?.(parsed.delta);
        } else if (event === "done") {
          finalResponse = parsed as unknown as AskEngineResponse;
          handlers.onDone?.(finalResponse);
        } else if (event === "error") {
          streamError =
            typeof parsed.message === "string"
              ? parsed.message
              : "Streaming failed";
          handlers.onError?.(streamError);
        }
      } catch {
        /* skip malformed */
      }
    }
  }

  if (streamError) throw new Error(streamError);
  if (!finalResponse) {
    throw new Error("Stream ended without a complete response");
  }
  return finalResponse;
}

function mapEngineIntentToUi(intent: AskEngineIntent): AskIntent {
  switch (intent) {
    case "PROPERTY_SEARCH":
      return "search";
    case "PROPERTY_ANALYSIS":
      return "analysis";
    case "COMPARE":
      return "compare";
    case "LOCALITY":
      return "locality";
    case "BUILDER":
      return "builder";
    case "INVESTMENT":
      return "investment";
    case "MARKET_TREND":
      return "market";
    case "KNOWLEDGE":
    case "FINANCE":
    case "SELLING":
    case "GENERAL_CHAT":
    case "UNRELATED":
    case "UNKNOWN":
    default:
      return "knowledge";
  }
}

const GENERIC_HEADINGS =
  /^(summary|search summary|overview|investment brief|matching properties|nearby alternatives|area analysis|builder analysis|investment analysis|recommendation|areaiq recommendation)$/i;

function extractHeadline(answer: string, intent: AskEngineIntent): string {
  const defaults: Record<AskEngineIntent, string> = {
    PROPERTY_SEARCH: "Here's what I'd recommend",
    PROPERTY_ANALYSIS: "My take on this property",
    COMPARE: "How these compare",
    KNOWLEDGE: "Quick guidance",
    LOCALITY: "Area advice",
    BUILDER: "Builder advice",
    INVESTMENT: "Investment advice",
    FINANCE: "Finance guidance",
    MARKET_TREND: "Market outlook",
    SELLING: "Selling guidance",
    GENERAL_CHAT: "AreaIQ Advisor",
    UNRELATED: "AreaIQ Advisor",
    UNKNOWN: "Quick clarification",
  };

  const h2Match = answer.match(/^##\s+(.+)/m);
  if (h2Match?.[1]) {
    const cleaned = h2Match[1].replace(/\*\*/g, "").trim();
    if (cleaned.length > 0 && cleaned.length <= 120 && !GENERIC_HEADINGS.test(cleaned)) {
      return cleaned;
    }
  }

  return defaults[intent];
}

export function mapEngineResponseToTurn(
  userQuery: string,
  response: AskEngineResponse,
): AskTurn {
  const uiIntent = mapEngineIntentToUi(response.intent);
  const sections = parseMarkdownSections(response.answer);

  const intelligenceLevel = response.intelligenceLevel ?? "full";
  const headline =
    intelligenceLevel === "partial"
      ? response.intent === "MARKET_TREND" || response.intent === "LOCALITY"
        ? "Here's what we can verify"
        : response.intent === "BUILDER"
          ? "Builder intel (partial)"
          : response.intent === "PROPERTY_SEARCH" || response.intent === "INVESTMENT"
            ? "Let's keep narrowing this down"
            : extractHeadline(response.answer, response.intent)
      : extractHeadline(response.answer, response.intent);

  const aiDegraded = Boolean(response.aiDegraded);

  return {
    id: crypto.randomUUID(),
    userQuery,
    intent: uiIntent,
    headline: aiDegraded
      ? "AreaIQ Intelligence"
      : headline,
    subtext: aiDegraded
      ? "Built from live verified inventory — AI reasoning is catching up."
      : intelligenceLevel === "partial"
        ? "Partial intelligence — verified facts plus next steps. Nothing invented."
        : response.searchedDatabase && response.isSimilar
          ? "Closest verified alternatives — not exact matches."
          : response.searchedDatabase && response.properties.length > 0
            ? "Verified listings below."
            : null,
    aiContent: response.answer,
    sections,
    stats: response.stats,
    listings: response.properties,
    propertyRationales: response.propertyRationales ?? {},
    isSimilar: response.isSimilar,
    quickActions: response.suggestions,
    followUps: response.followUpQuestions,
    intelligenceLevel: aiDegraded ? "partial" : intelligenceLevel,
    confidenceOverall: response.confidenceOverall ?? null,
    missingSignals: response.missingSignals ?? [],
    aiDegraded,
    aiNotice: response.aiNotice ?? null,
    intelligenceDigest: response.intelligenceDigest ?? null,
  };
}
