"use client";

import { useCallback, useEffect, useState } from "react";
import { countActiveFilters, isAreaFilterActive, isBudgetFilterActive } from "@/lib/properties/urlFilters";
import type { PropertyFilterState } from "@/lib/properties/types";
import ActiveFilterChips from "./ActiveFilterChips";
import FilterDropdown from "./FilterDropdown";
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
import { MobileFilterTrigger } from "./MobileFilterDrawer";

const POPULAR = ["Mohali", "Chandigarh", "Zirakpur", "Panchkula", "2 BHK", "Under 1 Cr"];
const RECENT_KEY = "areaiq_recent_searches";

interface PropertyFiltersProps {
  filters: PropertyFilterState;
  onChange: (filters: PropertyFilterState) => void;
  onClearAll: () => void;
  resultCount: number;
  builderOptions?: string[];
}

export default function PropertyFilters({
  filters,
  onChange,
  onClearAll,
  resultCount,
  builderOptions = [],
}: PropertyFiltersProps) {
  const activeCount = countActiveFilters(filters);
  const aiActiveCount = Object.values(filters.ai).filter(Boolean).length;
  const [query, setQuery] = useState(filters.location ?? "");
  const [recent, setRecent] = useState<string[]>([]);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const commitSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      onChange({ ...filters, location: trimmed });
      if (!trimmed) return;
      setRecent((prev) => {
        const next = [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, 6);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [filters, onChange],
  );

  const startVoice = () => {
    const SR =
      typeof window !== "undefined"
        ? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition ||
          (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
        : null;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setQuery(text);
      commitSearch(text);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <>
      <div className="sticky-below-nav z-layout-sticky -mx-4 mb-6 border-b border-neutral-200/80 bg-white/95 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {/* Mobile always-visible search */}
        <div className="mb-3 lg:hidden">
          <div className="relative flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitSearch(query);
                }}
                placeholder="Search locality, project, builder"
                enterKeyHint="search"
                autoComplete="off"
                className="h-[52px] w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-11 pr-12 text-base text-input outline-none transition-all placeholder:text-placeholder focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
                aria-label="Search properties"
              />
              <button
                type="button"
                onClick={startVoice}
                className={`absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg ${
                  listening ? "text-brand" : "text-muted"
                }`}
                aria-label="Voice search"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
                  <path d="M19 11a7 7 0 0 1-14 0M12 18v3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <MobileFilterTrigger
              activeCount={activeCount}
              filters={filters}
              onChange={onChange}
              onClearAll={onClearAll}
              builderOptions={builderOptions}
            />
          </div>

          {(recent.length > 0 || POPULAR.length > 0) && (
            <div className="mt-3 space-y-2">
              {recent.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-label">
                    Recent
                  </p>
                  <div className="flex gap-2 overflow-x-auto scroll-touch pb-1">
                    {recent.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setQuery(r);
                          commitSearch(r);
                        }}
                        className="shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-body"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-label">
                  Popular
                </p>
                <div className="flex gap-2 overflow-x-auto scroll-touch pb-1">
                  {POPULAR.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setQuery(p);
                        commitSearch(p);
                      }}
                      className="shrink-0 rounded-full bg-brand-muted px-3 py-2 text-sm font-medium text-brand-dark"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-heading-primary">
              {resultCount} propert{resultCount === 1 ? "y" : "ies"} found
            </p>
            {activeCount > 0 && (
              <p className="text-xs text-muted">
                {activeCount} active filter{activeCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>

        {/* Desktop filter bar */}
        <div className="hidden lg:block">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterDropdown label="Property Type" activeCount={filters.propertyTypes.length}>
              <PropertyTypeGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Buy / Rent" activeCount={filters.listingType ? 1 : 0}>
              <ListingTypeGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Budget" activeCount={isBudgetFilterActive(filters) ? 1 : 0}>
              <BudgetGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Bedrooms" activeCount={filters.bhk.length}>
              <BhkGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Location" activeCount={filters.location ? 1 : 0}>
              <LocationGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Builder" activeCount={filters.builder ? 1 : 0}>
              <BuilderGroup
                compact
                filters={filters}
                onChange={onChange}
                builderOptions={builderOptions}
              />
            </FilterDropdown>

            <FilterDropdown label="Possession" activeCount={filters.possession.length}>
              <PossessionGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Area" activeCount={isAreaFilterActive(filters) ? 1 : 0}>
              <AreaGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="Amenities" activeCount={filters.amenities.length}>
              <AmenitiesGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>

            <FilterDropdown label="AI Filters" activeCount={aiActiveCount}>
              <AiFiltersGroup compact filters={filters} onChange={onChange} />
            </FilterDropdown>
          </div>
        </div>

        <div className="mt-3">
          <ActiveFilterChips
            filters={filters}
            onChange={onChange}
            onClearAll={onClearAll}
          />
        </div>
      </div>
    </>
  );
}

/* Minimal SpeechRecognition typings for voice search */
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
