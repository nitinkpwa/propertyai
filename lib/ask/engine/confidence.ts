/**
 * AreaIQ Confidence Engine — refuse to guess when evidence is thin.
 */

import type { AskEngineResponse, HandlerContext, IntentClassification } from "./types";
import { classificationToResponseFields } from "./types";

export type ConfidenceBreakdown = {
  property: number;
  builder: number;
  market: number;
  document: number;
  location: number;
  overall: number;
};

const THRESHOLD = 42;

export function assessConfidence(
  classification: IntentClassification,
  extras?: {
    propertyCount?: number;
    hasPropertyContext?: boolean;
    hasBuilderData?: boolean;
    pipelineConfidence?: number | null;
    hasAnalytics?: boolean;
  },
): ConfidenceBreakdown {
  const loc =
    classification.location ||
    classification.entities.city ||
    classification.entities.locality
      ? 78
      : 35;
  const builder = classification.builder || extras?.hasBuilderData ? 72 : 40;
  const property =
    extras?.hasPropertyContext
      ? 88
      : (extras?.propertyCount ?? 0) > 0
        ? Math.min(92, 55 + (extras?.propertyCount ?? 0) * 8)
        : classification.intent === "PROPERTY_SEARCH"
          ? 28
          : 45;
  const document = extras?.hasAnalytics ? 75 : 38;
  // Market / locality / finance answers invent easily without listing analytics.
  const marketHeavy =
    classification.intent === "MARKET_TREND" ||
    classification.intent === "INVESTMENT" ||
    classification.intent === "LOCALITY" ||
    classification.intent === "FINANCE";
  const market = marketHeavy
    ? extras?.hasAnalytics
      ? 72
      : loc >= 60
        ? 24
        : 18
    : loc >= 60
      ? 65
      : 48;

  let overall = Math.round(
    property * 0.28 + builder * 0.18 + market * 0.22 + document * 0.12 + loc * 0.2,
  );

  // Without listing analytics, market-heavy intents stay below the refuse threshold.
  if (marketHeavy && !extras?.hasAnalytics) {
    overall = Math.min(overall, THRESHOLD - 1);
  }

  if (typeof extras?.pipelineConfidence === "number") {
    overall = Math.round(overall * 0.45 + extras.pipelineConfidence * 0.55);
  }

  // Classifier uncertainty pulls overall down
  if (classification.confidence < 0.5) {
    overall = Math.min(overall, Math.round(classification.confidence * 100));
  }

  return {
    property: clamp(property),
    builder: clamp(builder),
    market: clamp(market),
    document: clamp(document),
    location: clamp(loc),
    overall: clamp(overall),
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function isBelowConfidenceThreshold(c: ConfidenceBreakdown): boolean {
  return c.overall < THRESHOLD;
}

export function buildLowConfidenceAnswer(c: ConfidenceBreakdown): string {
  const weak: string[] = [];
  if (c.property < THRESHOLD) weak.push("specific verified listings");
  if (c.location < THRESHOLD) weak.push("a clear locality in Tricity");
  if (c.builder < THRESHOLD) weak.push("builder details");
  if (c.market < THRESHOLD) weak.push("market context");
  if (c.document < THRESHOLD) weak.push("document / analytics evidence");

  const focus = weak.slice(0, 2).join(" and ") || "enough verified data";

  return `I'm AreaIQ, your AI Real Estate Advisor.

I don't have enough verified confidence to answer that accurately yet (overall confidence ${c.overall}/100). I'm missing ${focus}.

I won't guess or invent property data.

Try asking something more specific, for example:
• 3 BHK under 80 lakh in Mohali
• Tell me about Aerocity rental yields
• Compare Zirakpur vs New Chandigarh for investment`;
}

export function lowConfidenceResponse(
  ctx: Pick<HandlerContext, "classification">,
  confidence: ConfidenceBreakdown,
): AskEngineResponse {
  return {
    intent: ctx.classification.intent,
    answer: buildLowConfidenceAnswer(confidence),
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

/** Intents that may answer from general RE knowledge without listings. */
export function intentRequiresStrongEvidence(intent: IntentClassification["intent"]): boolean {
  return (
    intent === "PROPERTY_SEARCH" ||
    intent === "PROPERTY_ANALYSIS" ||
    intent === "COMPARE" ||
    intent === "BUILDER" ||
    intent === "INVESTMENT" ||
    intent === "MARKET_TREND" ||
    intent === "LOCALITY" ||
    intent === "FINANCE"
  );
}
