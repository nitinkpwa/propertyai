import type { ConversationMessage } from "../openai-client";
import { detectIntent } from "./classifier";
import { handleBuilder } from "./handlers/builder";
import { handleCompare } from "./handlers/compare";
import { handleFinance } from "./handlers/finance";
import { handleGeneralChat } from "./handlers/generalChat";
import { handleInvestment } from "./handlers/investment";
import { handleKnowledge } from "./handlers/knowledge";
import { handleLocality } from "./handlers/locality";
import { handleMarketTrend } from "./handlers/marketTrend";
import { handlePropertyAnalysis } from "./handlers/propertyAnalysis";
import { handlePropertySearch } from "./handlers/propertySearch";
import { handleSelling } from "./handlers/selling";
import { handleUnknown } from "./handlers/unknown";
import { handleUnrelated } from "./handlers/unrelated";
import { logAsk } from "./logger";
import { AskAIError } from "./openai";
import { AI_UNAVAILABLE_MESSAGE } from "./prompts";
import type {
  AskEngineResponse,
  HandlerContext,
  IntentClassification,
  PropertyContext,
} from "./types";
import { classificationToResponseFields, EMPTY_ENTITIES } from "./types";

export { detectIntent } from "./classifier";
export type {
  AskEngineIntent,
  AskEngineResponse,
  IntentClassification,
  PropertyContext,
} from "./types";
export { handlePropertySearch } from "./handlers/propertySearch";
export { handlePropertyAnalysis } from "./handlers/propertyAnalysis";
export { handleCompare } from "./handlers/compare";
export { handleKnowledge } from "./handlers/knowledge";
export { handleLocality } from "./handlers/locality";
export { handleBuilder } from "./handlers/builder";
export { handleInvestment } from "./handlers/investment";
export { handleFinance } from "./handlers/finance";
export { handleMarketTrend } from "./handlers/marketTrend";
export { handleSelling } from "./handlers/selling";
export { handleGeneralChat } from "./handlers/generalChat";
export { handleUnrelated } from "./handlers/unrelated";
export { handleUnknown } from "./handlers/unknown";

async function routeToHandler(ctx: HandlerContext): Promise<AskEngineResponse> {
  switch (ctx.classification.intent) {
    case "PROPERTY_SEARCH":
      return handlePropertySearch(ctx);
    case "PROPERTY_ANALYSIS":
      return handlePropertyAnalysis(ctx);
    case "COMPARE":
      return handleCompare(ctx);
    case "KNOWLEDGE":
      return handleKnowledge(ctx);
    case "LOCALITY":
      return handleLocality(ctx);
    case "BUILDER":
      return handleBuilder(ctx);
    case "INVESTMENT":
      return handleInvestment(ctx);
    case "FINANCE":
      return handleFinance(ctx);
    case "MARKET_TREND":
      return handleMarketTrend(ctx);
    case "SELLING":
      return handleSelling(ctx);
    case "GENERAL_CHAT":
      return handleGeneralChat(ctx);
    case "UNRELATED":
      return handleUnrelated(ctx);
    case "UNKNOWN":
    default:
      return handleUnknown(ctx);
  }
}

function enforceDatabaseRules(response: AskEngineResponse): AskEngineResponse {
  if (!response.searchedDatabase || response.properties.length === 0) {
    return {
      ...response,
      properties: [],
      propertyRationales: {},
      stats: response.searchedDatabase ? null : response.stats,
    };
  }
  return response;
}

function attachClassificationFields(
  response: AskEngineResponse,
  classification: IntentClassification,
): AskEngineResponse {
  return {
    ...response,
    ...classificationToResponseFields(classification),
  };
}

/**
 * Central entry point for the AreaIQ Intelligence Engine.
 * Classify intent → query Supabase when needed → OpenAI generates structured reports.
 */
export async function processAskMessage(
  message: string,
  history: ConversationMessage[] = [],
  propertyContext?: PropertyContext | null,
  excludePropertyIds: string[] = [],
): Promise<AskEngineResponse> {
  const trimmed = message.trim();

  logAsk({
    event: "ask_request_start",
    userMessage: trimmed,
    historyLength: history.length,
    hasPropertyContext: Boolean(propertyContext),
  });

  if (!trimmed) {
    return handleUnknown({
      message: trimmed,
      history,
      classification: {
        intent: "UNKNOWN",
        confidence: 0,
        entities: { ...EMPTY_ENTITIES },
        location: null,
        builder: null,
        budget: null,
        bedrooms: null,
        propertyName: null,
        compareTargets: [],
        investmentPurpose: null,
      },
    });
  }

  try {
    const classification = await detectIntent(trimmed, history);
    const ctx: HandlerContext = {
      message: trimmed,
      history,
      classification,
      propertyContext,
      excludePropertyIds,
    };

    logAsk({
      event: "handler_routing",
      userMessage: trimmed,
      intent: classification.intent,
    });

    const response = attachClassificationFields(
      enforceDatabaseRules(await routeToHandler(ctx)),
      classification,
    );

    logAsk({
      event: "ask_request_complete",
      userMessage: trimmed,
      intent: response.intent,
      searchedDatabase: response.searchedDatabase,
      propertyCount: response.properties.length,
      isSimilar: response.isSimilar,
      answerPreview: response.answer.slice(0, 200),
    });

    return response;
  } catch (error) {
    const answer =
      error instanceof AskAIError ? error.message : AI_UNAVAILABLE_MESSAGE;

    logAsk({
      event: "ask_request_error",
      level: "error",
      userMessage: trimmed,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      intent: "UNKNOWN",
      answer,
      location: null,
      builder: null,
      budget: null,
      bedrooms: null,
      properties: [],
      propertyRationales: {},
      suggestions: [],
      followUpQuestions: [],
      stats: null,
      searchedDatabase: false,
      isSimilar: false,
    };
  }
}
