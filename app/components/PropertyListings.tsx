"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterProperties } from "@/lib/properties/filterProperties";
import {
  extractBuilderOptions,
  fetchListingProperties,
} from "@/lib/properties/queries";
import type { ListingProperty } from "@/lib/properties/types";
import { usePropertyFilters } from "@/lib/properties/usePropertyFilters";
import PropertyFilters from "./filters/PropertyFilters";
import PropertyGrid from "./PropertyGrid";

function ListingsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-24 rounded-2xl bg-neutral-200/70" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-96 rounded-2xl bg-neutral-200/70" />
        ))}
      </div>
    </div>
  );
}

function EmptyCatalogState() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
        🏡
      </div>
      <p className="text-lg font-semibold text-heading-primary">
        No properties available yet
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        New listings are added regularly. Check back soon or explore our AI
        assistant for market insights in the meantime.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/ask"
          className="inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:brightness-105"
          style={{ backgroundColor: "#22C55E" }}
        >
          Ask AI Assistant
        </Link>
        <Link
          href="/"
          className="inline-flex rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-body transition-colors hover:bg-neutral-50"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function PropertyListings() {
  const { filters, setFilters, clearFilters } = usePropertyFilters();
  const [properties, setProperties] = useState<ListingProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      setLoading(true);
      const data = await fetchListingProperties();
      if (!cancelled) {
        setProperties(data);
        setLoading(false);
      }
    }

    loadProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  const builderOptions = useMemo(
    () => extractBuilderOptions(properties),
    [properties],
  );

  const filteredProperties = useMemo(
    () => filterProperties(properties, filters),
    [properties, filters],
  );

  if (loading) {
    return <ListingsSkeleton />;
  }

  if (properties.length === 0) {
    return <EmptyCatalogState />;
  }

  return (
    <>
      <PropertyFilters
        filters={filters}
        onChange={setFilters}
        onClearAll={clearFilters}
        resultCount={filteredProperties.length}
        builderOptions={builderOptions}
      />

      {filteredProperties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-lg font-semibold text-heading-primary">
            No properties found
          </p>
          <p className="mt-2 text-sm text-muted">
            No listings match your current filters. Try adjusting your criteria
            or clear filters to browse all properties.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:brightness-105"
            style={{ backgroundColor: "#22C55E" }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <PropertyGrid properties={filteredProperties} />
      )}
    </>
  );
}
