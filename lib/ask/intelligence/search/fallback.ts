import { mapPropertyRowToListing } from "@/lib/properties/queries";
import {
  PROPERTIES_CARD_SELECT,
  PROPERTIES_CARD_SELECT_CORE,
} from "@/lib/seller/propertySchema";
import { supabase, type Property } from "@/lib/supabase";
import type { PropertySearchFilters } from "../../types";
import type { RankedListing, StructuredIntent } from "../types";
import { rankListings } from "./ranking";

type PropertyRow = Omit<Property, "contact_name" | "contact_phone"> & {
  growth_score?: number | null;
  rental_yield?: number | null;
  ai_verified?: boolean | null;
  rera_verified?: boolean | null;
  builder_name?: string | null;
};

let SELECT = PROPERTIES_CARD_SELECT;
const ALT_LIMIT = 12;

async function selectWithFallback(
  build: (select: string) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
) {
  let { data, error } = await build(SELECT);
  if (error && /calculated_price/i.test(error.message)) {
    console.warn("fetchNearbyAlternatives: retrying without calculated_price");
    SELECT = PROPERTIES_CARD_SELECT_CORE;
    ({ data, error } = await build(SELECT));
  }
  return { data, error };
}

/**
 * Nearby alternatives — ONLY after exact match is empty.
 * Never returns a wrong BHK as if it matched the query.
 * Keeps budget/city when possible; allows different configuration/type.
 */
export async function fetchNearbyAlternatives(
  intent: StructuredIntent,
  filters: PropertySearchFilters,
): Promise<RankedListing[]> {
  const buckets: PropertyRow[] = [];

  // 1) Same city / Tricity, same budget, ANY bedrooms (clearly alternatives)
  buckets.push(
    ...(await queryBucket({
      cityGroup: intent.cityGroup,
      city: filters.city,
      maxPrice: filters.maxPrice,
      minPrice: filters.minPrice,
      listingType: filters.listingType,
      excludeBhk: filters.bhk,
    })),
  );

  // 2) Same city, budget +15%, same BHK if set (budget stretch only)
  if (filters.bhk != null && filters.maxPrice != null) {
    buckets.push(
      ...(await queryBucket({
        cityGroup: intent.cityGroup,
        city: filters.city,
        maxPrice: Math.round(filters.maxPrice * 1.15),
        minPrice: filters.minPrice,
        listingType: filters.listingType,
        bhk: filters.bhk,
      })),
    );
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = buckets.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  if (filters.excludePropertyIds?.length) {
    const excluded = new Set(filters.excludePropertyIds);
    for (const id of excluded) seen.delete(id);
  }

  const filtered = unique.filter((row) => {
    if (filters.excludePropertyIds?.includes(row.id)) return false;
    return true;
  });

  const listings = filtered.slice(0, ALT_LIMIT).map(mapPropertyRowToListing);
  // Soft-rank alternatives without requiring BHK match
  const softIntent: StructuredIntent = {
    ...intent,
    bedrooms: null,
    configuration: null,
  };
  return rankListings(listings, softIntent);
}

async function queryBucket(opts: {
  cityGroup: string[] | null;
  city: string | null;
  maxPrice: number | null;
  minPrice: number | null;
  listingType: PropertySearchFilters["listingType"];
  bhk?: number | null;
  excludeBhk?: number | null;
}): Promise<PropertyRow[]> {
  const { data, error } = await selectWithFallback(async (select) => {
    let query = supabase
      .from("properties")
      .select(select)
      .eq("status", "active")
      .is("deleted_at", null);

    if (opts.listingType) query = query.eq("type", opts.listingType);
    if (opts.maxPrice != null) query = query.lte("price", opts.maxPrice);
    if (opts.minPrice != null) query = query.gte("price", opts.minPrice);
    if (opts.bhk != null) query = query.eq("bedrooms", opts.bhk);
    if (opts.excludeBhk != null) query = query.neq("bedrooms", opts.excludeBhk);

    if (opts.cityGroup?.length) {
      query = query.or(opts.cityGroup.map((c) => `city.ilike.%${c}%`).join(","));
    } else if (opts.city) {
      query = query.ilike("city", `%${opts.city}%`);
    }

    return query.order("created_at", { ascending: false }).limit(ALT_LIMIT);
  });

  if (error) {
    console.error("fetchNearbyAlternatives bucket:", error.message);
    return [];
  }
  return (data as unknown as PropertyRow[]) ?? [];
}
