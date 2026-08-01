"use client";

import Link from "next/link";
import FadeIn from "../FadeIn";
import IntelligencePropertyCard from "../IntelligencePropertyCard";
import { IQ_GREEN } from "../theme";
import TrendingLocations from "./TrendingLocations";
import { SkeletonBlock, TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";

export default function FeaturedProperties() {
  const { loading, properties } = useTerminalData();

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:space-y-16 sm:px-6 lg:px-8">
        <FadeIn>
          <TrendingLocations />
        </FadeIn>

        <FadeIn>
          <TerminalSectionHeader
            eyebrow="Inventory"
            title="Featured properties"
            action={{ label: "Browse all", href: "/properties" }}
          />
          {loading && properties.length === 0 ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-[420px] w-[320px] shrink-0" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-[#F7F9FB] px-6 py-12 text-center">
              <p className="font-semibold text-heading-primary">No listings yet</p>
              <Link
                href="/ask"
                className="mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold text-white no-underline"
                style={{ backgroundColor: IQ_GREEN }}
              >
                Ask AreaIQ
              </Link>
            </div>
          ) : (
            <div
              className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:px-0"
              style={{ scrollbarWidth: "thin" }}
            >
              {properties.map((card) => (
                <div key={card.id} className="snap-start">
                  <IntelligencePropertyCard property={card} />
                </div>
              ))}
            </div>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
