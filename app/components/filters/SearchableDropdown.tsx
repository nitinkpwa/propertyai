"use client";

import { useEffect, useMemo, useState } from "react";
import { suggestAreas } from "@/lib/location/registry";
import { cn } from "./utils";

interface SearchableDropdownProps {
  label: string;
  placeholder?: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
}

export default function SearchableDropdown({
  label,
  placeholder = "Search...",
  value,
  options,
  onChange,
}: SearchableDropdownProps) {
  const [query, setQuery] = useState(value ?? "");

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;

    // Prefer Area Registry ranking so micro-markets beat parent cities
    const suggested = suggestAreas(normalized, 24).map((s) => s.displayName);
    const optionSet = new Set(options);
    const ranked = suggested.filter((name) => optionSet.has(name));
    const rankedSet = new Set(ranked);
    const rest = options.filter(
      (option) =>
        !rankedSet.has(option) &&
        option.toLowerCase().includes(normalized),
    );
    return [...ranked, ...rest];
  }, [options, query]);

  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-label">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onBlur={() => {
            const trimmed = query.trim();
            const exactMatch = options.find(
              (option) => option.toLowerCase() === trimmed.toLowerCase(),
            );
            if (exactMatch) {
              onChange(exactMatch);
              setQuery(exactMatch);
            } else if (value) {
              setQuery(value);
            } else if (!trimmed) {
              setQuery("");
            }
            // Free-text locality search: commit typed value when not an exact option
            else if (trimmed) {
              onChange(trimmed);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!event.target.value.trim()) onChange(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const trimmed = query.trim();
              if (!trimmed) {
                onChange(null);
                return;
              }
              const exactMatch = options.find(
                (option) => option.toLowerCase() === trimmed.toLowerCase(),
              );
              onChange(exactMatch ?? trimmed);
              setQuery(exactMatch ?? trimmed);
            }
          }}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-heading-primary shadow-sm outline-none transition-all duration-200 placeholder:text-placeholder focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-body"
            aria-label={`Clear ${label}`}
          >
            ×
          </button>
        )}
      </div>

      <ul className="mt-2 max-h-52 w-full overflow-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted">No matches</li>
        ) : (
          filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setQuery(option);
                }}
                className={cn(
                  "flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50",
                  value === option
                    ? "bg-emerald-50 font-medium text-emerald-800"
                    : "text-body",
                )}
              >
                {option}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
