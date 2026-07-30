import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { buildMemoryContext } from "../memory";
import { generateAreaIQResponse, SELLING_PROMPT } from "../openai";

export async function handleSelling(ctx: HandlerContext): Promise<AskEngineResponse> {
  const memoryContext = buildMemoryContext(ctx.classification, ctx.propertyContext);

  const answer = await generateAreaIQResponse(SELLING_PROMPT, ctx.message, {
    history: ctx.history,
    memoryContext,
  });

  return {
    intent: "SELLING",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    propertyRationales: {},
    suggestions: [],
    followUpQuestions: [
      "What is the current market trend?",
      "How to price my property?",
      "Tell me about my area",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
