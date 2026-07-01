import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { buildMemoryContext } from "../memory";
import { generateUnknownClarification } from "../openai";

export async function handleUnknown(ctx: HandlerContext): Promise<AskEngineResponse> {
  const memoryContext = buildMemoryContext(ctx.classification);

  const answer = await generateUnknownClarification(
    ctx.message,
    ctx.history,
    memoryContext,
  );

  return {
    intent: "UNKNOWN",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    propertyRationales: {},
    suggestions: [],
    followUpQuestions: [
      "3 BHK under 80 lakh in Mohali",
      "Tell me about Aerocity",
      "Where should I invest 80 lakh?",
      "Compare Aerocity vs New Chandigarh",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
