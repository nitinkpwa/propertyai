/**
 * AreaIQ Property Intelligence Scoring Engine (V1.0)
 *
 * Deterministic · Transparent · Explainable
 * Not AI-generated. Not random. Same inputs → same scores.
 */

export const INSUFFICIENT_DATA = "Insufficient Data";
export const INSUFFICIENT_DATA_CTA =
  "Complete property verification to generate this score.";

/** Score band labels — AreaIQ overall quality (buyer-facing bands) */
export type AreaIQLabel =
  | "Exceptional"
  | "Excellent"
  | "Very Good"
  | "Good"
  | "Promising"
  | "Average"
  | "Needs Review";

/** Admin-auditable factor line: "Location ........ 18/20" or Pending */
export interface ScoreAuditLine {
  key: string;
  label: string;
  /** Points earned (score/100 × weight); null when pending */
  earned: number | null;
  max: number;
  pending: boolean;
  /** Raw 0–100 factor score when available */
  factorScore: number | null;
}

/** Score band labels — Investment */
export type InvestmentLabel =
  | "Exceptional"
  | "High Growth"
  | "Strong"
  | "Moderate"
  | "Weak Investment";

/** Score band labels — Legal */
export type LegalLabel =
  | "Verified"
  | "Mostly Verified"
  | "Partially Verified"
  | "Needs Verification"
  | "High Risk";

export type PriceFairnessLabel =
  | "Undervalued"
  | "Fair Value"
  | "Slightly Premium"
  | "Overpriced"
  | typeof INSUFFICIENT_DATA;

export type ScoreTone = "excellent" | "good" | "average" | "risk" | "neutral";

export interface ScoreFactor {
  key: string;
  label: string;
  /** Declared weight (relative; normalized at runtime) */
  weight: number;
  /** 0–100 when available */
  score: number | null;
  available: boolean;
  /** Human-readable signal used */
  detail?: string | null;
}

export interface ScoreExplanation {
  positive: string[];
  negative: string[];
  summary: string;
}

export interface ScoreConfidence {
  /** 0–100 when computable */
  value: number | null;
  displayValue: string;
  /** Share of required factors present (0–1) */
  coverage: number;
  missingFactors: string[];
  basedOn: string;
}

export interface ScoredResult {
  available: boolean;
  score: number | null;
  label: string;
  displayValue: string;
  message: string | null;
  confidence: ScoreConfidence;
  factors: ScoreFactor[];
  explanation: ScoreExplanation;
  tone: ScoreTone;
  /** Engine version for audit / ML swap */
  engineVersion: string;
  /** Weights snapshot used (after admin override merge) */
  weightsUsed: Record<string, number>;
  /** Raw weighted average before buyer-friendly curve (AreaIQ) */
  rawScore?: number | null;
  /** Admin audit lines: earned/max or Pending */
  audit?: ScoreAuditLine[];
}

export interface PriceFairnessResult {
  available: boolean;
  label: PriceFairnessLabel;
  /** 0–100 fairness score (higher = better deal for buyer) */
  score: number | null;
  differencePercent: number | null;
  propertyPsf: number | null;
  areaAveragePsf: number | null;
  builderAveragePsf: number | null;
  nearbyAveragePsf: number | null;
  detail: string;
  confidence: ScoreConfidence;
}

/** Inputs for AreaIQ Score — each factor independently scored upstream */
export interface AreaIQScoreInput {
  locationQuality: number | null;
  builderReputation: number | null;
  constructionQuality: number | null;
  priceFairness: number | null;
  connectivity: number | null;
  amenities: number | null;
  legalVerification: number | null;
  demand: number | null;
  futureInfrastructure: number | null;
  livability: number | null;
  /** Optional admin weight overrides (relative) */
  weights?: Partial<Record<keyof typeof import("./weights").AREAIQ_DEFAULT_WEIGHTS, number>>;
}

export interface InvestmentScoreInput {
  capitalAppreciation: number | null;
  rentalYield: number | null;
  entryPrice: number | null;
  exitPotential: number | null;
  supplyVsDemand: number | null;
  infrastructureGrowth: number | null;
  liquidity: number | null;
  builderReliability: number | null;
  marketTrend: number | null;
  risk: number | null;
  weights?: Partial<Record<keyof typeof import("./weights").INVESTMENT_DEFAULT_WEIGHTS, number>>;
}

export interface LegalDocumentFlags {
  rera: boolean | null;
  registry: boolean | null;
  ownership: boolean | null;
  approvedMaps: boolean | null;
  noc: boolean | null;
  occupationCertificate: boolean | null;
  bankApproval: boolean | null;
  titleClear: boolean | null;
  encumbrance: boolean | null;
  /** true = litigation present (negative), false = clear, null = unknown */
  litigation: boolean | null;
}

export interface LegalScoreInput {
  documents: LegalDocumentFlags;
  weights?: Partial<Record<keyof LegalDocumentFlags, number>>;
}

export interface BuilderScoreInput {
  projectsDelivered: number | null;
  deliveryDelayPercent: number | null;
  customerRating: number | null;
  qualityScore: number | null;
  legalHistoryScore: number | null;
  completionPercent: number | null;
  financialStability: number | null;
  completedProjects: number | null;
  underConstruction: number | null;
  /** Prefer verified AreaIQ builder score when present */
  verifiedAreaiqScore?: number | null;
  weights?: Partial<Record<string, number>>;
}

export interface LocationScoreInput {
  schools: number | null;
  hospitals: number | null;
  highways: number | null;
  metro: number | null;
  airport: number | null;
  itParks: number | null;
  demand: number | null;
  /** Higher = safer (inverted from crime risk) */
  safety: number | null;
  futureDevelopment: number | null;
  weights?: Partial<Record<string, number>>;
}

/** Full Property Intelligence report — three independent pillars + sub-scores */
export interface PropertyIntelligenceReport {
  propertyId: string;
  generatedAt: string;
  engineVersion: string;
  areaIq: ScoredResult;
  investment: ScoredResult;
  legal: ScoredResult;
  builder: ScoredResult;
  location: ScoredResult;
  priceFairness: PriceFairnessResult;
}

/** Compact card payload — never use "—" */
export interface PropertyCardScores {
  areaIq: {
    available: boolean;
    score: number | null;
    label: string;
    displayValue: string;
    confidence: number | null;
    confidenceLabel: string | null;
  };
  legal: {
    available: boolean;
    score: number | null;
    label: string;
    displayValue: string;
    confidence: number | null;
    confidenceLabel: string | null;
  };
  investment?: {
    available: boolean;
    score: number | null;
    label: string;
    displayValue: string;
    confidence?: number | null;
    confidenceLabel?: string | null;
  };
}

/** Admin audit view */
export interface ScoreAdminBreakdown {
  report: PropertyIntelligenceReport;
  rawInputs: Record<string, unknown>;
  missingData: string[];
  weightConfigId: string | null;
}
