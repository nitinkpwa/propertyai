import type { PropertyCardProps } from "@/app/components/PropertyCard";
import { mapPropertyRowToCardProps, mapPropertyRowToListing } from "@/lib/properties/queries";
import type { ListingProperty } from "@/lib/properties/types";
import { supabase, type Property } from "@/lib/supabase";
import type { AskSearchResult, PropertySearchFilters } from "./types";

type PropertyRow = Property & {
  growth_score?: number | null;
  rental_yield?: number | null;
  ai_verified?: boolean | null;
  rera_verified?: boolean | null;
  builder_name?: string | null;
  possession?: string | null;
  project_name?: string | null;
  seller?: { full_name?: string | null } | null;
};

const SELECT =
  "*, seller:profiles!properties_seller_id_fkey(full_name)";

const RESULT_LIMIT = 50;

function mapRows(rows: PropertyRow[]): { cards: PropertyCardProps[]; listings: ListingProperty[] } {
  return {
    cards: rows.map(mapPropertyRowToCardProps),
    listings: rows.map(mapPropertyRowToListing),
  };
}

interface QueryOptions {
  strict: boolean;
}

function matchesLocality(row: PropertyRow, locality: string): boolean {
  const needle = locality.toLowerCase();
  const haystack = `${row.title} ${row.location} ${row.sector ?? ""} ${row.description ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

function matchesPossession(row: PropertyRow, possession: PropertySearchFilters["possession"]): boolean {
  if (!possession) return true;
  const value = row.possession?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
  if (possession === "ready") {
    return !value || value === "ready" || value.includes("ready");
  }
  if (possession === "under-construction") {
    return value.includes("under") || value.includes("construction");
  }
  if (possession === "new-launch") {
    return value.includes("new") || value.includes("launch");
  }
  return true;
}

function scoreProperty(row: PropertyRow, filters: PropertySearchFilters): number {
  let score = 0;

  if (filters.city && row.city?.toLowerCase().includes(filters.city.toLowerCase())) score += 4;
  if (filters.locality && matchesLocality(row, filters.locality)) score += 5;
  if (filters.bhk && row.bedrooms === filters.bhk) score += 4;
  if (filters.subType && row.sub_type === filters.subType) score += 3;
  if (filters.listingType && row.type === filters.listingType) score += 2;
  if (filters.maxPrice && row.price <= filters.maxPrice) score += 2;
  if (filters.minPrice && row.price >= filters.minPrice) score += 1;
  if (filters.investment && typeof row.rental_yield === "number") score += 1;

  return score;
}

async function runQuery(filters: PropertySearchFilters, options: QueryOptions) {
  let query = supabase.from("properties").select(SELECT).eq("status", "active");

  if (filters.listingType) {
    query = query.eq("type", filters.listingType);
  }

  if (options.strict) {
    if (filters.maxPrice !== null) query = query.lte("price", filters.maxPrice);
    if (filters.minPrice !== null) query = query.gte("price", filters.minPrice);
    if (filters.bhk !== null) query = query.eq("bedrooms", filters.bhk);
    if (filters.subType) query = query.eq("sub_type", filters.subType);
    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  } else {
    if (filters.maxPrice !== null) {
      query = query.lte("price", Math.round(filters.maxPrice * 1.25));
    }
    if (filters.bhk !== null) {
      query = query.gte("bedrooms", Math.max(1, filters.bhk - 1)).lte("bedrooms", filters.bhk + 1);
    }
    if (filters.subType) query = query.eq("sub_type", filters.subType);
    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(options.strict ? RESULT_LIMIT * 2 : RESULT_LIMIT * 3);

  if (error) {
    console.error("searchPropertiesFromIntent:", error.message);
    return [] as PropertyRow[];
  }

  let rows = (data as PropertyRow[]) ?? [];

  if (options.strict && filters.locality) {
    rows = rows.filter((row) => matchesLocality(row, filters.locality!));
  }

  if (filters.possession) {
    rows = rows.filter((row) => matchesPossession(row, filters.possession));
  }

  rows.sort((a, b) => scoreProperty(b, filters) - scoreProperty(a, filters));

  return rows.slice(0, RESULT_LIMIT);
}

async function fetchFallbackProperties(filters: PropertySearchFilters): Promise<{
  rows: PropertyRow[];
  reason: string;
}> {
  if (filters.city) {
    const cityRows = await runQuery({ ...filters, locality: null }, { strict: false });
    if (cityRows.length > 0) {
      return {
        rows: cityRows,
        reason: `same city (${filters.city}) with slightly relaxed budget or configuration`,
      };
    }
  }

  if (filters.subType) {
    const typeRows = await runQuery(
      { ...filters, city: null, locality: null, bhk: null },
      { strict: false },
    );
    if (typeRows.length > 0) {
      return {
        rows: typeRows,
        reason: `similar ${filters.subType.replace(/_/g, " ")} listings across Tricity`,
      };
    }
  }

  const { data, error } = await supabase
    .from("properties")
    .select(SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(RESULT_LIMIT);

  if (error) {
    console.error("searchPropertiesFromIntent fallback:", error.message);
    return { rows: [], reason: "active listings in our database" };
  }

  return {
    rows: (data as PropertyRow[]) ?? [],
    reason: "recently added active listings",
  };
}

export async function searchPropertiesFromIntent(
  filters: PropertySearchFilters,
): Promise<AskSearchResult> {
  try {
    const exactRows = await runQuery(filters, { strict: true });
    const exact = mapRows(exactRows);

    if (exact.cards.length > 0) {
      return {
        properties: exact.cards,
        listings: exact.listings,
        filters,
        isSimilar: false,
        similarReason: null,
        totalExact: exact.cards.length,
      };
    }

    const fallback = await fetchFallbackProperties(filters);
    const similar = mapRows(fallback.rows);

    return {
      properties: similar.cards,
      listings: similar.listings,
      filters,
      isSimilar: similar.cards.length > 0,
      similarReason: similar.cards.length > 0 ? fallback.reason : null,
      totalExact: 0,
    };
  } catch (error) {
    console.error("searchPropertiesFromIntent:", error);
    return {
      properties: [],
      listings: [],
      filters,
      isSimilar: false,
      similarReason: null,
      totalExact: 0,
    };
  }
}

export function mapRowsToCards(rows: PropertyRow[]): PropertyCardProps[] {
  return rows.map(mapPropertyRowToCardProps);
}

export async function searchPropertiesByBuilder(
  builderName: string,
): Promise<AskSearchResult> {
  const filters: PropertySearchFilters = {
    bhk: null,
    minPrice: null,
    maxPrice: null,
    city: null,
    locality: null,
    subType: null,
    listingType: null,
    possession: null,
    investment: false,
    builder: builderName,
  };

  const { data, error } = await supabase
    .from("properties")
    .select(SELECT)
    .eq("status", "active")
    .or(
      `contact_name.ilike.%${builderName}%,description.ilike.%${builderName}%,title.ilike.%${builderName}%`,
    )
    .order("created_at", { ascending: false })
    .limit(RESULT_LIMIT);

  if (error) {
    console.error("searchPropertiesByBuilder:", error.message);
    return {
      properties: [],
      listings: [],
      filters,
      isSimilar: false,
      similarReason: null,
      totalExact: 0,
    };
  }

  const rows = (data as PropertyRow[]) ?? [];
  const mapped = mapRows(rows);

  return {
    properties: mapped.cards,
    listings: mapped.listings,
    filters,
    isSimilar: false,
    similarReason: null,
    totalExact: mapped.cards.length,
  };
}

export async function searchPropertiesByLocality(
  locality: string,
): Promise<AskSearchResult> {
  const filters: PropertySearchFilters = {
    bhk: null,
    minPrice: null,
    maxPrice: null,
    city: null,
    locality,
    subType: null,
    listingType: null,
    possession: null,
    investment: false,
    builder: null,
  };

  const { data, error } = await supabase
    .from("properties")
    .select(SELECT)
    .eq("status", "active")
    .or(
      `location.ilike.%${locality}%,title.ilike.%${locality}%,city.ilike.%${locality}%,sector.ilike.%${locality}%`,
    )
    .order("created_at", { ascending: false })
    .limit(RESULT_LIMIT);

  if (error) {
    console.error("searchPropertiesByLocality:", error.message);
    return searchPropertiesFromIntent(filters);
  }

  let rows = (data as PropertyRow[]) ?? [];
  rows = rows.filter((row) => matchesLocality(row, locality));
  rows.sort((a, b) => scoreProperty(b, filters) - scoreProperty(a, filters));

  if (rows.length === 0) {
    return searchPropertiesFromIntent(filters);
  }

  const mapped = mapRows(rows.slice(0, RESULT_LIMIT));

  return {
    properties: mapped.cards,
    listings: mapped.listings,
    filters,
    isSimilar: false,
    similarReason: null,
    totalExact: mapped.cards.length,
  };
}
