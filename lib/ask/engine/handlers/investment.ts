import { computeSearchStats } from "../../responses";
import { runIntelligencePipeline } from "../../intelligence";
import { sortAskListings } from "../../sort";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { wantsAlternativeProperties } from "../memory";
import { logAsk } from "../logger";

export async function handleInvestment(ctx: HandlerContext): Promise<AskEngineResponse> {
  const wantsAlternative = wantsAlternativeProperties(ctx.message);
  const excludePropertyIds =
    wantsAlternative && ctx.excludePropertyIds?.length
      ? ctx.excludePropertyIds
      : undefined;

  // Force investment flags on the message parse via classification merge
  const classification = {
    ...ctx.classification,
    investmentPurpose: ctx.classification.investmentPurpose ?? ("appreciation" as const),
    entities: {
      ...ctx.classification.entities,
      investmentFocus: ctx.classification.entities.investmentFocus ?? "general",
    },
  };

  logAsk({
    event: "intelligence_pipeline_start",
    intent: "INVESTMENT",
  });

  const result = await runIntelligencePipeline({
    message: ctx.message,
    history: ctx.history,
    classification,
    excludePropertyIds,
  });

  const focus = ctx.classification.entities.investmentFocus;
  let listings = result.listings;
  if (focus === "yield") {
    listings = sortAskListings(listings, "rentalYield", "desc");
  } else {
    listings = sortAskListings(listings, "growthScore", "desc");
  }

  logAsk({
    event: "intelligence_pipeline_complete",
    intent: "INVESTMENT",
    returnedCount: listings.length,
    isSimilar: result.isSimilar,
  });

  const baseFields = classificationToResponseFields(ctx.classification);
  if (baseFields.bedrooms == null && result.intent.bedrooms != null) {
    baseFields.bedrooms = result.intent.bedrooms;
  }
  if (baseFields.budget == null && result.intent.budgetMax != null) {
    baseFields.budget = result.intent.budgetMax;
  }

  return {
    intent: "INVESTMENT",
    answer: result.composed.markdown,
    ...baseFields,
    properties: listings,
    propertyRationales: result.composed.propertyRationales,
    suggestions: result.composed.suggestions,
    followUpQuestions: result.composed.followUpQuestions,
    stats: listings.length ? computeSearchStats(listings) : null,
    searchedDatabase: true,
    isSimilar: result.isSimilar,
  };
}
