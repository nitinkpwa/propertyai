"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value ?? "");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-label">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
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
            } else {
              setQuery("");
            }
            setOpen(false);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (!event.target.value.trim()) onChange(null);
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

      {open && (
        <ul className="absolute z-50 mt-2 max-h-52 w-full overflow-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
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
                    setOpen(false);
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
      )}
    </div>
  );
}
