import type { ListingProperty } from "@/lib/properties/types";
import type { AskSearchStats } from "../types";
import type { ConversationMessage } from "../types";

export const ASK_ENGINE_INTENTS = [
  "PROPERTY_SEARCH",
  "PROPERTY_ANALYSIS",
  "COMPARE",
  "LOCALITY",
  "BUILDER",
  "INVESTMENT",
  "FINANCE",
  "KNOWLEDGE",
  "MARKET_TREND",
  "SELLING",
  "GENERAL_CHAT",
  "UNRELATED",
  "UNKNOWN",
] as const;

export type AskEngineIntent = (typeof ASK_ENGINE_INTENTS)[number];

export type InvestmentFocus = "yield" | "appreciation" | "general";

export type InvestmentPurpose =
  | "self-use"
  | "rental"
  | "commercial"
  | "luxury"
  | "appreciation";

export type EntityPropertyType =
  | "flat"
  | "plot"
  | "house"
  | "builder_floor"
  | "office"
  | "warehouse"
  | "sco"
  | "coworking";

export type EntityListingType = "buy" | "rent" | "commercial";

export interface IntentEntities {
  bhk: number | null;
  minPriceLakhs: number | null;
  maxPriceLakhs: number | null;
  maxPriceCrore: number | null;
  city: string | null;
  locality: string | null;
  propertyType: EntityPropertyType | null;
  listingType: EntityListingType | null;
  builder: string | null;
  localityTopic: string | null;
  propertyName: string | null;
  investmentFocus: InvestmentFocus | null;
  compareTargets: string[];
}

export interface IntentClassification {
  intent: AskEngineIntent;
  confidence: number;
  entities: IntentEntities;
  reasoning?: string;
  location: string | null;
  builder: string | null;
  budget: number | null;
  bedrooms: number | null;
  propertyName: string | null;
  compareTargets: string[];
  investmentPurpose: InvestmentPurpose | null;
}

export interface PropertyAnalyticsContext {
  currentPsf: number | null;
  areaAveragePsf: number | null;
  differencePercent: number | null;
  marketPosition: string | null;
  priceConfidence: number | null;
  investmentScore: number | null;
  investmentConfidence: number | null;
  fairValueExpected: number | null;
  growthRange: string | null;
  comparableCount: number;
  priceOpinion: string | null;
}

export interface PropertyContext {
  id: string;
  name: string;
  location: string;
  city: string;
  price: number;
  bhk: number;
  area: number;
  builderName: string;
  growthScore: number | null;
  rentalYield: number | null;
  possession: string;
  propertyType: string;
  /** Verified Analytics Engine metrics — explain these, never invent replacements */
  analytics?: PropertyAnalyticsContext | null;
}

export type AskIntelligenceLevel = "full" | "partial";

export interface AskIntelligenceDigest {
  listingsSearched: number;
  buildersChecked: number;
  marketSignalsAnalyzed: number;
}

export interface AskEngineResponse {
  intent: AskEngineIntent;
  answer: string;
  location: string | null;
  builder: string | null;
  budget: number | null;
  bedrooms: number | null;
  properties: ListingProperty[];
  propertyRationales: Record<string, string>;
  suggestions: string[];
  followUpQuestions: string[];
  stats: AskSearchStats | null;
  searchedDatabase: boolean;
  isSimilar: boolean;
  /** full = normal answer; partial = verified slice + next actions (never a dead end) */
  intelligenceLevel?: AskIntelligenceLevel;
  confidenceOverall?: number | null;
  missingSignals?: string[];
  /** LLM reasoning unavailable — answer still built from live AreaIQ data */
  aiDegraded?: boolean;
  /** Soft notice shown under a valid data-backed answer */
  aiNotice?: string | null;
  /** Counts for the intelligence progress / digest UI */
  intelligenceDigest?: AskIntelligenceDigest | null;
}

export interface HandlerContext {
  message: string;
  history: ConversationMessage[];
  classification: IntentClassification;
  propertyContext?: PropertyContext | null;
  excludePropertyIds?: string[];
  buyerProfileContext?: string;
}

export const EMPTY_ENTITIES: IntentEntities = {
  bhk: null,
  minPriceLakhs: null,
  maxPriceLakhs: null,
  maxPriceCrore: null,
  city: null,
  locality: null,
  propertyType: null,
  listingType: null,
  builder: null,
  localityTopic: null,
  propertyName: null,
  investmentFocus: null,
  compareTargets: [],
};

export function classificationToResponseFields(
  classification: IntentClassification,
): Pick<AskEngineResponse, "location" | "builder" | "budget" | "bedrooms"> {
  return {
    location: classification.location,
    builder: classification.builder,
    budget: classification.budget,
    bedrooms: classification.bedrooms,
  };
}

export function emptyEngineResponse(intent: AskEngineIntent): AskEngineResponse {
  return {
    intent,
    answer: "",
    location: null,
    builder: null,
    budget: null,
    bedrooms: null,
    properties: [],
    propertyRationales: {},
    suggestions: [],
    followUpQuestions: [],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
    intelligenceLevel: "full",
    confidenceOverall: null,
    missingSignals: [],
  };
}
