/**
 * Default scoring weights — admin can override via scoring_weights table.
 * Relative weights are normalized at runtime so they always sum to 100.
 *
 * Spec listed AreaIQ factors totaling 110; we keep relative intent and normalize.
 */

export const SCORING_ENGINE_VERSION = "1.1.0";

/** AreaIQ weights — sum to 100 for transparent admin audit (earned/max). */
export const AREAIQ_DEFAULT_WEIGHTS = {
  locationQuality: 20,
  builderReputation: 15,
  constructionQuality: 8,
  priceFairness: 15,
  connectivity: 10,
  amenities: 8,
  legalVerification: 15,
  demand: 4,
  futureInfrastructure: 5,
  livability: 0, // folded into location/amenities when present; kept for override compat
} as const;

export const INVESTMENT_DEFAULT_WEIGHTS = {
  capitalAppreciation: 14,
  rentalYield: 12,
  entryPrice: 12,
  exitPotential: 10,
  supplyVsDemand: 10,
  infrastructureGrowth: 10,
  liquidity: 8,
  builderReliability: 10,
  marketTrend: 8,
  risk: 6,
} as const;

/** Legal document weights — litigation is a penalty factor (scored inverted) */
export const LEGAL_DEFAULT_WEIGHTS = {
  rera: 18,
  registry: 12,
  ownership: 12,
  approvedMaps: 10,
  noc: 10,
  occupationCertificate: 10,
  bankApproval: 8,
  titleClear: 12,
  encumbrance: 8,
  litigation: 0, // applied as penalty, not additive weight
} as const;

export const BUILDER_DEFAULT_WEIGHTS = {
  projectsDelivered: 15,
  deliveryDelays: 15,
  customerRating: 15,
  quality: 12,
  legalHistory: 12,
  completionPercent: 10,
  financialStability: 11,
  completedProjects: 5,
  underConstruction: 5,
} as const;

export const LOCATION_DEFAULT_WEIGHTS = {
  schools: 12,
  hospitals: 12,
  highways: 10,
  metro: 14,
  airport: 8,
  itParks: 12,
  demand: 12,
  safety: 10,
  futureDevelopment: 10,
} as const;

export type WeightMap = Record<string, number>;

export function mergeWeights<T extends WeightMap>(
  defaults: T,
  overrides?: Partial<T> | null,
): T {
  if (!overrides) return { ...defaults };
  const merged = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      (merged as WeightMap)[key] = value;
    }
  }
  return merged;
}
