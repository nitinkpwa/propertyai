/**
 * Data-backed Ask fallback — live AreaIQ inventory when the LLM is offline.
 * Never invents listings, prices, or scores.
 */

import type { ConversationMessage } from "../types";
import { detectConversationLanguage } from "../language";
import { computeSearchStats } from "../responses";
import {
  gatherIntelligenceBundle,
  type GatherIntelligenceOptions,
} from "../intelligence/pipeline";
import { extractPropertyRationales } from "../markdown";
import { parseIntentFromText } from "../intelligence/intent/parser";
import { AI_REASONING_UNAVAILABLE_NOTICE } from "./prompts";
import { logAsk } from "./logger";
import type {
  AskEngineResponse,
  IntentClassification,
  IntentEntities,
} from "./types";
import { EMPTY_ENTITIES } from "./types";
import {
  buildRichDataAnswer,
  intelligenceDigestFromBundle,
} from "./dataAnswer";

export {
  buildRichDataAnswer,
  intelligenceDigestFromBundle,
  type IntelligenceDigest,
} from "./dataAnswer";

/**
 * Rules-only intent when the OpenAI classifier is down.
 */
export function classificationFromRules(message: string): IntentClassification {
  const intent = parseIntentFromText(message);
  const budget = intent.budgetMax;
  const hasCompare = /vs\.?|versus|compare/i.test(message);
  const hasBuilder =
    Boolean(intent.builder) || /\bbuilder\b|\bdeveloper\b/i.test(message);
  const hasFinance = /\bemi\b|\bloan\b|\binterest\b|\bdown\s*payment\b/i.test(
    message,
  );
  const hasInvestment =
    intent.investment ||
    intent.rentalFocus ||
    /\binvest|\byield|\broi\b|\bappreciation\b/i.test(message);

  let engineIntent: IntentClassification["intent"] = "PROPERTY_SEARCH";
  if (hasCompare) engineIntent = "COMPARE";
  else if (hasFinance) engineIntent = "FINANCE";
  else if (hasBuilder && !intent.bedrooms && !budget) engineIntent = "BUILDER";
  else if (hasInvestment) engineIntent = "INVESTMENT";
  else if (intent.locality && !intent.bedrooms && !budget)
    engineIntent = "LOCALITY";

  const entities: IntentEntities = {
    ...EMPTY_ENTITIES,
    bhk: intent.bedrooms,
    maxPriceLakhs:
      budget != null && budget < 10_000_000 ? budget / 100_000 : null,
    maxPriceCrore:
      budget != null && budget >= 10_000_000 ? budget / 10_000_000 : null,
    city: intent.city,
    locality: intent.locality,
    builder: intent.builder,
    investmentFocus: intent.investment
      ? intent.rentalFocus
        ? "yield"
        : "general"
      : null,
  };

  return {
    intent: engineIntent,
    confidence: Math.max(0.55, intent.confidence),
    entities,
    reasoning: "Rules fallback — OpenAI classifier unavailable",
    location: intent.locality ?? intent.city,
    builder: intent.builder,
    budget,
    bedrooms: intent.bedrooms,
    propertyName: intent.project,
    compareTargets: [],
    investmentPurpose: intent.investment
      ? intent.rentalFocus
        ? "rental"
        : "appreciation"
      : null,
  };
}

export async function respondWithDataFallback(
  message: string,
  history: ConversationMessage[] = [],
  options: Omit<GatherIntelligenceOptions, "message" | "history"> = {},
): Promise<AskEngineResponse> {
  const started = Date.now();
  logAsk({
    event: "data_fallback_start",
    userMessage: message,
    reason: "ai_unavailable",
  });

  try {
    const { bundle, listings, isSimilar } = await gatherIntelligenceBundle({
      message,
      history,
      ...options,
    });

    const language = detectConversationLanguage(message, history);
    const answer = buildRichDataAnswer(bundle, language);
    const digest = intelligenceDigestFromBundle(bundle);
    const rows = bundle.search.noExactMatch
      ? bundle.search.alternatives
      : bundle.search.exact;
    const byName = extractPropertyRationales(
      answer,
      rows.map((r) => r.listing.name),
    );
    const propertyRationales: Record<string, string> = {};
    for (const row of rows) {
      if (byName[row.listing.name]) {
        propertyRationales[row.listing.id] = byName[row.listing.name];
      } else if (row.matchReasons.length) {
        propertyRationales[row.listing.id] = row.matchReasons
          .slice(0, 2)
          .join(" · ");
      }
    }

    logAsk({
      event: "data_fallback_complete",
      latencyMs: Date.now() - started,
      listings: listings.length,
      digest,
      supabaseQuery: true,
    });

    return {
      intent:
        bundle.intent.investment || bundle.intent.rentalFocus
          ? "INVESTMENT"
          : "PROPERTY_SEARCH",
      answer,
      location: bundle.intent.locality ?? bundle.intent.city,
      builder: bundle.intent.builder,
      budget: bundle.intent.budgetMax,
      bedrooms: bundle.intent.bedrooms,
      properties: listings,
      propertyRationales,
      suggestions: [
        "Show cheaper options",
        "Ready to Move",
        "Compare these",
        "Calculate EMI",
      ],
      followUpQuestions: [
        "Narrow by locality",
        "Tell me about the area",
        "Show similar builders",
      ],
      stats: listings.length ? computeSearchStats(listings) : null,
      searchedDatabase: true,
      isSimilar,
      intelligenceLevel: "partial",
      confidenceOverall: bundle.confidenceScore,
      missingSignals: ["AI narrative reasoning"],
      aiDegraded: true,
      aiNotice: AI_REASONING_UNAVAILABLE_NOTICE,
      intelligenceDigest: digest,
    };
  } catch (error) {
    logAsk({
      event: "data_fallback_error",
      level: "error",
      error: error instanceof Error ? error.message : String(error),
      supabaseQuery: true,
      latencyMs: Date.now() - started,
    });

    return {
      intent: "PROPERTY_SEARCH",
      answer: [
        "AreaIQ is still searching verified inventory for you.",
        "",
        "Live listings, builders, and market signals remain available — try refining budget, BHK, or locality.",
      ].join("\n"),
      location: null,
      builder: null,
      budget: null,
      bedrooms: null,
      properties: [],
      propertyRationales: {},
      suggestions: ["3 BHK in Mohali", "Under 80 lakh", "Aerocity projects"],
      followUpQuestions: ["Show verified listings", "Best areas under 1 Cr"],
      stats: null,
      searchedDatabase: true,
      isSimilar: false,
      intelligenceLevel: "partial",
      aiDegraded: true,
      aiNotice: AI_REASONING_UNAVAILABLE_NOTICE,
      intelligenceDigest: {
        listingsSearched: 0,
        buildersChecked: 0,
        marketSignalsAnalyzed: 0,
      },
      missingSignals: ["AI narrative reasoning", "Matched listings"],
    };
  }
}
