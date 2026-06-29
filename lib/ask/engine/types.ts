import type { ListingProperty } from "@/lib/properties/types";
import type { AskSearchStats } from "../types";
import type { ConversationMessage } from "../openai-client";

export const ASK_ENGINE_INTENTS = [
  "PROPERTY_SEARCH",
  "KNOWLEDGE",
  "LOCALITY",
  "BUILDER",
  "INVESTMENT",
  "FINANCE",
  "GENERAL_CHAT",
  "UNKNOWN",
] as const;

export type AskEngineIntent = (typeof ASK_ENGINE_INTENTS)[number];

export type InvestmentFocus = "yield" | "appreciation" | "general";

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
  investmentFocus: InvestmentFocus | null;
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
}

export interface AskEngineResponse {
  intent: AskEngineIntent;
  answer: string;
  location: string | null;
  builder: string | null;
  budget: number | null;
  bedrooms: number | null;
  properties: ListingProperty[];
  suggestions: string[];
  followUpQuestions: string[];
  stats: AskSearchStats | null;
  searchedDatabase: boolean;
  isSimilar: boolean;
}

export interface HandlerContext {
  message: string;
  history: ConversationMessage[];
  classification: IntentClassification;
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
  investmentFocus: null,
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
    suggestions: [],
    followUpQuestions: [],
    stats: null,
    searchedDatabase: false,
    isSimilar: false,
  };
}
