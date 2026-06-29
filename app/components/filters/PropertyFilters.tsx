"use client";

import { useState } from "react";
import { countActiveFilters, isAreaFilterActive, isBudgetFilterActive } from "@/lib/properties/urlFilters";
import type { PropertyFilterState } from "@/lib/properties/types";
import ActiveFilterChips from "./ActiveFilterChips";
import FilterDropdown from "./FilterDropdown";
import {
  AiFiltersGroup,
  AmenitiesGroup,
  AreaGroup,
  BhkGroup,
  BudgetGroup,
  BuilderGroup,
  ListingTypeGroup,
  LocationGroup,
  PossessionGroup,
  PropertyTypeGroup,
} from "./filterGroups";
import MobileFilterDrawer from "./MobileFilterDrawer";

interface PropertyFiltersProps {
  filters: PropertyFilterState;
  onChange: (filters: PropertyFilterState) => void;
  onClearAll: () => void;
  resultCount: number;
  builderOptions?: string[];
}

export default function PropertyFilters({
  filters,
  onChange,
  onClearAll,
  resultCount,
  builderOptions = [],
}: PropertyFiltersProps) {
  const activeCount = countActiveFilters(filters);
  const aiActiveCount = Object.values(filters.ai).filter(Boolean).length;

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-neutral-200/80 bg-white/95 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {resultCount} propert{resultCount === 1 ? "y" : "ies"} found
            </p>
            {activeCount > 0 && (
              <p className="text-xs text-neutral-500">
                {activeCount} active filter{activeCount === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <MobileFilterTrigger
              activeCount={activeCount}
              filters={filters}
              onChange={onChange}
              builderOptions={builderOptions}
            />
          </div>
        </div>

        {/* Desktop filter bar */}
        <div className="hidden lg:block">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterDropdown
              label="Property Type"
              activeCount={filters.propertyTypes.length}
            >
              <PropertyTypeGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown
              label="Buy / Rent"
              activeCount={filters.listingType ? 1 : 0}
            >
              <ListingTypeGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown
              label="Budget"
              activeCount={isBudgetFilterActive(filters) ? 1 : 0}
            >
              <BudgetGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Bedrooms" activeCount={filters.bhk.length}>
              <BhkGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Location" activeCount={filters.location ? 1 : 0}>
              <LocationGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Builder" activeCount={filters.builder ? 1 : 0}>
              <BuilderGroup
                compact
                filters={filters}
                onChange={onChange}
                builderOptions={builderOptions}
              />
            </FilterDropdown>

            <FilterDropdown
              label="Possession"
              activeCount={filters.possession.length}
            >
              <PossessionGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown
              label="Area"
              activeCount={isAreaFilterActive(filters) ? 1 : 0}
            >
              <AreaGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown
              label="Amenities"
              activeCount={filters.amenities.length}
            >
              <AmenitiesGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="AI Filters" activeCount={aiActiveCount}>
              <AiFiltersGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>
          </div>
        </div>

        <div className="mt-3">
          <ActiveFilterChips
            filters={filters}
            onChange={onChange}
            onClearAll={onClearAll}
          />
        </div>
      </div>
    </>
  );
}

function MobileFilterTrigger({
  activeCount,
  filters,
  onChange,
  builderOptions,
}: {
  activeCount: number;
  filters: PropertyFilterState;
  onChange: (filters: PropertyFilterState) => void;
  builderOptions: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition-all duration-200 hover:border-neutral-300 hover:shadow-md active:scale-[0.98] lg:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M7 12h10M10 17h4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <MobileFilterDrawer
        open={open}
        filters={filters}
        activeCount={activeCount}
        onChange={onChange}
        onClose={() => setOpen(false)}
        builderOptions={builderOptions}
      />
    </>
  );
}
