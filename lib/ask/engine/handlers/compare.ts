import { searchPropertiesByLocality, searchPropertiesByName } from "../../search";
import type { ListingProperty } from "@/lib/properties/types";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { buildMemoryContext } from "../memory";
import { logAsk } from "../logger";
import { buildListingsContext, generateAreaIQResponse, COMPARE_PROMPT } from "../openai";

async function fetchCompareListings(targets: string[]) {
  const allListings = [];

  for (const target of targets.slice(0, 3)) {
    logAsk({ event: "supabase_query_start", intent: "COMPARE", target });

    const byName = await searchPropertiesByName(target);
    if (byName.listings.length > 0) {
      allListings.push(...byName.listings.slice(0, 3));
      continue;
    }

    const byLocality = await searchPropertiesByLocality(target);
    allListings.push(...byLocality.listings.slice(0, 3));
  }

  const seen = new Set<string>();
  return allListings.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
}

export async function handleCompare(ctx: HandlerContext): Promise<AskEngineResponse> {
  const baseFields = classificationToResponseFields(ctx.classification);
  const memoryContext = buildMemoryContext(ctx.classification);
  const targets =
    ctx.classification.compareTargets.length > 0
      ? ctx.classification.compareTargets
      : ctx.classification.entities.compareTargets;

  let listingsContext: string | undefined;
  let listings: ListingProperty[] = [];

  if (targets.length >= 2) {
    listings = await fetchCompareListings(targets);
    if (listings.length > 0) {
      listingsContext = buildListingsContext(listings);
    }
  }

  const compareContext =
    targets.length >= 2
      ? `\n\nCOMPARE TARGETS: ${targets.join(" vs ")}`
      : "";

  const answer = await generateAreaIQResponse(
    COMPARE_PROMPT,
    ctx.message,
    {
      history: ctx.history,
      memoryContext,
      listingsContext,
      propertyContext: compareContext,
      maxTokens: 2000,
    },
  );

  return {
    intent: "COMPARE",
    answer,
    ...baseFields,
    properties: listings.slice(0, 6),
    propertyRationales: {},
    suggestions: listings.length > 0 ? ["Compare these", "Higher Rental Yield", "Lowest Price"] : [],
    followUpQuestions: [
      "Show properties in the better option",
      "Calculate EMI",
      "Which has better rental yield?",
    ],
    stats: null,
    searchedDatabase: listings.length > 0,
    isSimilar: false,
  };
}
