import type { PropertySearchFilters } from "../types";
import type { ConversationMessage } from "../types";
import type { IntentEntities, IntentClassification, InvestmentPurpose } from "./types";
import { EMPTY_ENTITIES } from "./types";
import { logAsk } from "./logger";

function toPrice(lakhs: number | null, crore: number | null): number | null {
  if (crore !== null && crore > 0) return crore * 10_000_000;
  if (lakhs !== null && lakhs > 0) return lakhs * 100_000;
  return null;
}

export function entitiesToFilters(entities: IntentEntities): PropertySearchFilters {
  return {
    bhk: entities.bhk,
    minPrice: toPrice(entities.minPriceLakhs, null),
    maxPrice: toPrice(entities.maxPriceLakhs, entities.maxPriceCrore),
    city: entities.city,
    locality: entities.locality,
    subType: entities.propertyType as import("@/lib/supabase").Property["sub_type"] | null,
    listingType: entities.listingType,
    possession: null,
    investment: entities.investmentFocus !== null,
    builder: entities.builder,
  };
}

const VALID_INTENTS = [
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

function normalizeIntent(raw: string): IntentClassification["intent"] {
  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if (VALID_INTENTS.includes(upper as (typeof VALID_INTENTS)[number])) {
    return upper as IntentClassification["intent"];
  }
  return "UNKNOWN";
}

function normalizeInvestmentPurpose(raw: unknown): InvestmentPurpose | null {
  if (typeof raw !== "string") return null;
  const value = raw.toLowerCase().replace(/\s+/g, "-");
  const valid: InvestmentPurpose[] = [
    "self-use",
    "rental",
    "commercial",
    "luxury",
    "appreciation",
  ];
  return valid.includes(value as InvestmentPurpose)
    ? (value as InvestmentPurpose)
    : null;
}

function sanitizeCompareTargets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function sanitizeEntities(raw: Partial<IntentEntities> | undefined): IntentEntities {
  if (!raw) return { ...EMPTY_ENTITIES };

  return {
    bhk: typeof raw.bhk === "number" ? raw.bhk : null,
    minPriceLakhs: typeof raw.minPriceLakhs === "number" ? raw.minPriceLakhs : null,
    maxPriceLakhs: typeof raw.maxPriceLakhs === "number" ? raw.maxPriceLakhs : null,
    maxPriceCrore: typeof raw.maxPriceCrore === "number" ? raw.maxPriceCrore : null,
    city: typeof raw.city === "string" ? raw.city : null,
    locality: typeof raw.locality === "string" ? raw.locality : null,
    propertyType: raw.propertyType ?? null,
    listingType: raw.listingType ?? null,
    builder: typeof raw.builder === "string" ? raw.builder : null,
    localityTopic: typeof raw.localityTopic === "string" ? raw.localityTopic : null,
    propertyName: typeof raw.propertyName === "string" ? raw.propertyName : null,
    investmentFocus: raw.investmentFocus ?? null,
    compareTargets: sanitizeCompareTargets(raw.compareTargets),
  };
}

interface ClassifierJSON {
  intent?: string;
  confidence?: number;
  reasoning?: string;
  location?: string | null;
  builder?: string | null;
  budget?: number | null;
  bedrooms?: number | null;
  propertyName?: string | null;
  compareTargets?: string[];
  investmentPurpose?: string | null;
  entities?: Partial<IntentEntities>;
}

function buildResponseFields(
  entities: IntentEntities,
  topLevel: ClassifierJSON,
): Pick<
  IntentClassification,
  | "location"
  | "builder"
  | "budget"
  | "bedrooms"
  | "propertyName"
  | "compareTargets"
  | "investmentPurpose"
> {
  const budgetFromEntities = toPrice(entities.maxPriceLakhs, entities.maxPriceCrore);
  const compareTargets =
    sanitizeCompareTargets(topLevel.compareTargets).length > 0
      ? sanitizeCompareTargets(topLevel.compareTargets)
      : entities.compareTargets;

  return {
    location:
      (typeof topLevel.location === "string" ? topLevel.location : null) ??
      entities.locality ??
      entities.city ??
      entities.localityTopic,
    builder:
      (typeof topLevel.builder === "string" ? topLevel.builder : null) ?? entities.builder,
    budget:
      typeof topLevel.budget === "number" ? topLevel.budget : budgetFromEntities,
    bedrooms:
      typeof topLevel.bedrooms === "number" ? topLevel.bedrooms : entities.bhk,
    propertyName:
      (typeof topLevel.propertyName === "string" ? topLevel.propertyName : null) ??
      entities.propertyName,
    compareTargets,
    investmentPurpose: normalizeInvestmentPurpose(topLevel.investmentPurpose),
  };
}

export async function detectIntent(
  message: string,
  history: ConversationMessage[] = [],
): Promise<IntentClassification> {
  const { completeJSON } = await import("./openai");
  const { CLASSIFIER_SYSTEM_PROMPT } = await import("./prompts");

  logAsk({
    event: "intent_classification_start",
    userMessage: message,
    historyLength: history.length,
  });

  const result = await completeJSON<ClassifierJSON>(
    CLASSIFIER_SYSTEM_PROMPT,
    message.trim(),
    history,
  );

  if (!result?.intent) {
    logAsk({
      event: "intent_classification_failed",
      level: "warn",
      userMessage: message,
    });
    return {
      intent: "UNKNOWN",
      confidence: 0,
      entities: { ...EMPTY_ENTITIES },
      reasoning: "Classifier returned no intent",
      location: null,
      builder: null,
      budget: null,
      bedrooms: null,
      propertyName: null,
      compareTargets: [],
      investmentPurpose: null,
    };
  }

  const confidence = typeof result.confidence === "number" ? result.confidence : 0.5;
  const intent = confidence < 0.45 ? "UNKNOWN" : normalizeIntent(result.intent);
  const entities = sanitizeEntities(result.entities);
  const fields = buildResponseFields(entities, result);

  if (fields.bedrooms !== null && entities.bhk === null) {
    entities.bhk = fields.bedrooms;
  }
  if (fields.budget !== null && entities.maxPriceLakhs === null && entities.maxPriceCrore === null) {
    if (fields.budget >= 10_000_000) {
      entities.maxPriceCrore = fields.budget / 10_000_000;
    } else {
      entities.maxPriceLakhs = fields.budget / 100_000;
    }
  }
  if (fields.location && !entities.city && !entities.locality && !entities.localityTopic) {
    entities.localityTopic = fields.location;
  }
  if (fields.builder && !entities.builder) {
    entities.builder = fields.builder;
  }
  if (fields.propertyName && !entities.propertyName) {
    entities.propertyName = fields.propertyName;
  }
  if (fields.compareTargets.length > 0) {
    entities.compareTargets = fields.compareTargets;
  }

  const classification: IntentClassification = {
    intent,
    confidence,
    entities,
    reasoning: result.reasoning,
    ...fields,
  };

  logAsk({
    event: "intent_classification_complete",
    userMessage: message,
    detectedIntent: classification.intent,
    confidence: classification.confidence,
    location: classification.location,
    builder: classification.builder,
    budget: classification.budget,
    bedrooms: classification.bedrooms,
    propertyName: classification.propertyName,
    reasoning: classification.reasoning,
  });

  return classification;
}

export function resolveLocalitySearchTerm(classification: IntentClassification): string | null {
  const { entities } = classification;
  return entities.localityTopic ?? entities.locality ?? entities.city ?? classification.location;
}

export function resolveBuilderName(classification: IntentClassification): string | null {
  return classification.entities.builder ?? classification.builder;
}

export function resolvePropertyName(classification: IntentClassification): string | null {
  return classification.entities.propertyName ?? classification.propertyName;
}
