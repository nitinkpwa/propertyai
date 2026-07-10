"use client";

import { useState } from "react";

interface AskChatInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
  recentSearches: string[];
}

export function AskChatInput({ onSubmit, loading, recentSearches }: AskChatInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const text = query.trim();
    if (!text || loading) return;
    setQuery("");
    onSubmit(text);
  };

  return (
    <div className="border-t border-neutral-200 bg-white px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {recentSearches.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Recent:</span>
            {recentSearches.slice(0, 5).map((search) => (
              <button
                key={search}
                type="button"
                onClick={() => onSubmit(search)}
                disabled={loading}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-body transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
              >
                {search.length > 28 ? `${search.slice(0, 27)}…` : search}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex items-end gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-sm focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100"
        >
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask about properties, areas, investment, compare projects..."
            disabled={loading}
            rows={1}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-sm text-heading-primary outline-none placeholder:text-placeholder disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-muted">
          AreaIQ uses live Supabase listings — never fabricated property data.
        </p>
      </div>
    </div>
  );
}
