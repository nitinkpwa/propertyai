"use client";

import PropertyGrid from "@/app/components/PropertyGrid";
import type { ListingProperty } from "@/lib/properties/types";
import type { AskSortDirection, AskSortKey } from "@/lib/ask/types";
import { sortLabel } from "@/lib/ask/sort";

interface AskSortBarProps {
  sortKey: AskSortKey;
  sortDirection: AskSortDirection;
  onSortChange: (key: AskSortKey) => void;
}

export function AskSortBar({ sortKey, sortDirection, onSortChange }: AskSortBarProps) {
  const keys: AskSortKey[] = ["price", "rentalYield", "growthScore"];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-neutral-500">Sort:</span>
      {keys.map((key) => {
        const active = sortKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSortChange(key)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {sortLabel(key)}
            <span aria-hidden>{active ? (sortDirection === "desc" ? "▼" : "▲") : "▼"}</span>
          </button>
        );
      })}
    </div>
  );
}

interface AskResultsGridProps {
  listings: ListingProperty[];
}

export function AskResultsGrid({ listings }: AskResultsGridProps) {
  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-14 text-center">
        <p className="text-base font-semibold text-neutral-900">No properties match these filters</p>
        <p className="mt-2 text-sm text-neutral-500">
          Try adjusting your refine options or search with a broader query.
        </p>
      </div>
    );
  }

  return <PropertyGrid properties={listings} />;
}
