import { searchPropertiesByLocality } from "../../search";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { resolveLocalitySearchTerm } from "../classifier";
import { buildMemoryContext } from "../memory";
import { logAsk } from "../logger";
import { buildListingsContext, generateAreaIQResponse, LOCALITY_PROMPT } from "../openai";

export async function handleLocality(ctx: HandlerContext): Promise<AskEngineResponse> {
  const baseFields = classificationToResponseFields(ctx.classification);
  const searchTerm = resolveLocalitySearchTerm(ctx.classification);
  const memoryContext = buildMemoryContext(ctx.classification);

  if (!searchTerm) {
    const answer = await generateAreaIQResponse(LOCALITY_PROMPT, ctx.message, {
      history: ctx.history,
      memoryContext,
    });

    return {
      intent: "LOCALITY",
      answer,
      ...baseFields,
      properties: [],
      propertyRationales: {},
      suggestions: [],
      followUpQuestions: [
        "Compare Aerocity vs New Chandigarh",
        "Is Zirakpur good for investment?",
        "Show flats in Mohali",
      ],
      stats: null,
      searchedDatabase: false,
      isSimilar: false,
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

  return {
    intent: "LOCALITY",
    answer,
    ...baseFields,
    properties: listings,
    propertyRationales: {},
    suggestions: listings.length > 0 ? ["Compare these", "Higher Rental Yield", "Ready to Move"] : [],
    followUpQuestions: [
      `Show properties in ${searchTerm}`,
      "Best investment under 1 crore",
      "Compare with nearby areas",
    ],
    stats: null,
    searchedDatabase: true,
    isSimilar: result.isSimilar,
  };
}
