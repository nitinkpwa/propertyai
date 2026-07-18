import { computeSearchStats } from "../../responses";
import { searchPropertiesFromIntent } from "../../search";
import { sortAskListings } from "../../sort";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { entitiesToFilters } from "../classifier";
import { buildMemoryContext, buildPropertyMemoryContext, wantsAlternativeProperties } from "../memory";
import { logAsk } from "../logger";
import { extractPropertyRationales } from "../../markdown";
import {
  buildListingsContext,
  generateAreaIQResponse,
  INVESTMENT_PROMPT,
} from "../openai";
import { NO_EXACT_MATCH_MESSAGE } from "../prompts";

export async function handleInvestment(ctx: HandlerContext): Promise<AskEngineResponse> {
  const filters = entitiesToFilters(ctx.classification.entities);
  filters.investment = true;
  const baseFields = classificationToResponseFields(ctx.classification);
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

  let userMessage = ctx.message;
  if (result.isSimilar && listings.length > 0) {
    userMessage = `${ctx.message}\n\nNote: No exact budget/area match. Closest alternatives from database are provided.`;
  }

  const answer = await generateAreaIQResponse(INVESTMENT_PROMPT, userMessage, {
    history: ctx.history,
    memoryContext: memoryContext + propertyMemoryContext,
    listingsContext,
  });

  const propertyRationales: Record<string, string> = {};
  const byName = extractPropertyRationales(
    answer,
    listings.map((l) => l.name),
  );
  for (const listing of listings) {
    if (byName[listing.name]) {
      propertyRationales[listing.id] = byName[listing.name];
    }
  }

  if (listings.length === 0) {
    return {
      intent: "INVESTMENT",
      answer: `${answer}\n\n${NO_EXACT_MATCH_MESSAGE}`,
      ...baseFields,
      properties: [],
      propertyRationales: {},
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

  const finalAnswer = result.isSimilar
    ? `${NO_EXACT_MATCH_MESSAGE}\n\n${answer}`
    : answer;

  return {
    intent: "INVESTMENT",
    answer: finalAnswer,
    ...baseFields,
    properties: listings,
    propertyRationales,
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
