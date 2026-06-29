"use client";

import {
  AI_FILTER_OPTIONS,
  AMENITY_OPTIONS,
  BHK_OPTIONS,
  LISTING_TYPE_OPTIONS,
  LOCATION_OPTIONS,
  POSSESSION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "@/lib/properties/constants";
import type { PropertyFilterState } from "@/lib/properties/types";
import FilterSection from "./FilterSection";
import { AreaFilter, BudgetFilter } from "./RangeFilter";
import SearchableDropdown from "./SearchableDropdown";
import SelectableChip from "./SelectableChip";

type OnChange = (filters: PropertyFilterState) => void;

type GroupProps = {
  filters: PropertyFilterState;
  onChange: OnChange;
  compact?: boolean;
};

function toggleArrayValue<T extends string | number>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function wrapSection(
  title: string,
  compact: boolean | undefined,
  content: React.ReactNode,
) {
  if (compact) return content;
  return <FilterSection title={title}>{content}</FilterSection>;
}

export function PropertyTypeGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "Property Type",
    compact,
    <div className="flex flex-wrap gap-2">
      {PROPERTY_TYPE_OPTIONS.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          selected={filters.propertyTypes.includes(option.value)}
          onClick={() =>
            onChange({
              ...filters,
              propertyTypes: toggleArrayValue(
                filters.propertyTypes,
                option.value,
              ),
            })
          }
        />
      ))}
    </div>,
  );
}

export function ListingTypeGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "Buy / Rent",
    compact,
    <div className="flex flex-wrap gap-2">
      {LISTING_TYPE_OPTIONS.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          selected={filters.listingType === option.value}
          onClick={() =>
            onChange({
              ...filters,
              listingType:
                filters.listingType === option.value ? null : option.value,
            })
          }
        />
      ))}
    </div>,
  );
}

export function BudgetGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "Budget",
    compact,
    <BudgetFilter
      minPrice={filters.minPrice}
      maxPrice={filters.maxPrice}
      onChange={(minPrice, maxPrice) =>
        onChange({ ...filters, minPrice, maxPrice })
      }
    />,
  );
}

export function BhkGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "Bedrooms",
    compact,
    <div className="flex flex-wrap gap-2">
      {BHK_OPTIONS.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          selected={filters.bhk.includes(option.value)}
          onClick={() =>
            onChange({
              ...filters,
              bhk: toggleArrayValue(filters.bhk, option.value),
            })
          }
        />
      ))}
    </div>,
  );
}

export function LocationGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "Location",
    compact,
    <SearchableDropdown
      label="City / Area"
      placeholder="Search locations..."
      value={filters.location}
      options={LOCATION_OPTIONS}
      onChange={(location) => onChange({ ...filters, location })}
    />,
  );
}

export function BuilderGroup({
  filters,
  onChange,
  compact,
  builderOptions = [],
}: GroupProps & { builderOptions?: string[] }) {
  return wrapSection(
    "Builder",
    compact,
    <SearchableDropdown
      label="Builder"
      placeholder="Search builders..."
      value={filters.builder}
      options={builderOptions}
      onChange={(builder) => onChange({ ...filters, builder })}
    />,
  );
}

export function PossessionGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "Possession",
    compact,
    <div className="flex flex-wrap gap-2">
      {POSSESSION_OPTIONS.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          selected={filters.possession.includes(option.value)}
          onClick={() =>
            onChange({
              ...filters,
              possession: toggleArrayValue(
                filters.possession,
                option.value,
              ),
            })
          }
        />
      ))}
    </div>,
  );
}

export function AreaGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "Area",
    compact,
    <AreaFilter
      minArea={filters.minArea}
      maxArea={filters.maxArea}
      onChange={(minArea, maxArea) =>
        onChange({ ...filters, minArea, maxArea })
      }
    />,
  );
}

export function AmenitiesGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "Amenities",
    compact,
    <div className="flex flex-wrap gap-2">
      {AMENITY_OPTIONS.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          selected={filters.amenities.includes(option.value)}
          onClick={() =>
            onChange({
              ...filters,
              amenities: toggleArrayValue(
                filters.amenities,
                option.value,
              ),
            })
          }
        />
      ))}
    </div>,
  );
}

export function AiFiltersGroup({ filters, onChange, compact }: GroupProps) {
  return wrapSection(
    "AI Filters",
    compact,
    <div className="flex flex-wrap gap-2">
      {AI_FILTER_OPTIONS.map((option) => (
        <SelectableChip
          key={option.key}
          label={option.label}
          selected={filters.ai[option.key]}
          onClick={() =>
            onChange({
              ...filters,
              ai: {
                ...filters.ai,
                [option.key]: !filters.ai[option.key],
              },
            })
          }
        />
      ))}
    </div>,
  );
}
