import {
  AMENITY_OPTIONS,
  AREA_MAX,
  AREA_MIN,
  BHK_OPTIONS,
  BUDGET_MAX,
  BUDGET_MIN,
  POSSESSION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "./constants";
import type {
  Amenity,
  ListingType,
  PossessionStatus,
  PropertyFilterState,
  PropertyType,
} from "./types";
import { DEFAULT_FILTER_STATE } from "./types";

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseBhk(values: string[]): number[] {
  return values
    .map((value) => (value === "5plus" ? 5 : Number(value)))
    .filter((value) => Number.isFinite(value));
}

function isPropertyType(value: string): value is PropertyType {
  return PROPERTY_TYPE_OPTIONS.some((option) => option.value === value);
}

/** Drop default range endpoints so chips, counts, and URLs stay accurate. */
export function normalizeFilterState(
  state: PropertyFilterState,
): PropertyFilterState {
  return {
    ...state,
    propertyTypes: [...new Set(state.propertyTypes)],
    bhk: [...new Set(state.bhk)].sort((a, b) => a - b),
    possession: [...new Set(state.possession)],
    amenities: [...new Set(state.amenities)],
    minPrice:
      state.minPrice != null && state.minPrice > BUDGET_MIN
        ? state.minPrice
        : null,
    maxPrice:
      state.maxPrice != null && state.maxPrice < BUDGET_MAX
        ? state.maxPrice
        : null,
    minArea:
      state.minArea != null && state.minArea > AREA_MIN ? state.minArea : null,
    maxArea:
      state.maxArea != null && state.maxArea < AREA_MAX ? state.maxArea : null,
    location: state.location?.trim() || null,
    builder: state.builder?.trim() || null,
  };
}

export function isBudgetFilterActive(filters: PropertyFilterState): boolean {
  return (
    (filters.minPrice != null && filters.minPrice > BUDGET_MIN) ||
    (filters.maxPrice != null && filters.maxPrice < BUDGET_MAX)
  );
}

export function isAreaFilterActive(filters: PropertyFilterState): boolean {
  return (
    (filters.minArea != null && filters.minArea > AREA_MIN) ||
    (filters.maxArea != null && filters.maxArea < AREA_MAX)
  );
}

export function filtersFromSearchParams(
  params: URLSearchParams,
): PropertyFilterState {
  const typeParam = params.get("type");
  let listingType: ListingType | null = null;
  const propertyTypesFromType: PropertyType[] = [];

  if (typeParam === "buy" || typeParam === "rent") {
    listingType = typeParam;
  } else if (typeParam && isPropertyType(typeParam)) {
    propertyTypesFromType.push(typeParam);
  }

  const propertyTypesFromParam = parseList(
    params.get("propertyType"),
  ) as PropertyType[];
  const propertyTypes = [
    ...new Set([...propertyTypesFromType, ...propertyTypesFromParam]),
  ].filter(isPropertyType);

  const bhk = parseBhk(parseList(params.get("bhk")));
  const possession = parseList(params.get("possession")) as PossessionStatus[];
  const amenities = parseList(params.get("amenities")) as Amenity[];

  const state: PropertyFilterState = {
    propertyTypes,
    listingType,
    minPrice:
      parseNumber(params.get("minPrice")) ?? parseNumber(params.get("min")),
    maxPrice:
      parseNumber(params.get("maxPrice")) ?? parseNumber(params.get("max")),
    bhk: bhk.filter((value) =>
      BHK_OPTIONS.some((option) => option.value === value),
    ),
    location: params.get("location") ?? params.get("city"),
    builder: params.get("builder"),
    possession: possession.filter((value) =>
      POSSESSION_OPTIONS.some((option) => option.value === value),
    ),
    minArea: parseNumber(params.get("minArea")),
    maxArea: parseNumber(params.get("maxArea")),
    amenities: amenities.filter((value) =>
      AMENITY_OPTIONS.some((option) => option.value === value),
    ),
    ai: {
      highAreaIQScore: params.get("aiScore") === "high",
      highRentalYield: params.get("rentalYield") === "high",
      highAppreciation: params.get("appreciation") === "high",
      bestInvestment: params.get("investment") === "best",
      verifiedOnly: params.get("verified") === "true",
      documentsVerified: params.get("docsVerified") === "true",
      documentsPartial: params.get("docsPartial") === "true",
      documentsMissing: params.get("docsMissing") === "true",
    },
  };

  return normalizeFilterState(state);
}

export function filtersToSearchParams(
  filters: PropertyFilterState,
): URLSearchParams {
  const normalized = normalizeFilterState(filters);
  const params = new URLSearchParams();

  if (normalized.listingType) {
    params.set("type", normalized.listingType);
  } else if (normalized.propertyTypes.length === 1) {
    params.set("type", normalized.propertyTypes[0]);
  }

  if (normalized.propertyTypes.length > 1) {
    params.set("propertyType", normalized.propertyTypes.join(","));
  } else if (
    normalized.propertyTypes.length === 1 &&
    normalized.propertyTypes[0] !== params.get("type")
  ) {
    params.set("propertyType", normalized.propertyTypes[0]);
  }

  if (normalized.bhk.length > 0) {
    params.set(
      "bhk",
      normalized.bhk
        .map((value) => (value >= 5 ? "5plus" : String(value)))
        .join(","),
    );
  }
  if (normalized.location) params.set("location", normalized.location);
  if (normalized.builder) params.set("builder", normalized.builder);
  if (normalized.possession.length > 0) {
    params.set("possession", normalized.possession.join(","));
  }
  if (normalized.minPrice != null) {
    params.set("minPrice", String(normalized.minPrice));
  }
  if (normalized.maxPrice != null) {
    params.set("maxPrice", String(normalized.maxPrice));
  }
  if (normalized.minArea != null) {
    params.set("minArea", String(normalized.minArea));
  }
  if (normalized.maxArea != null) {
    params.set("maxArea", String(normalized.maxArea));
  }
  if (normalized.amenities.length > 0) {
    params.set("amenities", normalized.amenities.join(","));
  }
  if (normalized.ai.highAreaIQScore) params.set("aiScore", "high");
  if (normalized.ai.highRentalYield) params.set("rentalYield", "high");
  if (normalized.ai.highAppreciation) params.set("appreciation", "high");
  if (normalized.ai.bestInvestment) params.set("investment", "best");
  if (normalized.ai.verifiedOnly) params.set("verified", "true");
  if (normalized.ai.documentsVerified) params.set("docsVerified", "true");
  if (normalized.ai.documentsPartial) params.set("docsPartial", "true");
  if (normalized.ai.documentsMissing) params.set("docsMissing", "true");

  return params;
}

export function countActiveFilters(filters: PropertyFilterState): number {
  const normalized = normalizeFilterState(filters);
  let count = 0;
  count += normalized.propertyTypes.length;
  if (normalized.listingType) count += 1;
  if (isBudgetFilterActive(normalized)) count += 1;
  count += normalized.bhk.length;
  if (normalized.location) count += 1;
  if (normalized.builder) count += 1;
  count += normalized.possession.length;
  if (isAreaFilterActive(normalized)) count += 1;
  count += normalized.amenities.length;
  count += Object.values(normalized.ai).filter(Boolean).length;
  return count;
}

export function filtersAreEqual(
  a: PropertyFilterState,
  b: PropertyFilterState,
): boolean {
  return (
    filtersToSearchParams(a).toString() === filtersToSearchParams(b).toString()
  );
}

export function isDefaultFilters(filters: PropertyFilterState): boolean {
  return countActiveFilters(filters) === 0;
}

export { DEFAULT_FILTER_STATE };
