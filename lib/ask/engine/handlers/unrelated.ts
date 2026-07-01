import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { generateAreaIQResponse, UNRELATED_PROMPT } from "../openai";

export async function handleUnrelated(ctx: HandlerContext): Promise<AskEngineResponse> {
  const answer = await generateAreaIQResponse(UNRELATED_PROMPT, ctx.message, {
    history: ctx.history,
  });

  return {
    intent: "UNRELATED",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    propertyRationales: {},
    suggestions: [],
    followUpQuestions: [
      "3 BHK under 80 lakh in Mohali",
      "Tell me about Aerocity",
      "Where should I invest 80 lakh?",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
