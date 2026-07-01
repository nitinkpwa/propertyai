import type { AskEngineIntent, AskEngineResponse, PropertyContext } from "./engine/types";
import type { ConversationMessage } from "./openai-client";
import { parseMarkdownSections } from "./engine/openai";
import type { AskIntent, AskTurn } from "./types";

export type { ConversationMessage, PropertyContext };

export async function queryAskEngine(
  message: string,
  history: ConversationMessage[] = [],
  propertyContext?: PropertyContext | null,
  excludePropertyIds: string[] = [],
): Promise<AskEngineResponse> {
  const response = await fetch("/api/ask/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history,
      propertyContext: propertyContext ?? null,
      excludePropertyIds,
    }),
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

function extractHeadline(answer: string, intent: AskEngineIntent): string {
  const h2Match = answer.match(/^##\s+(.+)/m);
  if (h2Match?.[1]) {
    const cleaned = h2Match[1].replace(/\*\*/g, "").trim();
    if (cleaned.length > 0 && cleaned.length <= 120) return cleaned;
  }

  const firstLine = answer.split("\n").find((line) => line.trim().length > 0) ?? "";
  const cleaned = firstLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
  if (cleaned.length > 0 && cleaned.length <= 120) return cleaned;

  const defaults: Record<AskEngineIntent, string> = {
    PROPERTY_SEARCH: "Property Search Results",
    PROPERTY_ANALYSIS: "Property Intelligence Report",
    COMPARE: "Comparison Analysis",
    KNOWLEDGE: "Real Estate Insight",
    LOCALITY: "Area Intelligence Report",
    BUILDER: "Builder Intelligence Report",
    INVESTMENT: "Investment Intelligence Report",
    FINANCE: "Finance Guidance",
    MARKET_TREND: "Market Trend Report",
    SELLING: "Selling Guidance",
    GENERAL_CHAT: "AreaIQ",
    UNRELATED: "AreaIQ — Tricity Real Estate",
    UNKNOWN: "Need More Details",
  };

  return defaults[intent];
}

export function mapEngineResponseToTurn(
  userQuery: string,
  response: AskEngineResponse,
): AskTurn {
  const uiIntent = mapEngineIntentToUi(response.intent);
  const sections = parseMarkdownSections(response.answer);

  return {
    id: crypto.randomUUID(),
    userQuery,
    intent: uiIntent,
    headline: extractHeadline(response.answer, response.intent),
    subtext:
      response.searchedDatabase && response.isSimilar
        ? "Showing closest matches from AreaIQ database."
        : response.searchedDatabase && response.properties.length > 0
          ? "Live listings from AreaIQ database."
          : response.intent === "PROPERTY_ANALYSIS"
            ? "Intelligence report generated."
            : null,
    aiContent: response.answer,
    sections,
    stats: response.stats,
    listings: response.properties,
    propertyRationales: response.propertyRationales ?? {},
    isSimilar: response.isSimilar,
    quickActions: response.suggestions,
    followUps: response.followUpQuestions,
  };
}
