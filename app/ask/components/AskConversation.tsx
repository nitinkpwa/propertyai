"use client";

import type { ListingProperty } from "@/lib/properties/types";
import type { AskSearchStats, AskSection, AskTurn } from "@/lib/ask/types";
import { formatPriceShort } from "@/lib/ask/responses";
import { AskResultsGrid } from "./AskResultsSection";

function formatInline(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

interface AskHeroProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  suggestions: readonly string[];
  onSuggestionClick: (text: string) => void;
  showSuggestions: boolean;
}

export function AskHero({
  query,
  onChange,
  onSubmit,
  loading = false,
  suggestions,
  onSuggestionClick,
  showSuggestions,
}: AskHeroProps) {
  return (
    <section className="text-center">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
        Ask AreaIQ
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-500 sm:text-lg">
        Search properties, compare projects, discover investment opportunities, and get
        instant real estate advice.
      </p>

      <form
        className="mx-auto mt-8 max-w-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:px-5 sm:py-4">
          <svg
            className="h-5 w-5 shrink-0 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(event) => onChange(event.target.value)}
            placeholder="3 BHK under ₹80 lakh in Mohali..."
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {showSuggestions ? (
        <div className="mx-auto mt-5 max-w-3xl">
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSuggestionClick(item)}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface AskUserQueryCardProps {
  query: string;
}

export function AskUserQueryCard({ query }: AskUserQueryCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm sm:px-6 sm:py-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
        User
      </p>
      <p className="mt-2 text-base font-medium text-neutral-900 sm:text-lg">{query}</p>
    </div>
  );
}

interface AskStatsGridProps {
  stats: AskSearchStats;
}

export function AskStatsGrid({ stats }: AskStatsGridProps) {
  const items = [
    { label: "Average Price", value: formatPriceShort(stats.avgPrice) },
    {
      label: "Average Rental Yield",
      value: `${stats.avgRentalYield.toFixed(1)}%`,
    },
    {
      label: "Best Investment Score",
      value: `${Math.round(stats.bestInvestmentScore)}/100`,
    },
  ];

  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3.5"
        >
          <p className="text-xs font-medium text-neutral-500">{item.label}</p>
          <p className="mt-1 text-lg font-bold text-neutral-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

interface AskSectionsGridProps {
  sections: AskSection[];
}

export function AskSectionsGrid({ sections }: AskSectionsGridProps) {
  if (sections.length === 0) return null;

  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-xl border border-neutral-100 bg-neutral-50/60 px-4 py-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            {section.title}
          </p>
          <div
            className="mt-2 text-sm leading-relaxed text-neutral-700"
            dangerouslySetInnerHTML={{ __html: formatInline(section.content) }}
          />
        </div>
      ))}
    </div>
  );
}

interface AskResponseCardProps {
  turn: AskTurn;
}

export function AskResponseCard({ turn }: AskResponseCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:px-6 sm:py-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
        AreaIQ
      </p>
      <h2 className="mt-2 text-lg font-semibold text-neutral-900 sm:text-xl">
        {turn.headline}
      </h2>
      {turn.subtext ? (
        <p className="mt-1 text-sm text-neutral-500">{turn.subtext}</p>
      ) : null}

      {turn.stats ? <AskStatsGrid stats={turn.stats} /> : null}

      {turn.aiContent ? (
        <div
          className="mt-5 text-sm leading-7 text-neutral-700"
          dangerouslySetInnerHTML={{ __html: formatInline(turn.aiContent) }}
        />
      ) : null}

      {turn.sections.length > 0 ? <AskSectionsGrid sections={turn.sections} /> : null}
    </div>
  );
}

interface AskRecommendedPropertiesProps {
  listings: ListingProperty[];
  label?: string;
}

export function AskRecommendedProperties({
  listings,
  label = "Recommended Properties",
}: AskRecommendedPropertiesProps) {
  if (listings.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-neutral-900 sm:text-lg">{label}</h3>
      <AskResultsGrid listings={listings} />
    </div>
  );
}

interface AskChipRowProps {
  title: string;
  options: readonly string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function AskChipRow({
  title,
  options,
  onSelect,
  disabled = false,
}: AskChipRowProps) {
  if (options.length === 0) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option)}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AskLoadingCardProps {
  status: string;
}

export function AskLoadingCard({ status }: AskLoadingCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
        AreaIQ
      </p>
      <div className="mt-3 flex items-center gap-3 text-sm text-neutral-600">
        <span className="inline-flex gap-1" aria-hidden>
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500"
              style={{ animationDelay: `${dot * 0.15}s` }}
            />
          ))}
        </span>
        <span>{status}</span>
      </div>
    </div>
  );
}
