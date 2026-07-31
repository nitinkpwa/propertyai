import {
  alwaysShowPreamble,
  buildLocationOrFilter,
  buildLocationSearchReport,
  isLocationRelevant,
  nearbyMatchPreamble,
  scoreLocationMatch,
  type PropertyLocationFields,
  type ResolvedPlace,
} from "@/lib/location";
import { mapPropertyRowToListing } from "@/lib/properties/queries";
import type { ListingProperty } from "@/lib/properties/types";
import {
  PROPERTIES_CARD_SELECT,
  PROPERTIES_CARD_SELECT_CORE,
} from "@/lib/seller/propertySchema";
import { supabase, type Property } from "@/lib/supabase";
import type { PropertySearchFilters } from "../../types";
import type { RankedListing, SearchMatchResult, StructuredIntent } from "../types";
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
  project_name?: string | null;
  address?: string | null;
  nearby_places?: unknown;
};

const SELECT_WITH_CALC = `${PROPERTIES_CARD_SELECT}, seller:profiles!properties_seller_id_fkey(full_name)`;
const SELECT_CORE = `${PROPERTIES_CARD_SELECT_CORE}, seller:profiles!properties_seller_id_fkey(full_name)`;
const RESULT_LIMIT = 40;

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

function rowToLocationFields(row: PropertyRow): PropertyLocationFields {
  return {
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
}

function resolvePlaceFromIntent(intent: StructuredIntent): ResolvedPlace | null {
  return intent.resolvedPlace ?? null;
}

/**
 * Soft attribute filters only (BHK / budget / type).
 * Location is NEVER a hard city.eq / city.ilike-only gate.
 */
function applyAttributeFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: PropertySearchFilters,
) {
  query = query.eq("status", "active").is("deleted_at", null);

  if (filters.listingType) {
    query = query.eq("type", filters.listingType);
  }

  if (filters.bhk !== null) query = query.eq("bedrooms", filters.bhk);
  if (filters.maxPrice !== null) query = query.lte("price", filters.maxPrice);
  if (filters.minPrice !== null) query = query.gte("price", filters.minPrice);
  if (filters.subType) query = query.eq("sub_type", filters.subType);

  if (filters.builder) {
    query = query.or(
      `builder_name.ilike.%${filters.builder}%,title.ilike.%${filters.builder}%,contact_name.ilike.%${filters.builder}%`,
    );
  }

  return query;
}

async function fetchWithSelect(
  build: (select: string) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
): Promise<PropertyRow[]> {
  let { data, error } = await build(SELECT_WITH_CALC);
  if (error && /calculated_price/i.test(error.message)) {
    console.warn(
      "runLocationAwareSearch: calculated_price missing — retrying core select",
    );
    ({ data, error } = await build(SELECT_CORE));
  }
  if (error) {
    console.error("runLocationAwareSearch:", error.message);
    return [];
  }
  return (data as unknown as PropertyRow[]) ?? [];
}

/**
 * Location-intelligent inventory search:
 * 1) Multi-field OR across expanded localities / highways / cities
 * 2) Fuzzy + distance relevance scoring
 * 3) Never stop after exact city miss
 */
async function runLocationAwareSearch(
  intent: StructuredIntent,
  filters: PropertySearchFilters,
): Promise<{ rows: PropertyRow[]; place: ResolvedPlace | null }> {
  const place = resolvePlaceFromIntent(intent);
  const seen = new Set<string>();
  const merged: PropertyRow[] = [];

  const pushRows = (rows: PropertyRow[]) => {
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
  };

  // Pass A — multi-field location OR (aliases + neighbours + highways)
  if (place) {
    const orFilter = buildLocationOrFilter(place, 14);
    if (orFilter) {
      const rows = await fetchWithSelect((select) => {
        let query = applyAttributeFilters(
          supabase.from("properties").select(select),
          filters,
        );
        query = query.or(orFilter);
        return query.order("created_at", { ascending: false }).limit(RESULT_LIMIT * 3);
      });
      pushRows(rows);
    }
  }

  // Pass B — cityGroup / parent cities (still multi-city, not single exact)
  if (merged.length < 8) {
    const cities =
      intent.cityGroup?.length
        ? intent.cityGroup
        : place?.cityValues?.length
          ? place.cityValues
          : filters.city
            ? [filters.city]
            : [];

    if (cities.length) {
      const cityOr = cities.map((c) => `city.ilike.%${c}%`).join(",");
      const locOr = cities
        .flatMap((c) => [
          `location.ilike.%${c}%`,
          `sector.ilike.%${c}%`,
          `title.ilike.%${c}%`,
        ])
        .join(",");
      const rows = await fetchWithSelect((select) => {
        let query = applyAttributeFilters(
          supabase.from("properties").select(select),
          filters,
        );
        query = query.or([cityOr, locOr].filter(Boolean).join(","));
        return query.order("created_at", { ascending: false }).limit(RESULT_LIMIT * 2);
      });
      pushRows(rows);
    }
  }

  // Pass C — attribute-only pool (Tricity-wide) then score by location
  if (merged.length < 4 && place) {
    const rows = await fetchWithSelect((select) => {
      let query = applyAttributeFilters(
        supabase.from("properties").select(select),
        // Drop hard BHK for wider geo pool when still empty — ranking handles fit
        { ...filters, bhk: filters.bhk },
      );
      return query.order("created_at", { ascending: false }).limit(80);
    });
    pushRows(rows);
  }

  // No place resolved — classic attribute search
  if (!place && merged.length === 0) {
    const rows = await fetchWithSelect((select) => {
      let query = applyAttributeFilters(
        supabase.from("properties").select(select),
        filters,
      );
      if (filters.city) query = query.ilike("city", `%${filters.city}%`);
      return query.order("created_at", { ascending: false }).limit(RESULT_LIMIT * 2);
    });
    pushRows(rows);
  }

  let rows = merged;

  if (filters.possession) {
    rows = rows.filter((row) => matchesPossession(row, filters.possession));
  }
  if (filters.excludePropertyIds?.length) {
    const excluded = new Set(filters.excludePropertyIds);
    rows = rows.filter((row) => !excluded.has(row.id));
  }

  // Location relevance gate — keep neighbours / highways / fuzzy, drop noise
  if (place) {
    const relevant = rows.filter((row) => {
      const score = scoreLocationMatch(rowToLocationFields(row), place);
      return isLocationRelevant(score, { minScore: 55, maxDistanceKm: 25 });
    });
    // Prefer relevant; if none, keep rows that still fuzzy-match at lower bar
    if (relevant.length > 0) {
      rows = relevant;
    } else {
      rows = rows.filter((row) => {
        const score = scoreLocationMatch(rowToLocationFields(row), place, {
          minFuzzy: 78,
        });
        return score.matchScore >= 50 || (score.distanceKm != null && score.distanceKm <= 35);
      });
    }
  }

  if (intent.intentStyle === "luxury" && filters.maxPrice != null) {
    const floor = Math.round(filters.maxPrice * 0.45);
    const luxuryPreferred = rows.filter((r) => r.price >= floor);
    if (luxuryPreferred.length > 0) rows = luxuryPreferred;
  }

  return { rows: rows.slice(0, RESULT_LIMIT * 2), place };
}

function toRankedWithLocation(
  listings: ListingProperty[],
  intent: StructuredIntent,
  rows: PropertyRow[],
  place: ResolvedPlace | null,
): RankedListing[] {
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const ranked = rankListings(listings, intent);

  return ranked.map((r) => {
    const row = rowById.get(r.listing.id);
    const loc = scoreLocationMatch(
      row ? rowToLocationFields(row) : {
        id: r.listing.id,
        title: r.listing.name,
        location: r.listing.location,
        city: r.listing.city,
        builder_name: r.listing.builderName,
      },
      place,
    );

    const locationBoost = Math.round(loc.matchScore * 0.35 + loc.distanceScore * 0.15);
    const reasons = [...r.matchReasons];
    for (const w of loc.why) {
      if (!reasons.includes(w)) reasons.push(w);
    }
    if (loc.distanceKm != null && loc.distanceKm <= 20) {
      const distLabel = `Approx. ${loc.distanceKm} km from ${place?.displayName ?? "search area"}`;
      if (!reasons.includes(distLabel)) reasons.push(distLabel);
    }

    return {
      ...r,
      rankScore: r.rankScore + locationBoost,
      matchReasons: reasons,
      locationMatchScore: loc.matchScore,
      distanceKm: loc.distanceKm,
      distanceScore: loc.distanceScore,
      locationTier: loc.tier,
    };
  }).sort((a, b) => b.rankScore - a.rankScore);
}

export async function runExactStructuredSearch(
  intent: StructuredIntent,
  filters: PropertySearchFilters,
): Promise<ListingProperty[]> {
  const { rows } = await runLocationAwareSearch(intent, filters);
  return rows.slice(0, RESULT_LIMIT).map(mapPropertyRowToListing);
}

/**
 * Full structured search + labeled alternatives (never silent substitution).
 * Uses Location Intelligence Engine — never exact city string matching alone.
 */
export async function executeStructuredSearch(
  intent: StructuredIntent,
  excludePropertyIds?: string[],
): Promise<SearchMatchResult> {
  const filters = structuredIntentToFilters(intent, excludePropertyIds);
  const place = resolvePlaceFromIntent(intent);
  const { rows, place: usedPlace } = await runLocationAwareSearch(intent, filters);
  const listings = rows.slice(0, RESULT_LIMIT).map(mapPropertyRowToListing);
  const ranked = toRankedWithLocation(listings, intent, rows, usedPlace ?? place);

  const exactTier = new Set(["exact", "alias"]);
  const exact = ranked.filter(
    (r) => r.locationTier && exactTier.has(r.locationTier),
  );
  const nearby = ranked.filter(
    (r) => !r.locationTier || !exactTier.has(r.locationTier),
  );

  // If we have any location-relevant hits, treat top ranked as primary results
  // (neighbouring highways count as successful search — never empty).
  const primary = exact.length > 0 ? exact : ranked;
  const hasResults = primary.length > 0;

  const locationReport = buildLocationSearchReport(
    intent.rawQuery,
    usedPlace ?? place,
    ranked.map((r) => {
      const row = rows.find((x) => x.id === r.listing.id);
      const loc = scoreLocationMatch(
        row ? rowToLocationFields(row) : {
          id: r.listing.id,
          title: r.listing.name,
          location: r.listing.location,
          city: r.listing.city,
        },
        usedPlace ?? place,
      );
      return {
        property: row ? rowToLocationFields(row) : {
          id: r.listing.id,
          title: r.listing.name,
          location: r.listing.location,
          city: r.listing.city,
        },
        location: loc,
        finalScore: r.rankScore,
      };
    }),
  );

  if (hasResults) {
    const noExact = exact.length === 0;
    const placeName = (usedPlace ?? place)?.displayName;
    // Pipeline displays `alternatives` when noExactMatch — keep nearby hits there.
    if (noExact) {
      return {
        exact: [],
        alternatives: primary,
        exactCount: 0,
        filtersApplied: filters,
        noExactMatch: true,
        alternativeReason: placeName
          ? nearbyMatchPreamble(placeName)
          : alwaysShowPreamble(),
        locationReport,
      };
    }
    return {
      exact: primary,
      alternatives: nearby.filter((r) => !primary.includes(r)).slice(0, 8),
      exactCount: primary.length,
      filtersApplied: filters,
      noExactMatch: false,
      alternativeReason: null,
      locationReport,
    };
  }

  // Last resort — soft alternatives (different BHK etc.) still location-aware
  const alternatives = await fetchNearbyAlternatives(intent, filters);
  const placeName = (usedPlace ?? place)?.displayName;

  return {
    exact: [],
    alternatives,
    exactCount: 0,
    filtersApplied: filters,
    noExactMatch: true,
    alternativeReason:
      alternatives.length > 0
        ? placeName
          ? nearbyMatchPreamble(placeName)
          : alwaysShowPreamble()
        : placeName
          ? `I couldn't find an exact property inside ${placeName} today. Try widening budget or BHK — I can keep searching nearby verified corridors.`
          : "No exact match and no nearby alternatives in the verified database.",
    locationReport: {
      ...locationReport,
      matchedCount: alternatives.length,
      properties: alternatives.map((a) => ({
        propertyId: a.listing.id,
        title: a.listing.name,
        locationLabel: [a.listing.location, a.listing.city].filter(Boolean).join(", "),
        matchScore: a.locationMatchScore ?? 0,
        distanceKm: a.distanceKm ?? null,
        distanceScore: a.distanceScore ?? 0,
        finalRankingScore: a.rankScore,
        tier: (a.locationTier as LocationSearchReportTier) ?? "none",
        why: a.matchReasons,
      })),
    },
  };
}

// Local alias to avoid importing tier union into alternatives map above
type LocationSearchReportTier =
  | "exact"
  | "alias"
  | "neighbor"
  | "micromarket"
  | "sector"
  | "highway"
  | "city"
  | "district"
  | "fuzzy"
  | "geo"
  | "none";
