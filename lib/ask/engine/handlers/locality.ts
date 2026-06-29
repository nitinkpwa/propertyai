import { searchPropertiesByLocality } from "../../search";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { resolveLocalitySearchTerm } from "../classifier";
import { logAsk } from "../logger";
import { buildListingsContext, generateAreaIQResponse, LOCALITY_PROMPT } from "../openai";

export async function handleLocality(ctx: HandlerContext): Promise<AskEngineResponse> {
  const baseFields = classificationToResponseFields(ctx.classification);
  const searchTerm = resolveLocalitySearchTerm(ctx.classification);

  const answer = await generateAreaIQResponse(LOCALITY_PROMPT, ctx.message, {
    history: ctx.history,
  });

  if (!searchTerm) {
    return {
      intent: "LOCALITY",
      answer,
      ...baseFields,
      properties: [],
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

  if (listings.length === 0) {
    return {
      intent: "LOCALITY",
      answer,
      ...baseFields,
      properties: [],
      suggestions: [],
      followUpQuestions: [
        `Show properties in ${searchTerm}`,
        "Best investment under 1 crore",
        "Compare Mohali vs Zirakpur",
      ],
      stats: null,
      searchedDatabase: true,
      isSimilar: false,
    };
  }

  const enrichedAnswer = await generateAreaIQResponse(LOCALITY_PROMPT, ctx.message, {
    history: ctx.history,
    listingsContext: buildListingsContext(listings),
  });

  return {
    intent: "LOCALITY",
    answer: enrichedAnswer,
    ...baseFields,
    properties: listings,
    suggestions: ["Compare these", "Higher Rental Yield", "Ready to Move"],
    followUpQuestions: [
      "Show cheaper options",
      "Best investment in this area",
      "Compare with nearby areas",
    ],
    stats: null,
    searchedDatabase: true,
    isSimilar: result.isSimilar,
  };
}
