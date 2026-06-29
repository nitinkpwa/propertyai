import type { PropertyCardProps } from "@/app/components/PropertyCard";
import type { ListingProperty } from "@/lib/properties/types";

export type AskIntent =
  | "search"
  | "knowledge"
  | "locality"
  | "builder"
  | "investment";

export type { AskEngineIntent, AskEngineResponse } from "./engine/types";

export type ListingIntent = "buy" | "rent" | "commercial";

export type PossessionIntent = "ready" | "under-construction" | "new-launch";

export type AskSortKey = "price" | "rentalYield" | "growthScore";

export type AskSortDirection = "asc" | "desc";

export interface PropertySearchFilters {
  bhk: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  city: string | null;
  locality: string | null;
  subType: import("@/lib/supabase").Property["sub_type"] | null;
  listingType: ListingIntent | null;
  possession: PossessionIntent | null;
  investment: boolean;
  builder: string | null;
}

export interface AskSearchResult {
  properties: PropertyCardProps[];
  listings: ListingProperty[];
  filters: PropertySearchFilters;
  isSimilar: boolean;
  similarReason: string | null;
  totalExact: number;
}

export interface AskSearchStats {
  count: number;
  avgPrice: number;
  avgRentalYield: number;
  bestInvestmentScore: number;
}

export interface AskSection {
  title: string;
  content: string;
}

export interface AskTurn {
  id: string;
  userQuery: string;
  intent: AskIntent;
  headline: string;
  subtext: string | null;
  aiContent: string | null;
  sections: AskSection[];
  stats: AskSearchStats | null;
  listings: ListingProperty[];
  isSimilar: boolean;
  quickActions: readonly string[];
  followUps: readonly string[];
}

export interface AskSessionState {
  query: string;
  summary: string;
  isSimilar: boolean;
  similarReason: string | null;
  sortKey: AskSortKey;
  sortDirection: AskSortDirection;
}
