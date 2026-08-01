import type { ConversationMessage } from "../types";
import type { IntentClassification } from "../engine/types";
import { logAsk } from "../engine/logger";
import { getAreaIntelligence } from "./area/service";
import { getBuilderIntelligence } from "./builder/service";
import { composeIntelligenceAnswer } from "./composer/compose";
import {
  mergeClassifierIntoIntent,
  parseIntentFromText,
} from "./intent/parser";
import { computeInvestmentIntelligence } from "./investment/service";
import { isModuleActive } from "./modules/registry";
import { executeStructuredSearch } from "./search/structuredSearch";
import type { ComposedAnswer, IntelligenceBundle, StructuredIntent } from "./types";

export interface GatherIntelligenceOptions {
  message: string;
  history?: ConversationMessage[];
  classification?: IntentClassification | null;
  excludePropertyIds?: string[];
}

export type RunIntelligenceOptions = GatherIntelligenceOptions;

export interface GatheredIntelligence {
  intent: StructuredIntent;
  bundle: IntelligenceBundle;
  listings: IntelligenceBundle["search"]["exact"][number]["listing"][];
  isSimilar: boolean;
  searchedDatabase: boolean;
}

export interface IntelligencePipelineResult extends GatheredIntelligence {
  composed: ComposedAnswer;
}

/**
 * Gather live AreaIQ data without calling the LLM.
 * Used by the full pipeline and by offline data fallback.
 */
export async function gatherIntelligenceBundle(
  options: GatherIntelligenceOptions,
): Promise<GatheredIntelligence> {
  const { message, classification = null, excludePropertyIds } = options;
  const searchStarted = Date.now();

  // STEP 1 — Intent Detection (rules first, classifier merge second)
  let intent = parseIntentFromText(message);
  if (classification) {
    intent = mergeClassifierIntoIntent(intent, classification);
  }

  logAsk({
    event: "intelligence_intent_parsed",
    intent: {
      bedrooms: intent.bedrooms,
      budgetMax: intent.budgetMax,
      city: intent.city,
      locality: intent.locality,
      propertyType: intent.propertyType,
      style: intent.intentStyle,
      resolvedPlace: intent.resolvedPlace?.displayName ?? null,
      expandedLocations: intent.expandedLocations?.slice(0, 12) ?? [],
    },
  });

  // STEP 2–3 — Location Intelligence search + labeled fallback
  const search = await executeStructuredSearch(intent, excludePropertyIds);

  logAsk({
    event: "intelligence_search_complete",
    supabaseQuery: true,
    latencyMs: Date.now() - searchStarted,
    exactCount: search.exactCount,
    alternatives: search.alternatives.length,
    noExactMatch: search.noExactMatch,
    locationReport: search.locationReport
      ? {
          query: search.locationReport.query,
          expandedLocations: search.locationReport.expandedLocations.slice(0, 16),
          matchedCount: search.locationReport.matchedCount,
          top: search.locationReport.properties.slice(0, 8).map((p) => ({
            title: p.title,
            location: p.locationLabel,
            matchScore: p.matchScore,
            distanceKm: p.distanceKm,
            distanceScore: p.distanceScore,
            finalRankingScore: p.finalRankingScore,
            tier: p.tier,
          })),
        }
      : null,
  });

  const displayListings = (
    search.noExactMatch ? search.alternatives : search.exact
  ).map((r) => r.listing);

  // STEP 4 — Area Intelligence
  const area = isModuleActive("area")
    ? await getAreaIntelligence(intent.locality, intent.city)
    : null;

  // STEP 5 — Builder Intelligence
  const builder = isModuleActive("builder")
    ? await getBuilderIntelligence(intent.builder, displayListings)
    : null;

  // STEP 6 — Investment Intelligence
  const investment = isModuleActive("investment")
    ? computeInvestmentIntelligence(displayListings, intent)
    : null;

  const sources = ["Verified Property Database"];
  if (area?.source === "database") sources.push("Verified Area Database");
  if (builder?.source === "database") sources.push("Verified Builder Database");

  const confidenceScore = Math.round(
    Math.min(
      95,
      intent.confidence * 100 * 0.45 +
        (search.exactCount > 0 ? 40 : search.alternatives.length > 0 ? 20 : 5) +
        (area?.source === "database" ? 8 : 0) +
        (builder?.source === "database" ? 7 : 0),
    ),
  );

  const bundle: IntelligenceBundle = {
    userQuery: message,
    intent,
    search,
    area,
    builder,
    investment,
    confidenceScore,
    sources,
  };

  return {
    intent,
    bundle,
    listings: displayListings,
    isSimilar: search.noExactMatch && search.alternatives.length > 0,
    searchedDatabase: true,
  };
}

/**
 * AreaIQ Intelligence Engine pipeline.
 * Intent → Structured SQL → Ranking → Knowledge modules → Answer Composer.
 * The LLM never invents recommendations.
 */
export async function runIntelligencePipeline(
  options: RunIntelligenceOptions,
): Promise<IntelligencePipelineResult> {
  const { history = [] } = options;
  const gathered = await gatherIntelligenceBundle(options);

  // STEP 7 — Answer Composer (LLM writes; falls back to live data if offline)
  const composed = await composeIntelligenceAnswer(gathered.bundle, history);

  return {
    ...gathered,
    composed,
  };
}
