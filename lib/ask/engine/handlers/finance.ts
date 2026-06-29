import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import { generateAreaIQResponse, FINANCE_PROMPT } from "../openai";

export async function handleFinance(ctx: HandlerContext): Promise<AskEngineResponse> {
  const answer = await generateAreaIQResponse(FINANCE_PROMPT, ctx.message, {
    history: ctx.history,
  });

  return {
    intent: "FINANCE",
    answer,
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    suggestions: [],
    followUpQuestions: [
      "Calculate EMI for 80 lakh property",
      "Home loan eligibility",
      "Best investment under 1 crore",
    ],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
