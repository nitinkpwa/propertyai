import { searchPropertiesByLocality } from "../../search";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { resolveLocalitySearchTerm } from "../classifier";
import {
  assessConfidence,
  intelligenceLevelForConfidence,
  missingSignals,
  nextActionsForIntent,
} from "../confidence";
import { buildMemoryContext } from "../memory";
import { logAsk } from "../logger";
import {
  buildListingsContext,
  generateAreaIQResponse,
  MARKET_TREND_PROMPT,
} from "../openai";

export async function handleMarketTrend(ctx: HandlerContext): Promise<AskEngineResponse> {
  const baseFields = classificationToResponseFields(ctx.classification);
  const searchTerm = resolveLocalitySearchTerm(ctx.classification);
  const memoryContext = buildMemoryContext(ctx.classification, ctx.propertyContext);

  let listings: Awaited<ReturnType<typeof searchPropertiesByLocality>>["listings"] = [];
  if (searchTerm) {
    logAsk({
      event: "supabase_query_start",
      intent: "MARKET_TREND",
      searchTerm,
    });
    const result = await searchPropertiesByLocality(searchTerm);
    listings = result.listings;
    logAsk({
      event: "supabase_query_complete",
      intent: "MARKET_TREND",
      searchTerm,
      returnedCount: listings.length,
    });
  }

  const listingsContext =
    listings.length > 0 ? buildListingsContext(listings) : undefined;

  const answer = await generateAreaIQResponse(MARKET_TREND_PROMPT, ctx.message, {
    history: ctx.history,
    memoryContext,
    listingsContext,
    maxTokens: 1800,
  });

  const confidence = assessConfidence(ctx.classification, {
    propertyCount: listings.length,
    hasPropertyContext: Boolean(ctx.propertyContext),
    hasAnalytics: Boolean(ctx.propertyContext?.analytics) || listings.length >= 3,
  });
  const actions = nextActionsForIntent(ctx.classification);

  return {
    intent: "MARKET_TREND",
    answer,
    ...baseFields,
    properties: listings.slice(0, 6),
    propertyRationales: {},
    suggestions: actions.slice(0, 5),
    followUpQuestions: actions.slice(0, 5),
    stats: null,
    searchedDatabase: Boolean(searchTerm),
    isSimilar: false,
    intelligenceLevel: intelligenceLevelForConfidence(confidence.overall),
    confidenceOverall: confidence.overall,
    missingSignals:
      confidence.overall >= 70 ? [] : missingSignals(confidence),
  };
}
