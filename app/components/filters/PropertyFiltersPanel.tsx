"use client";

import type { PropertyFilterState } from "@/lib/properties/types";
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

interface PropertyFiltersPanelProps {
  filters: PropertyFilterState;
  onChange: (filters: PropertyFilterState) => void;
  builderOptions?: string[];
}

export default function PropertyFiltersPanel({
  filters,
  onChange,
  builderOptions = [],
}: PropertyFiltersPanelProps) {
  return (
    <div className="space-y-6">
      <PropertyTypeGroup filters={filters} onChange={onChange} />
      <ListingTypeGroup filters={filters} onChange={onChange} />
      <BudgetGroup filters={filters} onChange={onChange} />
      <BhkGroup filters={filters} onChange={onChange} />
      <LocationGroup filters={filters} onChange={onChange} />
      <BuilderGroup
        filters={filters}
        onChange={onChange}
        builderOptions={builderOptions}
      />
      <PossessionGroup filters={filters} onChange={onChange} />
      <AreaGroup filters={filters} onChange={onChange} />
      <AmenitiesGroup filters={filters} onChange={onChange} />
      <AiFiltersGroup filters={filters} onChange={onChange} />
    </div>
  );
}
