"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SearchableMultiSelectProps {
  label: string;
  placeholder?: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
}

export default function SearchableMultiSelect({
  label,
  placeholder = "Search and select…",
  options,
  value,
  onChange,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

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
    const available = options.filter((option) => !value.includes(option));
    if (!normalized) return available;
    return available.filter((option) => option.toLowerCase().includes(normalized));
  }, [options, query, value]);

  const toggle = (option: string) => {
    onChange(
      value.includes(option) ? value.filter((item) => item !== option) : [...value, option],
    );
    setQuery("");
  };

  const remove = (option: string) => {
    onChange(value.filter((item) => item !== option));
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-2 block text-base font-medium text-neutral-800">{label}</label>

      {value.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="rounded-full text-emerald-600 transition-colors hover:text-emerald-900"
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
          🔍
        </span>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          className="w-full rounded-xl border border-neutral-200 bg-white py-3.5 pl-11 pr-4 text-base text-neutral-900 shadow-sm outline-none transition-all placeholder:text-neutral-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      {open ? (
        <ul className="absolute z-50 mt-2 max-h-52 w-full overflow-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-neutral-400">No locations found</li>
          ) : (
            filtered.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    toggle(option);
                    setOpen(false);
                  }}
                  className="flex w-full rounded-lg px-4 py-2.5 text-left text-base text-neutral-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {option}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
