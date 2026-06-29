import { computeSearchStats } from "../../responses";
import { searchPropertiesFromIntent } from "../../search";
import { sortAskListings } from "../../sort";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { entitiesToFilters } from "../classifier";
import { logAsk } from "../logger";
import { buildListingsContext, generateAreaIQResponse, INVESTMENT_PROMPT } from "../openai";
import { NO_MATCHING_PROPERTIES_MESSAGE } from "../prompts";

export async function handleInvestment(ctx: HandlerContext): Promise<AskEngineResponse> {
  const filters = entitiesToFilters(ctx.classification.entities);
  filters.investment = true;
  const baseFields = classificationToResponseFields(ctx.classification);

  logAsk({
    event: "supabase_query_start",
    intent: "INVESTMENT",
    filters,
  });

  const focus = ctx.classification.entities.investmentFocus;
  const result = await searchPropertiesFromIntent(filters);
  let listings = result.listings;

  if (focus === "yield") {
    listings = sortAskListings(listings, "rentalYield", "desc");
  } else {
    listings = sortAskListings(listings, "growthScore", "desc");
  }

  logAsk({
    event: "supabase_query_complete",
    intent: "INVESTMENT",
    returnedCount: listings.length,
    isSimilar: result.isSimilar,
  });

  const listingsContext = listings.length > 0 ? buildListingsContext(listings) : undefined;

  const answer = await generateAreaIQResponse(INVESTMENT_PROMPT, ctx.message, {
    history: ctx.history,
    listingsContext,
  });

  if (listings.length === 0) {
    return {
      intent: "INVESTMENT",
      answer: `${answer}\n\n${NO_MATCHING_PROPERTIES_MESSAGE}`,
      ...baseFields,
      properties: [],
      suggestions: [],
      followUpQuestions: [
        "Best investment under 1 crore",
        "Highest rental yield properties",
        "Tell me about Aerocity",
      ],
      stats: null,
      searchedDatabase: true,
      isSimilar: false,
    };
  }

  return {
    intent: "INVESTMENT",
    answer,
    ...baseFields,
    properties: listings,
    suggestions: ["Higher Rental Yield", "Lowest Price", "Compare these", "Ready to Move"],
    followUpQuestions: [
      "Show cheaper options",
      "Calculate EMI",
      "Compare Aerocity vs New Chandigarh",
    ],
    stats: computeSearchStats(listings),
    searchedDatabase: true,
    isSimilar: result.isSimilar,
  };
}
