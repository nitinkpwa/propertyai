import {
  AREA_MAX,
  AREA_MIN,
  BUDGET_MAX,
  BUDGET_MIN,
} from "./constants";
import {
  calculateLegalCompliance,
  type LegalComplianceLevel,
} from "./legalCompliance";
import type {
  ListingProperty,
  PropertyFilterState,
  SupabasePropertyFilters,
} from "./types";
import { normalizeFilterState } from "./urlFilters";

const HIGH_GROWTH_THRESHOLD = 80;
const HIGH_APPRECIATION_THRESHOLD = 85;
const HIGH_RENTAL_YIELD_THRESHOLD = 5;
const BEST_INVESTMENT_GROWTH = 80;
const BEST_INVESTMENT_YIELD = 4.5;

function matchesBhk(property: ListingProperty, bhkFilters: number[]): boolean {
  if (bhkFilters.length === 0) return true;
  return bhkFilters.some((bhk) =>
    bhk >= 5 ? property.bhk >= 5 : property.bhk === bhk,
  );
}

function matchesAmenities(
  property: ListingProperty,
  amenities: PropertyFilterState["amenities"],
): boolean {
  if (amenities.length === 0) return true;
  return amenities.every((amenity) => property.amenities.includes(amenity));
}

function resolvePropertyComplianceLevel(
  property: ListingProperty,
): LegalComplianceLevel {
  if (property.legalCompliance?.level) return property.legalCompliance.level;
  return calculateLegalCompliance(property.legalFlags ?? null).level;
}

function matchesDocumentsFilters(
  property: ListingProperty,
  ai: PropertyFilterState["ai"],
): boolean {
  const wantsVerified = ai.documentsVerified || ai.verifiedOnly;
  const levels: LegalComplianceLevel[] = [];
  if (wantsVerified) levels.push("verified");
  if (ai.documentsPartial) levels.push("partial");
  if (ai.documentsMissing) levels.push("missing");
  if (levels.length === 0) return true;
  return levels.includes(resolvePropertyComplianceLevel(property));
}

function matchesAiFilters(
  property: ListingProperty,
  ai: PropertyFilterState["ai"],
): boolean {
  if (
    ai.highAreaIQScore &&
    (property.growthScore === null || property.growthScore < HIGH_GROWTH_THRESHOLD)
  ) {
    return false;
  }
  if (
    ai.highAppreciation &&
    (property.growthScore === null ||
      property.growthScore < HIGH_APPRECIATION_THRESHOLD)
  ) {
    return false;
  }
  if (
    ai.highRentalYield &&
    (property.rentalYield === null ||
      property.rentalYield < HIGH_RENTAL_YIELD_THRESHOLD)
  ) {
    return false;
  }
  if (ai.bestInvestment) {
    if (
      property.growthScore === null ||
      property.rentalYield === null ||
      property.growthScore < BEST_INVESTMENT_GROWTH ||
      property.rentalYield < BEST_INVESTMENT_YIELD
    ) {
      return false;
    }
  }
  if (!matchesDocumentsFilters(property, ai)) return false;
  return true;
}

function getAreaSqft(property: ListingProperty): number {
  return property.areaUnit === "sqyd" ? property.area * 9 : property.area;
}

/** Client-side filter — swap the data source for Supabase results later. */
export function filterProperties(
  properties: ListingProperty[],
  filters: PropertyFilterState,
): ListingProperty[] {
  const active = normalizeFilterState(filters);

  return properties.filter((property) => {
    if (
      active.propertyTypes.length > 0 &&
      !active.propertyTypes.includes(property.propertyType)
    ) {
      return false;
    }

    if (active.listingType && property.listingType !== active.listingType) {
      return false;
    }

    if (active.minPrice != null && property.price < active.minPrice) {
      return false;
    }

    if (active.maxPrice != null && property.price > active.maxPrice) {
      return false;
    }

    if (!matchesBhk(property, active.bhk)) return false;

    if (
      active.location &&
      property.city?.toLowerCase() !== active.location.toLowerCase()
    ) {
      return false;
    }

    if (
      active.builder &&
      property.builderName.toLowerCase() !== active.builder.toLowerCase()
    ) {
      return false;
    }

    if (
      active.possession.length > 0 &&
      !active.possession.includes(property.possession)
    ) {
      return false;
    }

    const areaSqft = getAreaSqft(property);

    if (active.minArea != null && areaSqft < active.minArea) return false;
    if (active.maxArea != null && areaSqft > active.maxArea) return false;

    if (!matchesAmenities(property, active.amenities)) return false;
    if (!matchesAiFilters(property, active.ai)) return false;

    return true;
  });
}

/**
 * Maps UI filter state to Supabase-ready query parameters.
 * Document compliance is evaluated client-side from legal flags / meta
 * (dedicated columns may not exist on live schema yet).
 */
export function toSupabaseFilters(
  filters: PropertyFilterState,
): SupabasePropertyFilters {
  const active = normalizeFilterState(filters);
  const supabaseFilters: SupabasePropertyFilters = {};

  if (active.propertyTypes.length > 0) {
    supabaseFilters.propertyTypes = active.propertyTypes;
  }
  if (active.listingType) supabaseFilters.listingType = active.listingType;
  if (active.minPrice != null) supabaseFilters.minPrice = active.minPrice;
  if (active.maxPrice != null) supabaseFilters.maxPrice = active.maxPrice;
  if (active.bhk.length > 0) supabaseFilters.bhk = active.bhk;
  if (active.location) supabaseFilters.location = active.location;
  if (active.builder) supabaseFilters.builder = active.builder;
  if (active.possession.length > 0) {
    supabaseFilters.possession = active.possession;
  }
  if (active.minArea != null) supabaseFilters.minArea = active.minArea;
  if (active.maxArea != null) supabaseFilters.maxArea = active.maxArea;
  if (active.amenities.length > 0) {
    supabaseFilters.amenities = active.amenities;
  }

  const docsLevels: LegalComplianceLevel[] = [];
  if (active.ai.documentsVerified || active.ai.verifiedOnly) {
    docsLevels.push("verified");
  }
  if (active.ai.documentsPartial) docsLevels.push("partial");
  if (active.ai.documentsMissing) docsLevels.push("missing");
  if (docsLevels.length > 0) {
    supabaseFilters.documentsCompliance = [...new Set(docsLevels)];
  }

  if (active.ai.highAreaIQScore) {
    supabaseFilters.minGrowthScore = HIGH_GROWTH_THRESHOLD;
  }
  if (active.ai.highRentalYield) {
    supabaseFilters.minRentalYield = HIGH_RENTAL_YIELD_THRESHOLD;
  }
  if (active.ai.highAppreciation) {
    supabaseFilters.minGrowthScore = Math.max(
      supabaseFilters.minGrowthScore ?? 0,
      HIGH_APPRECIATION_THRESHOLD,
    );
  }

  return supabaseFilters;
}

/**
 * Example Supabase query builder — wire this when the backend is ready.
 * Legal compliance filters are applied in `filterProperties` from resolved flags.
 */
export function buildSupabasePropertyQuery<
  T extends {
    eq: (column: string, value: unknown) => T;
    gte: (column: string, value: unknown) => T;
    lte: (column: string, value: unknown) => T;
    or: (filters: string) => T;
    in: (column: string, values: unknown[]) => T;
    contains: (column: string, value: unknown) => T;
    not: (column: string, operator: string, value: unknown) => T;
    neq: (column: string, value: unknown) => T;
  },
>(query: T, filters: SupabasePropertyFilters): T {
  let next = query;

  if (filters.listingType) {
    next = next.eq("listing_type", filters.listingType);
  }
  if (filters.propertyTypes?.length) {
    next = next.in("property_type", filters.propertyTypes);
  }
  if (filters.minPrice != null) {
    // Prefer calculated_price (display total) with fallback to legacy price.
    next = next.or(
      `calculated_price.gte.${filters.minPrice},and(calculated_price.is.null,price.gte.${filters.minPrice})`,
    );
  }
  if (filters.maxPrice != null) {
    next = next.or(
      `calculated_price.lte.${filters.maxPrice},and(calculated_price.is.null,price.lte.${filters.maxPrice})`,
    );
  }
  if (filters.location) {
    next = next.eq("city", filters.location);
  }
  if (filters.builder) {
    next = next.eq("builder_name", filters.builder);
  }
  if (filters.minArea != null) {
    next = next.gte("area_sqft", filters.minArea);
  }
  if (filters.maxArea != null) {
    next = next.lte("area_sqft", filters.maxArea);
  }
  if (filters.aiVerified) {
    next = next.eq("ai_verified", true);
  }
  if (filters.reraVerified) {
    // Live schema has rera_number only — rera_verified column does not exist.
    next = next.not("rera_number", "is", null).neq("rera_number", "");
  }
  if (filters.minGrowthScore != null) {
    next = next.gte("growth_score", filters.minGrowthScore);
  }
  if (filters.minRentalYield != null) {
    next = next.gte("rental_yield", filters.minRentalYield);
  }

  return next;
}
