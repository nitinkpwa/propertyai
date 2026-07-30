"use client";

import { getActiveFilterChips } from "@/lib/properties/activeFilterChips";
import { DEFAULT_FILTER_STATE } from "@/lib/properties/types";
import type { PropertyFilterState } from "@/lib/properties/types";
import type { PropertyFilterUpdater } from "@/lib/properties/usePropertyFilters";
import RemovableChip from "./RemovableChip";

interface ActiveFilterChipsProps {
  filters: PropertyFilterState;
  onChange: (filters: PropertyFilterUpdater) => void;
  onClearAll: () => void;
}

export default function ActiveFilterChips({
  filters,
  onChange,
  onClearAll,
}: ActiveFilterChipsProps) {
  const chips = getActiveFilterChips(filters);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <RemovableChip
          key={chip.id}
          label={chip.label}
          onRemove={() => onChange((prev) => chip.remove(prev))}
        />
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-neutral-100 hover:text-heading-secondary"
      >
        Clear All Filters
      </button>
    </div>
  );
}

export function hasActiveFilters(filters: PropertyFilterState): boolean {
  return getActiveFilterChips(filters).length > 0;
}

export { DEFAULT_FILTER_STATE };
