import type { ConversationMessage } from "../types";
import { detectIntent } from "./classifier";
import {
  assessConfidence,
  intentRequiresStrongEvidence,
  partialIntelligenceResponse,
} from "./confidence";
import { isClearlyUnrelated } from "./domainGuard";
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
import { emitStreamToken, runWithStreamHooks } from "./streamSink";
import type {
  AskEngineResponse,
  HandlerContext,
  IntentClassification,
  PropertyContext,
} from "./types";
import { classificationToResponseFields, EMPTY_ENTITIES } from "./types";

function unrelatedClassification(): IntentClassification {
  return {
    intent: "UNRELATED",
    confidence: 1,
    entities: { ...EMPTY_ENTITIES },
    location: null,
    builder: null,
    budget: null,
    bedrooms: null,
    propertyName: null,
    compareTargets: [],
    investmentPurpose: null,
    reasoning: "Pre-LLM domain gate",
  };
}

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
 * Only short-circuit when we lack the minimum anchor to run a handler.
 * Never refuse market/locality/investment solely for thin analytics —
 * handlers answer the verified slice and offer next steps.
 */
function shouldUsePartialIntelligence(
  classification: IntentClassification,
  propertyContext?: PropertyContext | null,
): ReturnType<typeof assessConfidence> | null {
  if (!intentRequiresStrongEvidence(classification.intent)) return null;
  // Search / investment with filters can discover listings — never block before DB.
  if (
    classification.intent === "PROPERTY_SEARCH" ||
    classification.intent === "INVESTMENT"
  ) {
    return null;
  }

  const hasLocation = Boolean(
    classification.location ||
      classification.entities.city ||
      classification.entities.locality,
  );
  const hasCompareTargets = classification.compareTargets.length >= 2;
  const hasFinanceAnchor = Boolean(classification.budget || propertyContext);

  const missingAnchor =
    (classification.intent === "PROPERTY_ANALYSIS" &&
      !propertyContext &&
      !classification.propertyName) ||
    (classification.intent === "BUILDER" && !classification.builder) ||
    (classification.intent === "MARKET_TREND" && !hasLocation) ||
    (classification.intent === "LOCALITY" && !hasLocation) ||
    (classification.intent === "COMPARE" && !hasCompareTargets) ||
    (classification.intent === "FINANCE" && !hasFinanceAnchor);

  if (!missingAnchor) return null;

  return assessConfidence(classification, {
    hasPropertyContext: Boolean(propertyContext),
    propertyCount: 0,
    hasBuilderData: Boolean(classification.builder),
    hasAnalytics: Boolean(propertyContext?.analytics),
    pipelineConfidence: 28,
  });
}

async function processAskMessageCore(
  message: string,
  history: ConversationMessage[],
  propertyContext: PropertyContext | null | undefined,
  excludePropertyIds: string[],
  buyerProfileContext: string | undefined,
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

  if (isClearlyUnrelated(trimmed)) {
    logAsk({
      event: "domain_gate_reject",
      userMessage: trimmed,
      intent: "UNRELATED",
    });
    const classification = unrelatedClassification();
    const response = attachClassificationFields(
      await handleUnrelated({
        message: trimmed,
        history,
        classification,
        propertyContext,
        excludePropertyIds,
        buyerProfileContext,
      }),
      classification,
    );
    // Emit static answer as tokens for consistent streaming UX
    emitStreamToken(response.answer);
    return response;
  }

  try {
    const classification = await detectIntent(trimmed, history);
    const ctx: HandlerContext = {
      message: trimmed,
      history,
      classification,
      propertyContext,
      excludePropertyIds,
      buyerProfileContext,
    };

    logAsk({
      event: "handler_routing",
      userMessage: trimmed,
      intent: classification.intent,
    });

    const partialGate = shouldUsePartialIntelligence(classification, propertyContext);
    if (partialGate) {
      logAsk({
        event: "confidence_partial_intelligence",
        intent: classification.intent,
        overall: partialGate.overall,
      });
      const response = partialIntelligenceResponse(ctx, partialGate);
      emitStreamToken(response.answer);
      return response;
    }

    let response = attachClassificationFields(
      enforceDatabaseRules(await routeToHandler(ctx)),
      classification,
    );

    // Empty search/compare: keep helping — never a dead-end refuse
    if (
      response.searchedDatabase &&
      response.properties.length === 0 &&
      (classification.intent === "PROPERTY_SEARCH" ||
        classification.intent === "COMPARE" ||
        classification.intent === "INVESTMENT")
    ) {
      const confidence = assessConfidence(classification, {
        propertyCount: 0,
        hasPropertyContext: Boolean(propertyContext),
        pipelineConfidence: 35,
      });
      const partial = partialIntelligenceResponse(ctx, confidence, {
        emptySearch: true,
      });
      response = {
        ...response,
        answer: partial.answer,
        suggestions:
          response.suggestions.length > 0 ? response.suggestions : partial.suggestions,
        followUpQuestions:
          response.followUpQuestions.length > 0
            ? response.followUpQuestions
            : partial.followUpQuestions,
        intelligenceLevel: "partial",
        confidenceOverall: confidence.overall,
        missingSignals: partial.missingSignals,
      };
      emitStreamToken(response.answer);
    } else if (!response.intelligenceLevel) {
      const confidence = assessConfidence(classification, {
        propertyCount: response.properties.length,
        hasPropertyContext: Boolean(propertyContext),
        hasBuilderData: Boolean(classification.builder),
        hasAnalytics: Boolean(propertyContext?.analytics),
      });
      response = {
        ...response,
        intelligenceLevel: confidence.overall >= 70 ? "full" : "partial",
        confidenceOverall: confidence.overall,
        missingSignals:
          confidence.overall >= 70
            ? []
            : (partialIntelligenceResponse(ctx, confidence).missingSignals ?? []),
      };
    }

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
      followUpQuestions: ["Try again", "3 BHK in Mohali", "Tell me about Aerocity"],
      stats: null,
      searchedDatabase: false,
      isSimilar: false,
    };
  }
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
  buyerProfileContext?: string,
): Promise<AskEngineResponse> {
  return processAskMessageCore(
    message,
    history,
    propertyContext,
    excludePropertyIds,
    buyerProfileContext,
  );
}

export type AskStreamCallbacks = {
  onToken?: (delta: string) => void;
  signal?: AbortSignal;
};

/**
 * Same business logic as processAskMessage, with token callbacks for SSE.
 */
export async function processAskMessageStreaming(
  message: string,
  history: ConversationMessage[] = [],
  propertyContext?: PropertyContext | null,
  excludePropertyIds: string[] = [],
  buyerProfileContext?: string,
  callbacks: AskStreamCallbacks = {},
): Promise<AskEngineResponse> {
  return runWithStreamHooks(
    { onToken: callbacks.onToken, signal: callbacks.signal },
    () =>
      processAskMessageCore(
        message,
        history,
        propertyContext,
        excludePropertyIds,
        buyerProfileContext,
      ),
  );
}
