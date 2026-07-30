"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_FILTER_STATE,
  type PropertyFilterState,
} from "./types";
import {
  filtersAreEqual,
  filtersFromSearchParams,
  filtersToSearchParams,
  normalizeFilterState,
} from "./urlFilters";

export type PropertyFilterUpdater =
  | PropertyFilterState
  | ((prev: PropertyFilterState) => PropertyFilterState);

function hrefForFilters(pathname: string, filters: PropertyFilterState): string {
  const query = filtersToSearchParams(filters).toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Local filter state synced to URL search params.
 * Local state is the source of truth for rapid multi-select; URL enables
 * refresh / share / browser back.
 */
export function usePropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFiltersState] = useState<PropertyFilterState>(() =>
    filtersFromSearchParams(searchParams),
  );

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  /** Last query string we wrote — used to ignore our own push vs back/forward */
  const lastWrittenQuery = useRef(filtersToSearchParams(filters).toString());

  const syncUrl = useCallback(
    (next: PropertyFilterState) => {
      const query = filtersToSearchParams(next).toString();
      const href = hrefForFilters(pathname, next);
      lastWrittenQuery.current = query;

      // App Router can no-op same-pathname navigations when only clearing search.
      // Keep the address bar honest so refresh / share / back stay correct.
      if (typeof window !== "undefined") {
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== href) {
          window.history.pushState(window.history.state, "", href);
        }
      }

      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  // Browser back/forward or external URL change
  useEffect(() => {
    const onPopState = () => {
      const query = window.location.search.replace(/^\?/, "");
      if (query === lastWrittenQuery.current) return;
      lastWrittenQuery.current = query;
      const fromUrl = filtersFromSearchParams(
        new URLSearchParams(window.location.search),
      );
      filtersRef.current = fromUrl;
      setFiltersState(fromUrl);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Soft navigations that still update useSearchParams (e.g. shared links)
  useEffect(() => {
    const query = searchParams.toString();
    if (query === lastWrittenQuery.current) return;
    lastWrittenQuery.current = query;
    const fromUrl = filtersFromSearchParams(searchParams);
    filtersRef.current = fromUrl;
    setFiltersState(fromUrl);
  }, [searchParams]);

  const setFilters = useCallback(
    (nextFilters: PropertyFilterUpdater) => {
      const current = filtersRef.current;
      const resolved =
        typeof nextFilters === "function" ? nextFilters(current) : nextFilters;
      const normalized = normalizeFilterState(resolved);

      if (filtersAreEqual(normalized, current)) {
        return;
      }

      filtersRef.current = normalized;
      setFiltersState(normalized);
      syncUrl(normalized);
    },
    [syncUrl],
  );

  const clearFilters = useCallback(() => {
    if (
      filtersAreEqual(filtersRef.current, DEFAULT_FILTER_STATE) &&
      !searchParams.toString() &&
      typeof window !== "undefined" &&
      !window.location.search
    ) {
      return;
    }
    filtersRef.current = DEFAULT_FILTER_STATE;
    setFiltersState(DEFAULT_FILTER_STATE);
    syncUrl(DEFAULT_FILTER_STATE);
  }, [searchParams, syncUrl]);

  return { filters, setFilters, clearFilters };
}
