import { mapPropertyRowToListing } from "@/lib/properties/queries";
import type { ListingProperty } from "@/lib/properties/types";
import {
  PROPERTIES_CARD_SELECT,
  PROPERTIES_CARD_SELECT_CORE,
} from "@/lib/seller/propertySchema";
import { supabase, type Property } from "@/lib/supabase";
import type { PropertySearchFilters } from "../../types";
import type { SearchMatchResult, StructuredIntent } from "../types";
import { structuredIntentToFilters } from "../intent/parser";
import { rankListings } from "./ranking";
import { fetchNearbyAlternatives } from "./fallback";

type PropertyRow = Omit<Property, "contact_name" | "contact_phone"> & {
  growth_score?: number | null;
  rental_yield?: number | null;
  ai_verified?: boolean | null;
  rera_verified?: boolean | null;
  builder_name?: string | null;
  possession?: string | null;
};

const SELECT_WITH_CALC = `${PROPERTIES_CARD_SELECT}, seller:profiles!properties_seller_id_fkey(full_name)`;
const SELECT_CORE = `${PROPERTIES_CARD_SELECT_CORE}, seller:profiles!properties_seller_id_fkey(full_name)`;
const RESULT_LIMIT = 40;

function matchesLocality(row: PropertyRow, locality: string): boolean {
  const needle = locality.toLowerCase();
  const haystack =
    `${row.title} ${row.location} ${row.sector ?? ""} ${row.description ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

function matchesPossession(
  row: PropertyRow,
  possession: PropertySearchFilters["possession"],
): boolean {
  if (!possession) return true;
  const value = row.possession?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
  if (possession === "ready") return !value || value.includes("ready");
  if (possession === "under-construction") {
    return value.includes("under") || value.includes("construction");
  }
  if (possession === "new-launch") {
    return value.includes("new") || value.includes("launch");
  }
  return true;
}

/**
 * STRICT structured SQL search.
 * Never relaxes BHK, property type, or budget on exact match.
 * Never uses embeddings.
 */
function applyExactFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  intent: StructuredIntent,
  filters: PropertySearchFilters,
) {
  query = query.eq("status", "active").is("deleted_at", null);

  if (filters.listingType) {
    query = query.eq("type", filters.listingType);
  }

  // Hard constraints — never optional for exact match
  if (filters.bhk !== null) query = query.eq("bedrooms", filters.bhk);
  if (filters.maxPrice !== null) query = query.lte("price", filters.maxPrice);
  if (filters.minPrice !== null) query = query.gte("price", filters.minPrice);
  if (filters.subType) query = query.eq("sub_type", filters.subType);

  if (intent.cityGroup?.length) {
    const ors = intent.cityGroup.map((c) => `city.ilike.%${c}%`).join(",");
    query = query.or(ors);
  } else if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }

  if (filters.builder) {
    query = query.or(
      `builder_name.ilike.%${filters.builder}%,title.ilike.%${filters.builder}%,contact_name.ilike.%${filters.builder}%`,
    );
  }

  return query.order("created_at", { ascending: false }).limit(RESULT_LIMIT * 2);
}

export async function runExactStructuredSearch(
  intent: StructuredIntent,
  filters: PropertySearchFilters,
): Promise<ListingProperty[]> {
  let { data, error } = await applyExactFilters(
    supabase.from("properties").select(SELECT_WITH_CALC),
    intent,
    filters,
  );

  if (error && /calculated_price/i.test(error.message)) {
    console.warn(
      "runExactStructuredSearch: calculated_price missing — retrying core select",
    );
    ({ data, error } = await applyExactFilters(
      supabase.from("properties").select(SELECT_CORE),
      intent,
      filters,
    ));
  }

  if (error) {
    console.error("runExactStructuredSearch:", error.message);
    return [];
  }

  let rows = (data as unknown as PropertyRow[]) ?? [];

  if (filters.locality) {
    rows = rows.filter((row) => matchesLocality(row, filters.locality!));
  }
  if (filters.possession) {
    rows = rows.filter((row) => matchesPossession(row, filters.possession));
  }
  if (filters.excludePropertyIds?.length) {
    const excluded = new Set(filters.excludePropertyIds);
    rows = rows.filter((row) => !excluded.has(row.id));
  }

  // Luxury heuristic: prefer higher-priced units within budget (still exact BHK/type)
  if (intent.intentStyle === "luxury" && filters.maxPrice != null) {
    const floor = Math.round(filters.maxPrice * 0.45);
    const luxuryPreferred = rows.filter((r) => r.price >= floor);
    if (luxuryPreferred.length > 0) rows = luxuryPreferred;
  }

  return rows.slice(0, RESULT_LIMIT).map(mapPropertyRowToListing);
}

/**
 * Full structured search + labeled alternatives (never silent substitution).
 */
export async function executeStructuredSearch(
  intent: StructuredIntent,
  excludePropertyIds?: string[],
): Promise<SearchMatchResult> {
  const filters = structuredIntentToFilters(intent, excludePropertyIds);
  const exactListings = await runExactStructuredSearch(intent, filters);
  const exact = rankListings(exactListings, intent);

  if (exact.length > 0) {
    return {
      exact,
      alternatives: [],
      exactCount: exact.length,
      filtersApplied: filters,
      noExactMatch: false,
      alternativeReason: null,
    };
  }

  const alternatives = await fetchNearbyAlternatives(intent, filters);
  return {
    exact: [],
    alternatives,
    exactCount: 0,
    filtersApplied: filters,
    noExactMatch: true,
    alternativeReason:
      alternatives.length > 0
        ? "No exact match exists. Showing nearby verified alternatives with different configuration or type."
        : "No exact match and no nearby alternatives in the verified database.",
  };
}
