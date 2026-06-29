import { computeSearchStats } from "../../responses";
import { searchPropertiesFromIntent } from "../../search";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { entitiesToFilters } from "../classifier";
import { logAsk } from "../logger";
import { buildListingsContext, generatePropertySearchSummary } from "../openai";
import { NO_MATCHING_PROPERTIES_MESSAGE } from "../prompts";

const SEARCH_SUGGESTIONS = [
  "Compare these",
  "Ready to Move",
  "Higher Rental Yield",
  "Lowest Price",
  "Investment Only",
];

const SEARCH_FOLLOW_UPS = [
  "Show cheaper options",
  "Show nearby projects",
  "Ready to move",
  "Rental properties",
];

export async function handlePropertySearch(
  ctx: HandlerContext,
): Promise<AskEngineResponse> {
  const filters = entitiesToFilters(ctx.classification.entities);

  logAsk({
    event: "supabase_query_start",
    intent: "PROPERTY_SEARCH",
    filters,
  });

  const result = await searchPropertiesFromIntent(filters);
  const listings = result.listings;

  logAsk({
    event: "supabase_query_complete",
    intent: "PROPERTY_SEARCH",
    exactCount: result.totalExact,
    returnedCount: listings.length,
    isSimilar: result.isSimilar,
  });

  const baseFields = classificationToResponseFields(ctx.classification);

  if (listings.length === 0) {
    return {
      intent: "PROPERTY_SEARCH",
      answer: NO_MATCHING_PROPERTIES_MESSAGE,
      ...baseFields,
      properties: [],
      suggestions: [],
      followUpQuestions: [
        "Show properties in Mohali",
        "Flats under 1 crore",
        "Tell me about Aerocity",
      ],
      stats: null,
      searchedDatabase: true,
      isSimilar: false,
    };
  }

  const listingsContext = buildListingsContext(listings);
  const aiSummary = await generatePropertySearchSummary(
    ctx.message,
    listingsContext,
    !result.isSimilar,
    ctx.history,
  );

  let answer = aiSummary;
  if (result.isSimilar) {
    answer = `${NO_MATCHING_PROPERTIES_MESSAGE} Here are the closest matching properties from our database:\n\n${aiSummary}`;
  }

  return {
    intent: "PROPERTY_SEARCH",
    answer,
    ...baseFields,
    properties: listings,
    suggestions: SEARCH_SUGGESTIONS,
    followUpQuestions: SEARCH_FOLLOW_UPS,
    stats: computeSearchStats(listings),
    searchedDatabase: true,
    isSimilar: result.isSimilar,
  };
}
