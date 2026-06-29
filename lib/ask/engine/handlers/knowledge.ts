import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { generateAreaIQResponse, KNOWLEDGE_PROMPT } from "../openai";

export async function handleKnowledge(ctx: HandlerContext): Promise<AskEngineResponse> {
  const answer = await generateAreaIQResponse(KNOWLEDGE_PROMPT, ctx.message, {
    history: ctx.history,
  });

  return {
    intent: "KNOWLEDGE",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    suggestions: [],
    followUpQuestions: [
      "What is RERA?",
      "Freehold vs Leasehold?",
      "Tell me about Aerocity",
      "3 BHK in Mohali",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
