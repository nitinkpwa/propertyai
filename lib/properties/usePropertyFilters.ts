"use client";

import { useCallback, useMemo } from "react";
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

/**
 * URL-driven filter state. Swap `filterProperties` for Supabase in the
 * listings component without changing this hook.
 */
export function usePropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const setFilters = useCallback(
    (nextFilters: PropertyFilterState) => {
      const normalized = normalizeFilterState(nextFilters);

      if (filtersAreEqual(normalized, filters)) {
        return;
      }

      const params = filtersToSearchParams(normalized);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const clearFilters = useCallback(() => {
    if (filtersAreEqual(filters, DEFAULT_FILTER_STATE)) {
      return;
    }
    router.push(pathname, { scroll: false });
  }, [filters, pathname, router]);

  return { filters, setFilters, clearFilters };
}
