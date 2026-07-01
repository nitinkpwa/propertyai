import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { buildMemoryContext } from "../memory";
import { generateAreaIQResponse, KNOWLEDGE_PROMPT } from "../openai";

export async function handleKnowledge(ctx: HandlerContext): Promise<AskEngineResponse> {
  const memoryContext = buildMemoryContext(ctx.classification);

  const answer = await generateAreaIQResponse(KNOWLEDGE_PROMPT, ctx.message, {
    history: ctx.history,
    memoryContext,
  });

  return {
    intent: "KNOWLEDGE",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    propertyRationales: {},
    suggestions: [],
    followUpQuestions: [
      "What is RERA?",
      "Should I buy under construction?",
      "Tell me about Aerocity",
      "3 BHK in Mohali",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
