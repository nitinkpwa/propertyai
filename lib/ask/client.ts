import type { AskEngineIntent, AskEngineResponse, PropertyContext } from "./engine/types";
import type { ConversationMessage } from "./types";
import { parseMarkdownSections } from "./markdown";
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

  // Only use a markdown title when it is a meaningful, non-generic heading.
  // Avoid turning the first sentence into a headline — that duplicated the advisor reply.
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

  return {
    id: crypto.randomUUID(),
    userQuery,
    intent: uiIntent,
    headline: extractHeadline(response.answer, response.intent),
    subtext:
      response.searchedDatabase && response.isSimilar
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
  };
}
