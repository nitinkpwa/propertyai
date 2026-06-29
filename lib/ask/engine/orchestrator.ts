import type { ConversationMessage } from "../openai-client";
import { detectIntent } from "./classifier";
import { handleBuilder } from "./handlers/builder";
import { handleFinance } from "./handlers/finance";
import { handleGeneralChat } from "./handlers/generalChat";
import { handleInvestment } from "./handlers/investment";
import { handleKnowledge } from "./handlers/knowledge";
import { handleLocality } from "./handlers/locality";
import { handlePropertySearch } from "./handlers/propertySearch";
import { handleUnknown } from "./handlers/unknown";
import { logAsk } from "./logger";
import { AskAIError } from "./openai";
import { AI_UNAVAILABLE_MESSAGE } from "./prompts";
import type { AskEngineResponse, HandlerContext, IntentClassification } from "./types";
import { classificationToResponseFields, EMPTY_ENTITIES } from "./types";

export { detectIntent } from "./classifier";
export type { AskEngineIntent, AskEngineResponse, IntentClassification } from "./types";
export { handlePropertySearch } from "./handlers/propertySearch";
export { handleKnowledge } from "./handlers/knowledge";
export { handleLocality } from "./handlers/locality";
export { handleBuilder } from "./handlers/builder";
export { handleInvestment } from "./handlers/investment";
export { handleFinance } from "./handlers/finance";
export { handleGeneralChat } from "./handlers/generalChat";
export { handleUnknown } from "./handlers/unknown";

async function routeToHandler(ctx: HandlerContext): Promise<AskEngineResponse> {
  switch (ctx.classification.intent) {
    case "PROPERTY_SEARCH":
      return handlePropertySearch(ctx);
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
    case "GENERAL_CHAT":
      return handleGeneralChat(ctx);
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
 * Central entry point for the Ask AreaIQ decision engine.
 * Every user message is classified by OpenAI first, then routed to the appropriate handler.
 */
export async function processAskMessage(
  message: string,
  history: ConversationMessage[] = [],
): Promise<AskEngineResponse> {
  const trimmed = message.trim();

  logAsk({ event: "ask_request_start", userMessage: trimmed, historyLength: history.length });

  if (!trimmed) {
    const response = await handleUnknown({
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
      },
    });
    return response;
  }

  try {
    const classification = await detectIntent(trimmed, history);
    const ctx: HandlerContext = { message: trimmed, history, classification };

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
      suggestions: [],
      followUpQuestions: [],
      stats: null,
      searchedDatabase: false,
      isSimilar: false,
    };
  }
}
