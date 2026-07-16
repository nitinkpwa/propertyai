"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FadeIn from "./FadeIn";
import IntelligencePropertyCard from "./IntelligencePropertyCard";
import SectionHeader from "./SectionHeader";
import { listingToIntelligenceCard } from "@/lib/home/types";
import type { IntelligencePropertyCardModel } from "@/lib/home/types";
import { fetchListingProperties } from "@/lib/properties/queries";
import { IQ_GREEN } from "./theme";

export default function FeaturedIntelligenceCarousel() {
  const [cards, setCards] = useState<IntelligencePropertyCardModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchListingProperties()
      .then((rows) => {
        if (cancelled) return;
        const mapped = rows
          .slice(0, 12)
          .map(listingToIntelligenceCard);
        setCards(mapped);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Featured Intelligence"
            title="Properties worth understanding"
            description="Live inventory with AreaIQ scores when available — not a classified feed."
            action={{ label: "Browse all", href: "/properties" }}
          />
        </FadeIn>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[420px] w-[min(320px,85vw)] shrink-0 animate-pulse rounded-2xl bg-neutral-100 sm:w-[340px]"
              />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-[#F7F9FB] px-6 py-12 text-center">
            <p className="font-semibold text-heading-primary">No featured listings yet</p>
            <p className="mt-2 text-sm text-muted">
              Ask AreaIQ what to look for while inventory is being published.
            </p>
            <Link
              href="/ask"
              className="mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold text-white no-underline"
              style={{ backgroundColor: IQ_GREEN }}
            >
              Start with AI
            </Link>
          </div>
        ) : (
          <div
            className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scroll-smooth snap-x snap-mandatory sm:-mx-0 sm:px-0"
            style={{ scrollbarWidth: "thin" }}
          >
            {cards.map((card) => (
              <div key={card.id} className="snap-start">
                <IntelligencePropertyCard property={card} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
