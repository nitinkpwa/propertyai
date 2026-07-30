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
import type { AIFilterFlags, PropertyFilterState } from "@/lib/properties/types";
import type { PropertyFilterUpdater } from "@/lib/properties/usePropertyFilters";
import FilterSection from "./FilterSection";
import { AreaFilter, BudgetFilter } from "./RangeFilter";
import SearchableDropdown from "./SearchableDropdown";
import SelectableChip from "./SelectableChip";

type OnChange = (filters: PropertyFilterUpdater) => void;

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
            onChange((prev) => ({
              ...prev,
              propertyTypes: toggleArrayValue(
                prev.propertyTypes,
                option.value,
              ),
            }))
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
            onChange((prev) => ({
              ...prev,
              listingType:
                prev.listingType === option.value ? null : option.value,
            }))
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
        onChange((prev) => ({ ...prev, minPrice, maxPrice }))
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
            onChange((prev) => ({
              ...prev,
              bhk: toggleArrayValue(prev.bhk, option.value),
            }))
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
      onChange={(location) =>
        onChange((prev) => ({ ...prev, location }))
      }
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
      onChange={(builder) =>
        onChange((prev) => ({ ...prev, builder }))
      }
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
            onChange((prev) => ({
              ...prev,
              possession: toggleArrayValue(
                prev.possession,
                option.value,
              ),
            }))
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
        onChange((prev) => ({ ...prev, minArea, maxArea }))
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
            onChange((prev) => ({
              ...prev,
              amenities: toggleArrayValue(
                prev.amenities,
                option.value,
              ),
            }))
          }
        />
      ))}
    </div>,
  );
}

const SCORE_AI_KEYS: Array<keyof AIFilterFlags> = [
  "highAreaIQScore",
  "highRentalYield",
  "highAppreciation",
  "bestInvestment",
];

export function AiFiltersGroup({
  filters,
  onChange,
  compact,
  scoreFiltersAvailable = true,
}: GroupProps & { scoreFiltersAvailable?: boolean }) {
  return wrapSection(
    "AI Filters",
    compact,
    <div className="space-y-3">
      {!scoreFiltersAvailable ? (
        <p className="text-xs text-muted">
          AreaIQ score &amp; yield filters — Coming Soon
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {AI_FILTER_OPTIONS.map((option) => {
          const isScoreFilter = SCORE_AI_KEYS.includes(option.key);
          const disabled = isScoreFilter && !scoreFiltersAvailable;

          if (disabled) {
            return (
              <span
                key={option.key}
                className="inline-flex cursor-not-allowed items-center rounded-full border border-dashed border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-muted"
                title="Coming Soon"
              >
                {option.label}
                <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-label">
                  Soon
                </span>
              </span>
            );
          }

          return (
            <SelectableChip
              key={option.key}
              label={option.label}
              selected={filters.ai[option.key]}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  ai: {
                    ...prev.ai,
                    [option.key]: !prev.ai[option.key],
                  },
                }))
              }
            />
          );
        })}
      </div>
    </div>,
  );
}
