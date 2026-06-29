import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { generateUnknownClarification } from "../openai";

export async function handleUnknown(ctx: HandlerContext): Promise<AskEngineResponse> {
  const answer = await generateUnknownClarification(ctx.message, ctx.history);

  return {
    intent: "UNKNOWN",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    suggestions: [],
    followUpQuestions: [
      "3 BHK under 80 lakh in Mohali",
      "Tell me about Aerocity",
      "What is RERA?",
      "Best investment under 1 crore",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
