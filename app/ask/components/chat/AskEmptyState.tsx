"use client";

import type { PropertyContext } from "@/lib/ask/client";
import { STARTER_SUGGESTIONS } from "@/lib/ask/followUps";
import { BRAND } from "@/lib/brand";

interface AskEmptyStateProps {
  propertyContext: PropertyContext | null;
  onSuggest: (text: string) => void;
}

export function AskEmptyState({ propertyContext, onSuggest }: AskEmptyStateProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-heading-primary sm:text-3xl">
        {BRAND.productsNames.intelligence}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
        Enterprise real estate intelligence for India. Analyze properties, areas, builders,
        and investments — grounded in live listings, never fabricated data.
      </p>

      <div className="mt-6 w-full max-w-lg rounded-2xl border border-emerald-100 bg-[#F8FFFC] px-4 py-4 text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
          Analyzing
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {BRAND.analyzingSignals.map((signal) => (
            <li
              key={signal}
              className="flex items-center gap-2 text-[13px] font-medium text-heading-primary"
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white"
                aria-hidden
              >
                ✓
              </span>
              {signal}
            </li>
          ))}
        </ul>
      </div>

      {propertyContext ? (
        <div className="mt-5 max-w-md rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-left text-sm text-emerald-900">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Property context
          </p>
          <p className="mt-1 font-semibold">{propertyContext.name}</p>
          <p className="text-xs text-emerald-800/80">
            {propertyContext.location}, {propertyContext.city}
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTER_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggest(suggestion)}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-left text-sm text-body shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-md"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
