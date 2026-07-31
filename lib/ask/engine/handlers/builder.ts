import { searchPropertiesByBuilder } from "../../search";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { resolveBuilderName } from "../classifier";
import {
  assessConfidence,
  intelligenceLevelForConfidence,
  missingSignals,
  nextActionsForIntent,
} from "../confidence";
import { buildMemoryContext } from "../memory";
import { logAsk } from "../logger";
import { buildListingsContext, generateAreaIQResponse, BUILDER_PROMPT } from "../openai";

export async function handleBuilder(ctx: HandlerContext): Promise<AskEngineResponse> {
  const builderName = resolveBuilderName(ctx.classification);
  const baseFields = classificationToResponseFields(ctx.classification);
  const memoryContext = buildMemoryContext(ctx.classification, ctx.propertyContext);
  const actions = nextActionsForIntent(ctx.classification);

  if (!builderName) {
    const answer = await generateAreaIQResponse(BUILDER_PROMPT, ctx.message, {
      history: ctx.history,
      memoryContext,
    });
    const confidence = assessConfidence(ctx.classification, { hasBuilderData: false });

    return {
      intent: "BUILDER",
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
    intent: "BUILDER",
    builder: builderName,
  });

  const result = await searchPropertiesByBuilder(builderName);
  const listings = result.listings;

  logAsk({
    event: "supabase_query_complete",
    intent: "BUILDER",
    builder: builderName,
    returnedCount: listings.length,
  });

  const listingsContext =
    listings.length > 0 ? buildListingsContext(listings) : undefined;

  const answer = await generateAreaIQResponse(BUILDER_PROMPT, ctx.message, {
    history: ctx.history,
    memoryContext,
    listingsContext,
  });

  const confidence = assessConfidence(ctx.classification, {
    propertyCount: listings.length,
    hasBuilderData: true,
    hasAnalytics: listings.length >= 2,
  });

  return {
    intent: "BUILDER",
    answer,
    ...baseFields,
    builder: builderName,
    properties: listings,
    propertyRationales: {},
    suggestions:
      listings.length > 0
        ? ["Compare these", "Lowest Price", "Ready to Move", "Compare similar builders"]
        : actions.slice(0, 5),
    followUpQuestions: [
      listings.length > 0
        ? `Show more projects by ${builderName}`
        : "Show trusted builders in Mohali",
      "Compare similar builders",
      ...actions.slice(0, 2),
    ],
    stats: null,
    searchedDatabase: true,
    isSimilar: false,
    intelligenceLevel: intelligenceLevelForConfidence(confidence.overall),
    confidenceOverall: confidence.overall,
    missingSignals:
      confidence.overall >= 70 ? [] : missingSignals(confidence),
  };
}
