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
import { buildListingsContext, generateAreaIQResponse, LOCALITY_PROMPT } from "../openai";

export async function handleLocality(ctx: HandlerContext): Promise<AskEngineResponse> {
  const baseFields = classificationToResponseFields(ctx.classification);
  const searchTerm = resolveLocalitySearchTerm(ctx.classification);
  const memoryContext = buildMemoryContext(ctx.classification, ctx.propertyContext);
  const actions = nextActionsForIntent(ctx.classification);

  if (!searchTerm) {
    const answer = await generateAreaIQResponse(LOCALITY_PROMPT, ctx.message, {
      history: ctx.history,
      memoryContext,
    });
    const confidence = assessConfidence(ctx.classification, { propertyCount: 0 });

    return {
      intent: "LOCALITY",
      answer,
      ...baseFields,
      properties: [],
      propertyRationales: {},
      suggestions: actions.slice(0, 5),
      followUpQuestions: actions.slice(0, 5),
      stats: null,
      searchedDatabase: false,
      isSimilar: false,
      intelligenceLevel: "partial",
      confidenceOverall: confidence.overall,
      missingSignals: missingSignals(confidence),
    };
  }

  logAsk({
    event: "supabase_query_start",
    intent: "LOCALITY",
    searchTerm,
  });

  const result = await searchPropertiesByLocality(searchTerm);
  const listings = result.listings;

  logAsk({
    event: "supabase_query_complete",
    intent: "LOCALITY",
    searchTerm,
    returnedCount: listings.length,
    isSimilar: result.isSimilar,
  });

  const listingsContext =
    listings.length > 0 ? buildListingsContext(listings) : undefined;

  const answer = await generateAreaIQResponse(LOCALITY_PROMPT, ctx.message, {
    history: ctx.history,
    memoryContext,
    listingsContext,
  });

  const confidence = assessConfidence(ctx.classification, {
    propertyCount: listings.length,
    hasAnalytics: listings.length >= 3,
  });

  return {
    intent: "LOCALITY",
    answer,
    ...baseFields,
    properties: listings,
    propertyRationales: {},
    suggestions:
      listings.length > 0
        ? ["Compare these", "Higher Rental Yield", "Ready to Move", ...actions.slice(0, 2)]
        : actions.slice(0, 5),
    followUpQuestions: [
      `Show properties in ${searchTerm}`,
      ...actions.slice(0, 3),
    ],
    stats: null,
    searchedDatabase: true,
    isSimilar: result.isSimilar,
    intelligenceLevel: intelligenceLevelForConfidence(confidence.overall),
    confidenceOverall: confidence.overall,
    missingSignals:
      confidence.overall >= 70 ? [] : missingSignals(confidence),
  };
}
