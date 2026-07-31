/**
 * AreaIQ Intelligence Engine
 *
 * Modular real-estate reasoning pipeline.
 * The LLM is used only for answer composition — never for inventing listings.
 * Location matching is powered by `@/lib/location` (Location Intelligence Engine).
 */

export { runIntelligencePipeline } from "./pipeline";
export type { IntelligencePipelineResult, RunIntelligenceOptions } from "./pipeline";
export { parseIntentFromText, mergeClassifierIntoIntent } from "./intent/parser";
export { executeStructuredSearch } from "./search/structuredSearch";
export { listKnowledgeModules } from "./modules/registry";
export type {
  StructuredIntent,
  SearchMatchResult,
  AreaIntelligence,
  BuilderIntelligence,
  InvestmentIntelligence,
  IntelligenceBundle,
} from "./types";

export {
  resolvePlace,
  resolvePlaceFromQuery,
  expandLocations,
  scoreLocationMatch,
  buildLocationSearchReport,
} from "@/lib/location";
