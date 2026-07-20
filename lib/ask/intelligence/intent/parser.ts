import type { IntentEntities, IntentClassification } from "../../engine/types";
import type { PossessionIntent } from "../../types";
import {
  BUDGET_UNITS,
  CONFIGURATION_PATTERN,
  PROPERTY_TYPE_ALIASES,
  TRICITY_CITIES,
  toDbSubType,
  type StructuredPropertyType,
} from "../taxonomy";
import type { StructuredIntent } from "../types";

const EMPTY_INTENT = (rawQuery: string): StructuredIntent => ({
  transaction: null,
  propertyType: null,
  subType: null,
  configuration: null,
  bedrooms: null,
  budgetMin: null,
  budgetMax: null,
  city: null,
  cityGroup: null,
  locality: null,
  sector: null,
  builder: null,
  project: null,
  intentStyle: null,
  possession: null,
  investment: false,
  selfUse: true,
  rentalFocus: false,
  rawQuery,
  confidence: 0.4,
});

function parseBudget(text: string): { min: number | null; max: number | null } {
  let min: number | null = null;
  let max: number | null = null;

  const under =
    /(?:under|below|upto|up\s*to|less\s*than|within|<|max(?:imum)?)\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|crore|cr|crores)?/i.exec(
      text,
    );
  if (under) {
    const n = parseFloat(under[1]);
    const unit = (under[2] ?? "lakh").toLowerCase() as keyof typeof BUDGET_UNITS;
    max = Math.round(n * (BUDGET_UNITS[unit] ?? BUDGET_UNITS.lakh));
  }

  const between =
    /(?:between|from)\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|crore|cr|crores)?\s*(?:to|-|and)\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|crore|cr|crores)?/i.exec(
      text,
    );
  if (between) {
    const unitA = (between[2] ?? between[4] ?? "lakh").toLowerCase() as keyof typeof BUDGET_UNITS;
    const unitB = (between[4] ?? between[2] ?? "lakh").toLowerCase() as keyof typeof BUDGET_UNITS;
    min = Math.round(parseFloat(between[1]) * (BUDGET_UNITS[unitA] ?? BUDGET_UNITS.lakh));
    max = Math.round(parseFloat(between[3]) * (BUDGET_UNITS[unitB] ?? BUDGET_UNITS.lakh));
  }

  const bareCr = /(\d+(?:\.\d+)?)\s*(crore|cr)\b/i.exec(text);
  if (!max && bareCr && /under|below|upto|within|budget|max/i.test(text)) {
    max = Math.round(parseFloat(bareCr[1]) * BUDGET_UNITS.crore);
  }

  const bareLakh = /(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs)\b/i.exec(text);
  if (!max && bareLakh && /under|below|upto|within|budget|max/i.test(text)) {
    max = Math.round(parseFloat(bareLakh[1]) * BUDGET_UNITS.lakh);
  }

  return { min, max };
}

function parsePropertyType(text: string): StructuredPropertyType | null {
  const lower = text.toLowerCase();
  // Longer keys first
  const keys = Object.keys(PROPERTY_TYPE_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) return PROPERTY_TYPE_ALIASES[key];
  }
  return null;
}

function parseCity(text: string): { city: string | null; cityGroup: string[] | null } {
  if (/\btricity\b|\btri\s*city\b/i.test(text)) {
    return { city: "Tricity", cityGroup: [...TRICITY_CITIES] };
  }
  for (const city of TRICITY_CITIES) {
    if (new RegExp(`\\b${city.replace(/\s+/g, "\\s+")}\\b`, "i").test(text)) {
      return { city, cityGroup: null };
    }
  }
  return { city: null, cityGroup: null };
}

function parsePossession(text: string): PossessionIntent | null {
  if (/ready\s*to\s*move|ready\s*possession|rtm/i.test(text)) return "ready";
  if (/under\s*construction|uc\b/i.test(text)) return "under-construction";
  if (/new\s*launch|launching/i.test(text)) return "new-launch";
  return null;
}

function parseSector(text: string): string | null {
  const m = /\b(?:sector|sec\.?)\s*([0-9]{1,3}[A-Za-z]?)\b/i.exec(text);
  return m ? `Sector ${m[1]}` : null;
}

/**
 * Rule-based Intent Parser — deterministic extraction.
 * Never invents filters the user did not imply.
 */
export function parseIntentFromText(query: string): StructuredIntent {
  const text = query.trim();
  const intent = EMPTY_INTENT(text);
  if (!text) return intent;

  const lower = text.toLowerCase();

  // Transaction
  if (/\brent\b|\brental\b|\blease\b/.test(lower)) intent.transaction = "rent";
  else if (/\bsell\b|\bselling\b/.test(lower)) intent.transaction = "sell";
  else if (/\bcommercial\b|\bsco\b|\boffice\b|\bwarehouse\b|\bshop\b/.test(lower)) {
    intent.transaction = "commercial";
  } else if (/\bbuy\b|\bpurchase\b|\bbhk\b|\bflat\b|\bapartment\b|\bvilla\b|\bplot\b/.test(lower)) {
    intent.transaction = "buy";
  }

  // Configuration
  const bhk = CONFIGURATION_PATTERN.exec(text);
  if (bhk) {
    intent.bedrooms = parseInt(bhk[1], 10);
    intent.configuration = `${intent.bedrooms} BHK`;
  }

  // Property type — default apartment/flat when BHK mentioned without type
  intent.propertyType = parsePropertyType(text);
  if (!intent.propertyType && intent.bedrooms) {
    intent.propertyType = "apartment";
  }
  intent.subType = toDbSubType(intent.propertyType);

  // Budget
  const budget = parseBudget(text);
  intent.budgetMin = budget.min;
  intent.budgetMax = budget.max;

  // Location
  const cityInfo = parseCity(text);
  intent.city = cityInfo.city;
  intent.cityGroup = cityInfo.cityGroup;
  intent.sector = parseSector(text);

  // Style / purpose
  if (/\bluxury\b|\bpremium\b|\bhigh[\s-]?end\b/.test(lower)) intent.intentStyle = "luxury";
  else if (/\baffordable\b|\bbudget\b|\bcheap\b|\beconomy\b/.test(lower)) {
    intent.intentStyle = "affordable";
  }

  if (/\binvest(?:ment|or)?\b|\byield\b|\bappreciation\b|\broi\b/.test(lower)) {
    intent.investment = true;
    intent.selfUse = false;
  }
  if (/\bself[\s-]?use\b|\bend[\s-]?use\b|\bfamily\b|\blive\b/.test(lower)) {
    intent.selfUse = true;
  }
  if (/\brental\b|\brent\s*out\b/.test(lower)) {
    intent.rentalFocus = true;
    intent.investment = true;
  }

  intent.possession = parsePossession(text);

  // Confidence
  let confidence = 0.5;
  if (intent.bedrooms) confidence += 0.15;
  if (intent.budgetMax) confidence += 0.15;
  if (intent.city || intent.cityGroup) confidence += 0.1;
  if (intent.propertyType) confidence += 0.05;
  intent.confidence = Math.min(0.95, confidence);

  return intent;
}

/**
 * Merge classifier entities into structured intent (classifier fills gaps;
 * rule parser wins on hard constraints like BHK / budget when present).
 */
export function mergeClassifierIntoIntent(
  base: StructuredIntent,
  classification: IntentClassification,
): StructuredIntent {
  const e: IntentEntities = classification.entities;
  const merged = { ...base };

  if (merged.bedrooms == null && (e.bhk != null || classification.bedrooms != null)) {
    merged.bedrooms = e.bhk ?? classification.bedrooms;
    if (merged.bedrooms) merged.configuration = `${merged.bedrooms} BHK`;
  }

  if (merged.budgetMax == null && classification.budget != null) {
    merged.budgetMax = classification.budget;
  }
  if (merged.budgetMax == null) {
    if (e.maxPriceCrore != null) merged.budgetMax = Math.round(e.maxPriceCrore * 10_000_000);
    else if (e.maxPriceLakhs != null) merged.budgetMax = Math.round(e.maxPriceLakhs * 100_000);
  }
  if (merged.budgetMin == null && e.minPriceLakhs != null) {
    merged.budgetMin = Math.round(e.minPriceLakhs * 100_000);
  }

  if (!merged.city && (e.city || classification.location)) {
    const loc = e.city ?? classification.location;
    if (loc && /tricity/i.test(loc)) {
      merged.city = "Tricity";
      merged.cityGroup = [...TRICITY_CITIES];
    } else {
      merged.city = loc;
    }
  }

  if (!merged.locality && e.locality) merged.locality = e.locality;
  if (!merged.builder && (e.builder || classification.builder)) {
    merged.builder = e.builder ?? classification.builder;
  }
  if (!merged.project && e.propertyName) merged.project = e.propertyName;

  if (!merged.propertyType && e.propertyType) {
    const map: Record<string, StructuredPropertyType> = {
      flat: "flat",
      plot: "plot",
      house: "house",
      builder_floor: "builder_floor",
      office: "office",
      warehouse: "warehouse",
      sco: "sco",
      coworking: "office",
    };
    merged.propertyType = map[e.propertyType] ?? null;
    merged.subType = toDbSubType(merged.propertyType);
  }

  if (!merged.transaction && e.listingType) {
    merged.transaction = e.listingType;
  }

  if (classification.investmentPurpose === "luxury") merged.intentStyle = "luxury";
  if (classification.investmentPurpose === "self-use") merged.selfUse = true;
  if (
    classification.investmentPurpose === "rental" ||
    classification.investmentPurpose === "appreciation" ||
    classification.intent === "INVESTMENT" ||
    e.investmentFocus != null
  ) {
    merged.investment = true;
  }

  merged.confidence = Math.max(merged.confidence, classification.confidence);
  return merged;
}

export function structuredIntentToFilters(
  intent: StructuredIntent,
  excludePropertyIds?: string[],
): import("../../types").PropertySearchFilters {
  return {
    bhk: intent.bedrooms,
    minPrice: intent.budgetMin,
    maxPrice: intent.budgetMax,
    city: intent.cityGroup ? null : intent.city,
    locality: intent.locality ?? intent.sector,
    subType: intent.subType,
    listingType:
      intent.transaction === "rent"
        ? "rent"
        : intent.transaction === "commercial"
          ? "commercial"
          : intent.transaction === "buy"
            ? "buy"
            : null,
    possession: intent.possession,
    investment: intent.investment,
    builder: intent.builder,
    excludePropertyIds,
  };
}
