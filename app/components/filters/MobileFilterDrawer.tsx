"use client";

import { useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import PropertyFiltersPanel from "./PropertyFiltersPanel";
import type { PropertyFilterState } from "@/lib/properties/types";

interface MobileFilterDrawerProps {
  open: boolean;
  filters: PropertyFilterState;
  activeCount: number;
  onChange: (filters: PropertyFilterState) => void;
  onClose: () => void;
  onReset?: () => void;
  builderOptions?: string[];
}

export default function MobileFilterDrawer({
  open,
  filters,
  activeCount,
  onChange,
  onClose,
  onReset,
  builderOptions = [],
}: MobileFilterDrawerProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      description={
        activeCount > 0
          ? `${activeCount} active filter${activeCount === 1 ? "" : "s"}`
          : "Refine your search"
      }
      tall
      footer={
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => {
              onReset?.();
            }}
          >
            Reset
          </Button>
          <Button type="button" fullWidth onClick={onClose}>
            Apply
          </Button>
        </div>
      }
    >
      <PropertyFiltersPanel
        filters={filters}
        onChange={onChange}
        builderOptions={builderOptions}
      />
    </BottomSheet>
  );
}

/** Standalone trigger used by PropertyFilters */
export function MobileFilterTrigger({
  activeCount,
  filters,
  onChange,
  onClearAll,
  builderOptions = [],
}: {
  activeCount: number;
  filters: PropertyFilterState;
  onChange: (filters: PropertyFilterState) => void;
  onClearAll?: () => void;
  builderOptions?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-body shadow-sm lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
        Filters
        {activeCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
      <MobileFilterDrawer
        open={open}
        filters={filters}
        activeCount={activeCount}
        onChange={onChange}
        onClose={() => setOpen(false)}
        onReset={onClearAll}
        builderOptions={builderOptions}
      />
    </>
  );
}
