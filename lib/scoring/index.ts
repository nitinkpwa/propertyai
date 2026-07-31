/**
 * AreaIQ Property Intelligence Scoring Engine (V1.0)
 *
 * Public API — import from `@/lib/scoring`.
 */

export { calculateAreaIQScore } from "./areaiq-score";
export { calculateInvestmentScore } from "./investment-score";
export { calculateLegalScore } from "./legal-score";
export { calculateBuilderScore } from "./builder-score";
export { calculateLocationScore } from "./location-score";
export { calculatePriceFairness } from "./price-fairness";
export {
  runPropertyIntelligenceScoring,
  toPropertyCardScores,
  scorePropertyCardFromListing,
  buildAdminBreakdown,
  insufficientCardMessage,
  type ScoringPropertyContext,
} from "./engine";
export {
  clampScore,
  weightedAverage,
  calculateFactorConfidence,
  areaIqLabel,
  investmentLabel,
  legalLabel,
  scoreToneFromValue,
  SCORE_TONE_COLORS,
  CONFIDENCE_TOOLTIP,
  MIN_WEIGHTED_COVERAGE,
  buildExplanation,
  normalizeWeights,
} from "./score-utils";
export {
  SCORING_ENGINE_VERSION,
  AREAIQ_DEFAULT_WEIGHTS,
  INVESTMENT_DEFAULT_WEIGHTS,
  LEGAL_DEFAULT_WEIGHTS,
  BUILDER_DEFAULT_WEIGHTS,
  LOCATION_DEFAULT_WEIGHTS,
  mergeWeights,
} from "./weights";
export {
  legalFlagsToDocuments,
  amenitiesToScore,
  nearbyToConnectivityScore,
  nearbyToLocationParts,
  rentalYieldToScore,
  growthToAppreciationScore,
  priceDiffToEntryScore,
  locationFromListingMeta,
  builderFromName,
  priceFromListingDocumented,
  constructionFromConfiguration,
  mediaCompletenessScore,
} from "./derive-factors";
export {
  normalizeAreaIQDisplayScore,
  areaIqLabelV2,
  factorPoints,
} from "./normalize";
export type * from "./types";
