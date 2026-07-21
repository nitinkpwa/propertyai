"use client";

import { DidYouKnowCard } from "./DidYouKnowCard";
import {
  AreaAnalysisSkeleton,
  BuilderCardSkeleton,
  PriceChartSkeleton,
  PropertyCardSkeleton,
  SchoolCardSkeleton,
} from "./SmartSkeletonCards";

const INTEL_SLOTS = [
  {
    icon: "🏢",
    title: "Possible Matches",
    status: "Searching live inventory…",
    body: <PropertyCardSkeleton />,
  },
  {
    icon: "📍",
    title: "Locality Analysis",
    status: "Preparing corridor insights…",
    body: <AreaAnalysisSkeleton />,
  },
  {
    icon: "📈",
    title: "Price Trend",
    status: "Loading market movement…",
    body: <PriceChartSkeleton />,
  },
  {
    icon: "🏗",
    title: "Builder Insights",
    status: "Checking delivery signals…",
    body: <BuilderCardSkeleton />,
  },
  {
    icon: "🏫",
    title: "Nearby Amenities",
    status: "Analyzing daily conveniences…",
    body: <SchoolCardSkeleton />,
  },
] as const;

export function LoadingSidebar({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="space-y-4" aria-busy="true" aria-label="Preparing intelligence panels">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white px-3.5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
          Advisor workspace
        </p>
        <p className="mt-1 text-sm leading-relaxed text-heading-primary">
          AreaIQ is assembling the right panels for your question — matches, locality, pricing, and
          builder signals.
        </p>
      </div>

      <DidYouKnowCard active={active} />

      {INTEL_SLOTS.map((slot) => (
        <section key={slot.title} className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-1.5">
              <span aria-hidden>{slot.icon}</span>
              <h3 className="text-sm font-semibold text-heading-primary">{slot.title}</h3>
            </div>
            <span className="text-[11px] font-medium text-emerald-700">{slot.status}</span>
          </div>
          {slot.body}
        </section>
      ))}
    </div>
  );
}
