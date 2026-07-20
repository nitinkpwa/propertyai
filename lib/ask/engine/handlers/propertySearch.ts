import { computeSearchStats } from "../../responses";
import { runIntelligencePipeline } from "../../intelligence";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { wantsAlternativeProperties } from "../memory";
import { logAsk } from "../logger";

export async function handlePropertySearch(
  ctx: HandlerContext,
): Promise<AskEngineResponse> {
  const wantsAlternative = wantsAlternativeProperties(ctx.message);
  const excludePropertyIds =
    wantsAlternative && ctx.excludePropertyIds?.length
      ? ctx.excludePropertyIds
      : undefined;

  logAsk({
    event: "intelligence_pipeline_start",
    intent: "PROPERTY_SEARCH",
  });

  const result = await runIntelligencePipeline({
    message: ctx.message,
    history: ctx.history,
    classification: ctx.classification,
    excludePropertyIds,
  });

  logAsk({
    event: "intelligence_pipeline_complete",
    intent: "PROPERTY_SEARCH",
    exactCount: result.bundle.search.exactCount,
    returnedCount: result.listings.length,
    isSimilar: result.isSimilar,
  });

  const baseFields = classificationToResponseFields(ctx.classification);

  // Prefer structured intent bedrooms/budget when classifier missed them
  if (baseFields.bedrooms == null && result.intent.bedrooms != null) {
    baseFields.bedrooms = result.intent.bedrooms;
  }
  if (baseFields.budget == null && result.intent.budgetMax != null) {
    baseFields.budget = result.intent.budgetMax;
  }
  if (baseFields.location == null && result.intent.city != null) {
    baseFields.location = result.intent.city;
  }

  return {
    intent: "PROPERTY_SEARCH",
    answer: result.composed.markdown,
    ...baseFields,
    properties: result.listings,
    propertyRationales: result.composed.propertyRationales,
    suggestions: result.composed.suggestions,
    followUpQuestions: result.composed.followUpQuestions,
    stats: result.listings.length ? computeSearchStats(result.listings) : null,
    searchedDatabase: true,
    isSimilar: result.isSimilar,
  };
}
