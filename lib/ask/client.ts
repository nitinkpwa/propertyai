import type { AskEngineIntent, AskEngineResponse } from "./engine/types";
import type { ConversationMessage } from "./openai-client";
import type { AskIntent, AskTurn } from "./types";

export type { ConversationMessage };

export async function queryAskEngine(
  message: string,
  history: ConversationMessage[] = [],
): Promise<AskEngineResponse> {
  const response = await fetch("/api/ask/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    throw new Error("Ask engine request failed");
  }

  return response.json() as Promise<AskEngineResponse>;
}

function mapEngineIntentToUi(intent: AskEngineIntent): AskIntent {
  switch (intent) {
    case "PROPERTY_SEARCH":
      return "search";
    case "LOCALITY":
      return "locality";
    case "BUILDER":
      return "builder";
    case "INVESTMENT":
      return "investment";
    case "KNOWLEDGE":
    case "FINANCE":
    case "GENERAL_CHAT":
    case "UNKNOWN":
    default:
      return "knowledge";
  }
}

function extractHeadline(answer: string, intent: AskEngineIntent): string {
  const firstParagraph = answer.split("\n").find((line) => line.trim().length > 0) ?? "";
  const cleaned = firstParagraph.replace(/\*\*/g, "").trim();
  if (cleaned.length > 0 && cleaned.length <= 160) return cleaned;

  const defaults: Record<AskEngineIntent, string> = {
    PROPERTY_SEARCH: "Property search results",
    KNOWLEDGE: "Here's what you should know",
    LOCALITY: "Locality analysis",
    BUILDER: "Builder overview",
    INVESTMENT: "Investment analysis",
    FINANCE: "Finance guidance",
    GENERAL_CHAT: "AreaIQ",
    UNKNOWN: "Need more details",
  };

  return defaults[intent];
}

export function mapEngineResponseToTurn(
  userQuery: string,
  response: AskEngineResponse,
): AskTurn {
  const uiIntent = mapEngineIntentToUi(response.intent);

  return {
    id: crypto.randomUUID(),
    userQuery,
    intent: uiIntent,
    headline: extractHeadline(response.answer, response.intent),
    subtext:
      response.searchedDatabase && response.isSimilar
        ? "Showing closest matches from our database."
        : response.searchedDatabase && response.properties.length > 0
          ? "Live listings from our database."
          : null,
    aiContent: response.answer,
    sections: [],
    stats: response.stats,
    listings: response.properties,
    isSimilar: response.isSimilar,
    quickActions: response.suggestions,
    followUps: response.followUpQuestions,
  };
}
