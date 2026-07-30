import type { AskEngineResponse, HandlerContext } from "../types";
import { classificationToResponseFields } from "../types";
import {
  AREA_IQ_DOMAIN_FOLLOW_UPS,
  buildUnrelatedStaticAnswer,
} from "../domainGuard";

/**
 * Off-topic handler — static redirect only.
 * Never calls the LLM (token waste + wrong product positioning).
 */
export async function handleUnrelated(ctx: HandlerContext): Promise<AskEngineResponse> {
  return {
    intent: "UNRELATED",
    answer: buildUnrelatedStaticAnswer(),
    ...classificationToResponseFields(ctx.classification),
    properties: [],
    propertyRationales: {},
    suggestions: [],
    followUpQuestions: [...AREA_IQ_DOMAIN_FOLLOW_UPS.slice(0, 3)],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
