import type { PropertyCardProps } from "@/app/components/PropertyCard";
import {
  buildLocationOrFilter,
  isLocationRelevant,
  resolvePlace,
  scoreLocationMatch,
} from "@/lib/location";
import { mapPropertyRowToCardProps, mapPropertyRowToListing } from "@/lib/properties/queries";
import type { ListingProperty } from "@/lib/properties/types";
import {
  PROPERTIES_CARD_SELECT,
  PROPERTIES_CARD_SELECT_CORE,
} from "@/lib/seller/propertySchema";
import { supabase, type Property } from "@/lib/supabase";
import type { AskSearchResult, PropertySearchFilters } from "./types";

type PropertyRow = Omit<Property, "contact_name" | "contact_phone"> & {
  contact_name?: string | null;
  contact_phone?: string | null;
  growth_score?: number | null;
  rental_yield?: number | null;
  ai_verified?: boolean | null;
  rera_verified?: boolean | null;
  builder_name?: string | null;
  possession?: string | null;
  project_name?: string | null;
  seller?: { full_name?: string | null } | null;
};

const SELECT_WITH_CALC = `${PROPERTIES_CARD_SELECT}, seller:profiles!properties_seller_id_fkey(full_name)`;
const SELECT_CORE = `${PROPERTIES_CARD_SELECT_CORE}, seller:profiles!properties_seller_id_fkey(full_name)`;
let askSelect = SELECT_WITH_CALC;

const RESULT_LIMIT = 50;

async function selectLiveProperties(
  build: (select: string) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  label: string,
) {
  let { data, error } = await build(askSelect);
  if (error && /calculated_price/i.test(error.message)) {
    console.warn(`${label}: retrying without calculated_price`);
    askSelect = SELECT_CORE;
    ({ data, error } = await build(askSelect));
  }
  return { data, error };
}

function mapRows(rows: PropertyRow[]): { cards: PropertyCardProps[]; listings: ListingProperty[] } {
  return {
    cards: rows.map(mapPropertyRowToCardProps),
    listings: rows.map(mapPropertyRowToListing),
  };
}

function applyExclusions(rows: PropertyRow[], excludeIds?: string[]): PropertyRow[] {
  if (!excludeIds?.length) return rows;
  const excluded = new Set(excludeIds);
  return rows.filter((row) => !excluded.has(row.id));
}

interface QueryOptions {
  strict: boolean;
}

function matchesLocality(row: PropertyRow, locality: string): boolean {
  const place = resolvePlace(locality);
  if (place) {
    return isLocationRelevant(
      scoreLocationMatch(
        {
          id: row.id,
          title: row.title,
          project_name: row.project_name,
          builder_name: row.builder_name,
          location: row.location,
          sector: row.sector,
          city: row.city,
          description: row.description,
          lat: row.lat,
          lng: row.lng,
        },
        place,
      ),
      { minScore: 55, maxDistanceKm: 25 },
    );
  }
  const needle = locality.toLowerCase();
  const haystack = `${row.title} ${row.location} ${row.sector ?? ""} ${row.description ?? ""} ${row.city ?? ""}`.toLowerCase();
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
  const build = (select: string) => {
    let query = supabase
      .from("properties")
      .select(select)
      .eq("status", "active")
      .is("deleted_at", null);

    if (filters.listingType) {
      query = query.eq("type", filters.listingType);
    }

    // Exact constraints always — never silently widen BHK/type.
    if (filters.maxPrice !== null) {
      query = query.lte(
        "price",
        options.strict ? filters.maxPrice : Math.round(filters.maxPrice * 1.15),
      );
    }
    if (filters.minPrice !== null) query = query.gte("price", filters.minPrice);
    if (filters.bhk !== null) query = query.eq("bedrooms", filters.bhk);
    if (filters.subType) query = query.eq("sub_type", filters.subType);

    const place =
      (filters.locality && resolvePlace(filters.locality)) ||
      (filters.city && resolvePlace(filters.city)) ||
      null;
    if (place) {
      query = query.or(buildLocationOrFilter(place, 12));
    } else if (filters.city) {
      query = query.or(
        `city.ilike.%${filters.city}%,location.ilike.%${filters.city}%,sector.ilike.%${filters.city}%,title.ilike.%${filters.city}%`,
      );
    }

    return query
      .order("created_at", { ascending: false })
      .limit(options.strict ? RESULT_LIMIT * 2 : RESULT_LIMIT * 3);
  };

  const { data, error } = await selectLiveProperties(build, "searchPropertiesFromIntent");

  if (error) {
    console.error("searchPropertiesFromIntent:", error.message);
    return [] as PropertyRow[];
  }

  let rows = (data as unknown as PropertyRow[]) ?? [];

  if (options.strict && filters.locality) {
    rows = rows.filter((row) => matchesLocality(row, filters.locality!));
  }

  if (filters.possession) {
    rows = rows.filter((row) => matchesPossession(row, filters.possession));
  }

  rows.sort((a, b) => scoreProperty(b, filters) - scoreProperty(a, filters));

  return rows.slice(0, RESULT_LIMIT);
}

/**
 * Labeled alternatives only — NEVER relax BHK as a silent "match".
 * Prefer same city + budget with different configuration; never dump random listings.
 */
async function fetchFallbackProperties(filters: PropertySearchFilters): Promise<{
  rows: PropertyRow[];
  reason: string;
}> {
  // Same city + budget, exclude requested BHK (explicit alternatives)
  if (filters.city || filters.maxPrice != null) {
    const { data, error } = await selectLiveProperties(async (select) => {
      let query = supabase
        .from("properties")
        .select(select)
        .eq("status", "active")
        .is("deleted_at", null);

      if (filters.listingType) query = query.eq("type", filters.listingType);
      if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
      if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
      if (filters.city) query = query.ilike("city", `%${filters.city}%`);
      if (filters.bhk != null) query = query.neq("bedrooms", filters.bhk);

      return query.order("created_at", { ascending: false }).limit(RESULT_LIMIT);
    }, "fetchFallbackProperties");

    if (!error && Array.isArray(data) && data.length) {
      return {
        rows: data as unknown as PropertyRow[],
        reason:
          "No exact match exists. Nearby alternatives in the same market (different configuration).",
      };
    }
  }

  return {
    rows: [],
    reason: "No exact match and no nearby alternatives in the verified database.",
  };
}

export async function searchPropertiesFromIntent(
  filters: PropertySearchFilters,
): Promise<AskSearchResult> {
  try {
    const excludeIds = filters.excludePropertyIds;
    const exactRows = applyExclusions(await runQuery(filters, { strict: true }), excludeIds);
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
    const similar = mapRows(applyExclusions(fallback.rows, excludeIds));

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

  const { data, error } = await selectLiveProperties(
    (select) =>
      supabase
        .from("properties")
        .select(select)
        .eq("status", "active")
        .is("deleted_at", null)
        .or(
          `contact_name.ilike.%${builderName}%,description.ilike.%${builderName}%,title.ilike.%${builderName}%`,
        )
        .order("created_at", { ascending: false })
        .limit(RESULT_LIMIT),
    "searchPropertiesByBuilder",
  );

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
  const place = resolvePlace(locality);
  const filters: PropertySearchFilters = {
    bhk: null,
    minPrice: null,
    maxPrice: null,
    city: place?.parentCity ?? null,
    locality: place?.displayName ?? locality,
    subType: null,
    listingType: null,
    possession: null,
    investment: false,
    builder: null,
  };

  const orFilter = place
    ? buildLocationOrFilter(place, 14)
    : `location.ilike.%${locality}%,title.ilike.%${locality}%,city.ilike.%${locality}%,sector.ilike.%${locality}%`;

  const { data, error } = await selectLiveProperties(
    (select) =>
      supabase
        .from("properties")
        .select(select)
        .eq("status", "active")
        .is("deleted_at", null)
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(RESULT_LIMIT * 2),
    "searchPropertiesByLocality",
  );

  if (error) {
    console.error("searchPropertiesByLocality:", error.message);
    return searchPropertiesFromIntent(filters);
  }

  let rows = (data as PropertyRow[]) ?? [];
  rows = rows.filter((row) => matchesLocality(row, locality));
  if (place) {
    rows.sort((a, b) => {
      const sa = scoreLocationMatch(
        { id: a.id, title: a.title, location: a.location, sector: a.sector, city: a.city, lat: a.lat, lng: a.lng },
        place,
      );
      const sb = scoreLocationMatch(
        { id: b.id, title: b.title, location: b.location, sector: b.sector, city: b.city, lat: b.lat, lng: b.lng },
        place,
      );
      return sb.matchScore - sa.matchScore || scoreProperty(b, filters) - scoreProperty(a, filters);
    });
  } else {
    rows.sort((a, b) => scoreProperty(b, filters) - scoreProperty(a, filters));
  }

  if (rows.length === 0) {
    return searchPropertiesFromIntent(filters);
  }

  const mapped = mapRows(rows.slice(0, RESULT_LIMIT));
  const noExact =
    place != null &&
    !rows.some((row) => {
      const tier = scoreLocationMatch(
        { id: row.id, title: row.title, location: row.location, city: row.city },
        place,
      ).tier;
      return tier === "exact" || tier === "alias";
    });

  return {
    properties: mapped.cards,
    listings: mapped.listings,
    filters,
    isSimilar: noExact,
    similarReason: noExact
      ? `I couldn't find an exact property inside ${place?.displayName ?? locality} today. However I found verified projects very close to your preferred location.`
      : null,
    totalExact: noExact ? 0 : mapped.cards.length,
  };
}

export async function searchPropertiesByName(
  name: string,
): Promise<AskSearchResult> {
  const filters: PropertySearchFilters = {
    bhk: null,
    minPrice: null,
    maxPrice: null,
    city: null,
    locality: name,
    subType: null,
    listingType: null,
    possession: null,
    investment: false,
    builder: null,
  };

  const { data, error } = await selectLiveProperties(
    (select) =>
      supabase
        .from("properties")
        .select(select)
        .eq("status", "active")
        .is("deleted_at", null)
        .or(
          `title.ilike.%${name}%,project_name.ilike.%${name}%,description.ilike.%${name}%,location.ilike.%${name}%`,
        )
        .order("created_at", { ascending: false })
        .limit(RESULT_LIMIT),
    "searchPropertiesByName",
  );

  if (error) {
    console.error("searchPropertiesByName:", error.message);
    return {
      properties: [],
      listings: [],
      filters,
      isSimilar: false,
      similarReason: null,
      totalExact: 0,
    };
  }

  let rows = (data as PropertyRow[]) ?? [];
  const needle = name.toLowerCase();
  rows = rows.filter((row) => {
    const haystack =
      `${row.title} ${row.project_name ?? ""} ${row.location} ${row.description ?? ""}`.toLowerCase();
    return haystack.includes(needle);
  });

  if (rows.length === 0) {
    return searchPropertiesByLocality(name);
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

export async function searchPropertyById(
  id: string,
): Promise<ListingProperty | null> {
  const { data, error } = await selectLiveProperties(
    (select) =>
      supabase
        .from("properties")
        .select(select)
        .eq("id", id)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle(),
    "searchPropertyById",
  );

  if (error || !data) {
    if (error) console.error("searchPropertyById:", error.message);
    return null;
  }

  return mapPropertyRowToListing(data as PropertyRow);
}
