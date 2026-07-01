import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { buildMemoryContext } from "../memory";
import { generateAreaIQResponse, MARKET_TREND_PROMPT } from "../openai";

export async function handleMarketTrend(ctx: HandlerContext): Promise<AskEngineResponse> {
  const memoryContext = buildMemoryContext(ctx.classification);

  const answer = await generateAreaIQResponse(MARKET_TREND_PROMPT, ctx.message, {
    history: ctx.history,
    memoryContext,
    maxTokens: 1800,
  });

  return {
    intent: "MARKET_TREND",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    propertyRationales: {},
    suggestions: [],
    followUpQuestions: [
      "Where should I invest 80 lakh?",
      "Tell me about Aerocity",
      "Compare Mohali vs Zirakpur",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
