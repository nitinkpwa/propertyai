"use client";

import { useEffect } from "react";
import PropertyFiltersPanel from "./PropertyFiltersPanel";
import type { PropertyFilterState } from "@/lib/properties/types";

interface MobileFilterDrawerProps {
  open: boolean;
  filters: PropertyFilterState;
  activeCount: number;
  onChange: (filters: PropertyFilterState) => void;
  onClose: () => void;
  builderOptions?: string[];
}

export default function MobileFilterDrawer({
  open,
  filters,
  activeCount,
  onChange,
  onClose,
  builderOptions = [],
}: MobileFilterDrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-neutral-900/25 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(420px,100vw)] flex-col bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Filters</h2>
            {activeCount > 0 && (
              <p className="text-xs text-neutral-500">
                {activeCount} active filter{activeCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <PropertyFiltersPanel
            filters={filters}
            onChange={onChange}
            builderOptions={builderOptions}
          />
        </div>

        <div className="border-t border-neutral-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)]"
            style={{ backgroundColor: "#22C55E" }}
          >
            Show Results
          </button>
        </div>
      </aside>
    </>
  );
}
