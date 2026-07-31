import {
  buildLocationOrFilter,
  scoreLocationMatch,
  type PropertyLocationFields,
} from "@/lib/location";
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
  project_name?: string | null;
  address?: string | null;
  nearby_places?: unknown;
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
 * Nearby alternatives — location-expanded first, then soft attribute relax.
 * Never returns empty if any relevant corridor inventory exists.
 */
export async function fetchNearbyAlternatives(
  intent: StructuredIntent,
  filters: PropertySearchFilters,
): Promise<RankedListing[]> {
  const buckets: PropertyRow[] = [];
  const place = intent.resolvedPlace ?? null;

  // 1) Expanded location OR, drop BHK constraint
  if (place) {
    buckets.push(
      ...(await queryBucket({
        locationOr: buildLocationOrFilter(place, 12),
        maxPrice: filters.maxPrice,
        minPrice: filters.minPrice,
        listingType: filters.listingType,
        excludeBhk: filters.bhk,
      })),
    );
  }

  // 2) City group / parent cities
  buckets.push(
    ...(await queryBucket({
      cityGroup: intent.cityGroup ?? place?.cityValues ?? null,
      city: filters.city,
      maxPrice: filters.maxPrice,
      minPrice: filters.minPrice,
      listingType: filters.listingType,
      excludeBhk: filters.bhk,
    })),
  );

  // 3) Budget stretch +15% with location still expanded
  if (filters.maxPrice != null) {
    buckets.push(
      ...(await queryBucket({
        locationOr: place ? buildLocationOrFilter(place, 10) : null,
        cityGroup: intent.cityGroup ?? place?.cityValues ?? null,
        city: filters.city,
        maxPrice: Math.round(filters.maxPrice * 1.15),
        minPrice: filters.minPrice,
        listingType: filters.listingType,
        bhk: filters.bhk,
      })),
    );
  }

  const seen = new Set<string>();
  let unique = buckets.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  if (filters.excludePropertyIds?.length) {
    const excluded = new Set(filters.excludePropertyIds);
    unique = unique.filter((row) => !excluded.has(row.id));
  }

  // Prefer location-relevant rows
  if (place) {
    const scored = unique
      .map((row) => {
        const fields: PropertyLocationFields = {
          id: row.id,
          title: row.title,
          project_name: row.project_name,
          builder_name: row.builder_name,
          location: row.location,
          sector: row.sector,
          address: row.address,
          city: row.city,
          description: row.description,
          nearby_places: row.nearby_places,
          lat: row.lat,
          lng: row.lng,
        };
        return { row, loc: scoreLocationMatch(fields, place) };
      })
      .filter((x) => x.loc.matchScore >= 50 || (x.loc.distanceKm != null && x.loc.distanceKm <= 30))
      .sort((a, b) => b.loc.matchScore - a.loc.matchScore);
    if (scored.length) unique = scored.map((s) => s.row);
  }

  const listings = unique.slice(0, ALT_LIMIT).map(mapPropertyRowToListing);
  const softIntent: StructuredIntent = {
    ...intent,
    bedrooms: null,
    configuration: null,
  };
  return rankListings(listings, softIntent);
}

async function queryBucket(opts: {
  cityGroup?: string[] | null;
  city?: string | null;
  locationOr?: string | null;
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

    if (opts.locationOr) {
      query = query.or(opts.locationOr);
    } else if (opts.cityGroup?.length) {
      const parts = opts.cityGroup.flatMap((c) => [
        `city.ilike.%${c}%`,
        `location.ilike.%${c}%`,
        `sector.ilike.%${c}%`,
      ]);
      query = query.or(parts.join(","));
    } else if (opts.city) {
      query = query.or(
        `city.ilike.%${opts.city}%,location.ilike.%${opts.city}%,sector.ilike.%${opts.city}%,title.ilike.%${opts.city}%`,
      );
    }

    return query.order("created_at", { ascending: false }).limit(ALT_LIMIT);
  });

  if (error) {
    console.error("fetchNearbyAlternatives bucket:", error.message);
    return [];
  }
  return (data as unknown as PropertyRow[]) ?? [];
}
