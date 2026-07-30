"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterProperties } from "@/lib/properties/filterProperties";
import { getLiveProperties } from "@/lib/properties/getLiveProperties";
import {
  extractBuilderOptions,
  mapPropertyRowToListing,
} from "@/lib/properties/queries";
import type { ListingProperty } from "@/lib/properties/types";
import { usePropertyFilters } from "@/lib/properties/usePropertyFilters";
import PropertyFilters from "./filters/PropertyFilters";
import PropertyGrid from "./PropertyGrid";

function ListingsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading listings">
      <div className="h-24 animate-shimmer rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-neutral-100">
            <div className="aspect-video animate-shimmer" />
            <div className="space-y-3 p-4">
              <div className="h-7 w-32 animate-shimmer rounded-lg" />
              <div className="h-4 w-48 animate-shimmer rounded-lg" />
              <div className="h-12 w-full animate-shimmer rounded-xl" />
            </div>
          </div>
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
        New listings are added regularly. Check back soon or explore AreaIQ
        Intelligence for market insights in the meantime.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/ask"
          className="inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(74, 170, 39,0.35)] transition-all hover:brightness-105"
          style={{ backgroundColor: "#4AAA27" }}
        >
          Ask AreaIQ Intelligence
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
    let firstLoad = true;

    async function loadProperties() {
      if (firstLoad) setLoading(true);
      const rows = await getLiveProperties({ includeSeller: true });
      const data = rows.map((row) => mapPropertyRowToListing(row));
      if (!cancelled) {
        setProperties(data);
        setLoading(false);
        firstLoad = false;
      }
    }

    loadProperties();

    const onFocus = () => {
      void loadProperties();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const builderOptions = useMemo(
    () => extractBuilderOptions(properties),
    [properties],
  );

  const scoreFiltersAvailable = useMemo(
    () =>
      properties.some(
        (property) =>
          property.growthScore != null || property.rentalYield != null,
      ),
    [properties],
  );

  // Drop score-based AI URL flags when catalog has no growth/yield data
  useEffect(() => {
    if (scoreFiltersAvailable || properties.length === 0) return;
    const { ai } = filters;
    if (
      !ai.highAreaIQScore &&
      !ai.highRentalYield &&
      !ai.highAppreciation &&
      !ai.bestInvestment
    ) {
      return;
    }
    setFilters((prev) => ({
      ...prev,
      ai: {
        ...prev.ai,
        highAreaIQScore: false,
        highRentalYield: false,
        highAppreciation: false,
        bestInvestment: false,
      },
    }));
  }, [
    scoreFiltersAvailable,
    properties.length,
    filters.ai.highAreaIQScore,
    filters.ai.highRentalYield,
    filters.ai.highAppreciation,
    filters.ai.bestInvestment,
    setFilters,
  ]);

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
        scoreFiltersAvailable={scoreFiltersAvailable}
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
            className="mt-6 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(74, 170, 39,0.35)] transition-all hover:brightness-105"
            style={{ backgroundColor: "#4AAA27" }}
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
