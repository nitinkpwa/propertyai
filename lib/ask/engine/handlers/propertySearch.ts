import { computeSearchStats } from "../../responses";
import { searchPropertiesFromIntent } from "../../search";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { entitiesToFilters } from "../classifier";
import { buildMemoryContext, buildPropertyMemoryContext, wantsAlternativeProperties } from "../memory";
import { logAsk } from "../logger";
import {
  buildListingsContext,
  extractPropertyRationales,
  generatePropertySearchSummary,
} from "../openai";
import { NO_EXACT_MATCH_MESSAGE } from "../prompts";

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
  "Calculate EMI",
];

function mapRationalesToIds(
  listings: Array<{ id: string; name: string }>,
  answer: string,
): Record<string, string> {
  const byName = extractPropertyRationales(
    answer,
    listings.map((l) => l.name),
  );
  const result: Record<string, string> = {};
  for (const listing of listings) {
    if (byName[listing.name]) {
      result[listing.id] = byName[listing.name];
    }
  }
  return result;
}

export async function handlePropertySearch(
  ctx: HandlerContext,
): Promise<AskEngineResponse> {
  const filters = entitiesToFilters(ctx.classification.entities);
  const memoryContext = buildMemoryContext(ctx.classification);
  const wantsAlternative = wantsAlternativeProperties(ctx.message);
  if (wantsAlternative && ctx.excludePropertyIds?.length) {
    filters.excludePropertyIds = ctx.excludePropertyIds;
  }
  const propertyMemoryContext = buildPropertyMemoryContext(
    ctx.excludePropertyIds ?? [],
    wantsAlternative,
  );

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
      answer: `${NO_EXACT_MATCH_MESSAGE}\n\nTry adjusting your budget, BHK, or area. I can also analyze a specific locality or suggest investment options.`,
      ...baseFields,
      properties: [],
      propertyRationales: {},
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
    memoryContext + propertyMemoryContext,
  );

  let answer = aiSummary;
  if (result.isSimilar) {
    answer = `${NO_EXACT_MATCH_MESSAGE}\n\nHere are the closest matching properties from our database:\n\n${aiSummary}`;
  }

  return {
    intent: "PROPERTY_SEARCH",
    answer,
    ...baseFields,
    properties: listings,
    propertyRationales: mapRationalesToIds(listings, answer),
    suggestions: SEARCH_SUGGESTIONS,
    followUpQuestions: SEARCH_FOLLOW_UPS,
    stats: computeSearchStats(listings),
    searchedDatabase: true,
    isSimilar: result.isSimilar,
  };
}
