/**
 * Multi-agent AI intelligence stored in property metadata (no DB migrations).
 */

export const AI_PIPELINE_VERSION = "1.0.0";

export type AIAgentId =
  | "property_intelligence"
  | "area_intelligence"
  | "pricing"
  | "builder_intelligence"
  | "rental_intelligence"
  | "investment"
  | "seo"
  | "photo_vision"
  | "document_intelligence"
  | "map_intelligence"
  | "market_intelligence"
  | "quality_review";

export const AI_AGENT_LABELS: Record<AIAgentId, string> = {
  property_intelligence: "Property Intelligence",
  area_intelligence: "Area Intelligence",
  pricing: "Pricing Agent",
  builder_intelligence: "Builder Intelligence",
  rental_intelligence: "Rental Intelligence",
  investment: "Investment Agent",
  seo: "SEO Agent",
  photo_vision: "Photo Vision",
  document_intelligence: "Document Intelligence",
  map_intelligence: "Map Intelligence",
  market_intelligence: "Market Intelligence",
  quality_review: "Quality Review",
};

export interface AIAgentOutput {
  agentId: AIAgentId;
  version: string;
  generatedAt: string;
  confidence: number;
  outputs: Record<string, string | number | string[]>;
}

export interface PropertyAIIntelligence {
  pipelineVersion: string;
  generatedAt: string;
  lastUpdated: string;
  confidence: number;
  agents: Partial<Record<AIAgentId, AIAgentOutput>>;
  compiled: Record<string, string>;
}

export const COMPILED_OUTPUT_KEYS = [
  "propertySummary",
  "luxurySummary",
  "buyerSummary",
  "investmentSummary",
  "rentalAnalysis",
  "capitalAppreciation",
  "pros",
  "cons",
  "bestBuyerPersona",
  "marketPosition",
  "connectivityReview",
  "nearbyFacilitiesSummary",
  "builderReputationSummary",
  "lifestyleSummary",
  "areaSummary",
  "riskAnalysis",
  "priceAnalysis",
  "comparableProperties",
  "futureGrowth",
  "demandIndex",
  "investmentScore",
  "growthScore",
  "rentalYield",
  "aiRecommendation",
  "metaTitle",
  "metaDescription",
  "keywords",
  "schemaJson",
] as const;

export type CompiledOutputKey = (typeof COMPILED_OUTPUT_KEYS)[number];

export function createEmptyPropertyAIIntelligence(): PropertyAIIntelligence {
  return {
    pipelineVersion: AI_PIPELINE_VERSION,
    generatedAt: "",
    lastUpdated: "",
    confidence: 0,
    agents: {},
    compiled: {},
  };
}
