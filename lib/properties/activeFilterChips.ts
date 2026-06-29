import {
  AI_FILTER_OPTIONS,
  AMENITY_OPTIONS,
  BHK_OPTIONS,
  POSSESSION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "@/lib/properties/constants";
import {
  isAreaFilterActive,
  isBudgetFilterActive,
} from "@/lib/properties/urlFilters";
import { formatIndianPrice } from "@/app/components/filters/utils";
import type { PropertyFilterState } from "@/lib/properties/types";

export interface ActiveFilterChip {
  id: string;
  label: string;
  remove: (filters: PropertyFilterState) => PropertyFilterState;
}

export function getActiveFilterChips(
  filters: PropertyFilterState,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const type of filters.propertyTypes) {
    const label =
      PROPERTY_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
      type;
    chips.push({
      id: `propertyType-${type}`,
      label,
      remove: (current) => ({
        ...current,
        propertyTypes: current.propertyTypes.filter((item) => item !== type),
      }),
    });
  }

  if (filters.listingType) {
    chips.push({
      id: "listingType",
      label: filters.listingType === "buy" ? "Buy" : "Rent",
      remove: (current) => ({ ...current, listingType: null }),
    });
  }

  if (isBudgetFilterActive(filters)) {
    const min = filters.minPrice;
    const max = filters.maxPrice;
    let label = "";

    if (min != null && max != null) {
      label = `${formatIndianPrice(min)} – ${formatIndianPrice(max)}`;
    } else if (min != null) {
      label = `From ${formatIndianPrice(min)}`;
    } else if (max != null) {
      label = `Up to ${formatIndianPrice(max)}`;
    }

    chips.push({
      id: "budget",
      label,
      remove: (current) => ({ ...current, minPrice: null, maxPrice: null }),
    });
  }

  for (const bhk of filters.bhk) {
    const label =
      BHK_OPTIONS.find((option) => option.value === bhk)?.label ??
      `${bhk} BHK`;
    chips.push({
      id: `bhk-${bhk}`,
      label,
      remove: (current) => ({
        ...current,
        bhk: current.bhk.filter((item) => item !== bhk),
      }),
    });
  }

  if (filters.location) {
    chips.push({
      id: "location",
      label: filters.location,
      remove: (current) => ({ ...current, location: null }),
    });
  }

  if (filters.builder) {
    chips.push({
      id: "builder",
      label: filters.builder,
      remove: (current) => ({ ...current, builder: null }),
    });
  }

  for (const possession of filters.possession) {
    const label =
      POSSESSION_OPTIONS.find((option) => option.value === possession)?.label ??
      possession;
    chips.push({
      id: `possession-${possession}`,
      label,
      remove: (current) => ({
        ...current,
        possession: current.possession.filter((item) => item !== possession),
      }),
    });
  }

  if (isAreaFilterActive(filters)) {
    const min = filters.minArea;
    const max = filters.maxArea;
    let label = "";

    if (min != null && max != null) {
      label = `${min.toLocaleString("en-IN")} – ${max.toLocaleString("en-IN")} sq ft`;
    } else if (min != null) {
      label = `From ${min.toLocaleString("en-IN")} sq ft`;
    } else if (max != null) {
      label = `Up to ${max.toLocaleString("en-IN")} sq ft`;
    }

    chips.push({
      id: "area",
      label,
      remove: (current) => ({ ...current, minArea: null, maxArea: null }),
    });
  }

  for (const amenity of filters.amenities) {
    const label =
      AMENITY_OPTIONS.find((option) => option.value === amenity)?.label ??
      amenity;
    chips.push({
      id: `amenity-${amenity}`,
      label,
      remove: (current) => ({
        ...current,
        amenities: current.amenities.filter((item) => item !== amenity),
      }),
    });
  }

  for (const option of AI_FILTER_OPTIONS) {
    if (filters.ai[option.key]) {
      chips.push({
        id: `ai-${option.key}`,
        label: option.label,
        remove: (current) => ({
          ...current,
          ai: { ...current.ai, [option.key]: false },
        }),
      });
    }
  }

  return chips;
}
