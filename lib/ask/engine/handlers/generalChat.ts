import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { generateAreaIQResponse, GENERAL_CHAT_PROMPT } from "../openai";

export async function handleGeneralChat(ctx: HandlerContext): Promise<AskEngineResponse> {
  const answer = await generateAreaIQResponse(GENERAL_CHAT_PROMPT, ctx.message, {
    history: ctx.history,
  });

  return {
    intent: "GENERAL_CHAT",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    propertyRationales: {},
    suggestions: [],
    followUpQuestions: [
      "3 BHK in Mohali",
      "Where should I invest 80 lakh?",
      "Tell me about Aerocity",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
