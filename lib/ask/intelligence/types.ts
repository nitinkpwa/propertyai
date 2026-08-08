import type { ListingProperty } from "@/lib/properties/types";
import type { LocationSearchReport, ResolvedPlace } from "@/lib/location";
import type { PossessionIntent, PropertySearchFilters } from "../types";

/** Structured intent extracted from a user query (never invented by the LLM). */
export interface StructuredIntent {
  transaction: "buy" | "rent" | "sell" | "commercial" | null;
  propertyType:
    | "apartment"
    | "flat"
    | "villa"
    | "plot"
    | "house"
    | "office"
    | "commercial"
    | "warehouse"
    | "sco"
    | "shop"
    | "builder_floor"
    | null;
  /** Canonical DB sub_type when mappable */
  subType: PropertySearchFilters["subType"];
  configuration: string | null;
  bedrooms: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  city: string | null;
  /** Tricity expands to multiple cities */
  cityGroup: string[] | null;
  locality: string | null;
  sector: string | null;
  builder: string | null;
  project: string | null;
  intentStyle: "luxury" | "affordable" | "general" | null;
  possession: PossessionIntent | null;
  investment: boolean;
  selfUse: boolean;
  rentalFocus: boolean;
  rawQuery: string;
  confidence: number;
  /** Location Intelligence Engine resolution (synonyms + nearby expansion). */
  resolvedPlace?: ResolvedPlace | null;
  expandedLocations?: string[];
}

export interface RankedListing {
  listing: ListingProperty;
  rankScore: number;
  matchReasons: string[];
  locationMatchScore?: number;
  distanceKm?: number | null;
  distanceScore?: number;
  locationTier?: string;
}

export interface SearchMatchResult {
  exact: RankedListing[];
  alternatives: RankedListing[];
  exactCount: number;
  filtersApplied: PropertySearchFilters;
  noExactMatch: boolean;
  alternativeReason: string | null;
  /** Location Intelligence Engine debug / transparency report. */
  locationReport?: LocationSearchReport | null;
}

export interface AreaIntelligence {
  locality: string;
  overview: string | null;
  connectivity: string | null;
  airportDistance: string | null;
  metro: string | null;
  schools: string | null;
  hospitals: string | null;
  malls: string | null;
  futureInfrastructure: string | null;
  demand: string | null;
  supply: string | null;
  rentalMarket: string | null;
  capitalAppreciation: string | null;
  builderActivity: string | null;
  riskLevel: string | null;
  suitableFor: string[];
  source: "database" | "unavailable" | "placeholder";
}

export interface BuilderIntelligence {
  builderName: string;
  projects: string[];
  completedProjects: string[];
  constructionQuality: string | null;
  deliveryRecord: string | null;
  rera: string | null;
  reputation: string | null;
  customerReviews: string | null;
  pros: string[];
  cons: string[];
  riskScore: number | null;
  areaiqBuilderScore: number | null;
  futureLaunches: string | null;
  source: "database" | "listings" | "unavailable";
}

export interface InvestmentIntelligence {
  rentalYield: number | null;
  capitalAppreciation: number | null;
  demandScore: number | null;
  liquidityScore: number | null;
  holdingPeriodYears: number | null;
  expectedRoi: number | null;
  investmentGrade: string | null;
  rentalGrade: string | null;
  selfUseGrade: string | null;
  notes: string[];
}

export interface IntelligenceBundle {
  userQuery: string;
  intent: StructuredIntent;
  search: SearchMatchResult;
  area: AreaIntelligence | null;
  builder: BuilderIntelligence | null;
  investment: InvestmentIntelligence | null;
  confidenceScore: number;
  sources: string[];
}

export interface ComposedAnswer {
  markdown: string;
  propertyRationales: Record<string, string>;
  suggestions: string[];
  followUpQuestions: string[];
  /** True when the answer was built from live data because the LLM failed */
  aiDegraded?: boolean;
}
