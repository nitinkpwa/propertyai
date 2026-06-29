import { searchPropertiesByBuilder } from "../../search";
import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { resolveBuilderName } from "../classifier";
import { logAsk } from "../logger";
import { buildListingsContext, generateAreaIQResponse, BUILDER_PROMPT } from "../openai";

export async function handleBuilder(ctx: HandlerContext): Promise<AskEngineResponse> {
  const builderName = resolveBuilderName(ctx.classification);
  const baseFields = classificationToResponseFields(ctx.classification);

  const answer = await generateAreaIQResponse(
    BUILDER_PROMPT,
    ctx.message,
    { history: ctx.history },
  );

  if (!builderName) {
    return {
      intent: "BUILDER",
      answer,
      ...baseFields,
      properties: [],
      suggestions: [],
      followUpQuestions: [
        "Is DLF a good builder?",
        "Tell me about Omaxe",
        "Show properties in Mohali",
      ],
      stats: null,
      searchedDatabase: false,
      isSimilar: false,
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

  if (listings.length === 0) {
    return {
      intent: "BUILDER",
      answer,
      ...baseFields,
      builder: builderName,
      properties: [],
      suggestions: [],
      followUpQuestions: [
        "Show properties in Mohali",
        "Compare DLF vs SBP",
        "Best builders in Tricity",
      ],
      stats: null,
      searchedDatabase: true,
      isSimilar: false,
    };
  }

  const enrichedAnswer = await generateAreaIQResponse(BUILDER_PROMPT, ctx.message, {
    history: ctx.history,
    listingsContext: buildListingsContext(listings),
  });

  return {
    intent: "BUILDER",
    answer: enrichedAnswer,
    ...baseFields,
    builder: builderName,
    properties: listings,
    suggestions: ["Compare these", "Lowest Price", "Ready to Move"],
    followUpQuestions: [
      "Compare with other builders",
      "Show cheaper options",
      "Highest rental yield",
    ],
    stats: null,
    searchedDatabase: true,
    isSimilar: false,
  };
}
