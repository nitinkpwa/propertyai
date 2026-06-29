"use client";

import {
  AmenitiesGroup,
  AreaGroup,
  BudgetGroup,
  BuilderGroup,
} from "@/app/components/filters/filterGroups";
import type { PropertyFilterState } from "@/lib/properties/types";

interface AskRefinePanelProps {
  filters: PropertyFilterState;
  builderOptions: string[];
  onChange: (filters: PropertyFilterState) => void;
  onRefine: () => void;
  loading?: boolean;
}

export default function AskRefinePanel({
  filters,
  builderOptions,
  onChange,
  onRefine,
  loading = false,
}: AskRefinePanelProps) {
  return (
    <section className="mt-10 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-bold text-neutral-900 sm:text-lg">
        Need better recommendations?
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        Narrow results by budget, area, builder, or amenities.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Budget
          </p>
          <BudgetGroup compact filters={filters} onChange={onChange} />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Area
          </p>
          <AreaGroup compact filters={filters} onChange={onChange} />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Builder
          </p>
          <BuilderGroup
            compact
            filters={filters}
            onChange={onChange}
            builderOptions={builderOptions}
          />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Amenities
          </p>
          <AmenitiesGroup compact filters={filters} onChange={onChange} />
        </div>
      </div>

      <button
        type="button"
        onClick={onRefine}
        disabled={loading}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Refining..." : "Refine Search"}
      </button>
    </section>
  );
}
