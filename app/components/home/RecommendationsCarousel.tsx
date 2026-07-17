"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import PropertyCard, { type PropertyCardProps } from "../PropertyCard";
import FadeIn from "./FadeIn";
import SectionHeader from "./SectionHeader";
import { RECOMMENDATION_CATEGORIES } from "./data";
import { IQ_GREEN } from "./theme";
import { fetchListingProperties } from "@/lib/properties/queries";
import type { ListingProperty } from "@/lib/properties/types";

function listingToCard(listing: ListingProperty): PropertyCardProps {
  return {
    id: listing.id,
    name: listing.name,
    location: listing.location,
    city: listing.city,
    price: listing.price,
    builderName: listing.builderName,
    bhk: listing.bhk,
    area: listing.area,
    areaUnit: listing.areaUnit,
    growthScore: listing.growthScore,
    rentalYield: listing.rentalYield,
    imageUrl: listing.imageUrl,
    imageAlt: listing.imageAlt,
    aiVerified: listing.aiVerified,
    reraVerified: listing.reraVerified,
    href: `/property/${listing.id}`,
  };
}

function pickForCategory(
  id: string,
  listings: ListingProperty[],
): PropertyCardProps | null {
  if (listings.length === 0) return null;
  const cards = listings.map(listingToCard);
  let picked: PropertyCardProps | undefined;

  switch (id) {
    case "best-value":
      picked = [...cards].sort(
        (a, b) => a.price / Math.max(a.area, 1) - b.price / Math.max(b.area, 1),
      )[0];
      break;
    case "rental":
      picked = [...cards].sort(
        (a, b) => (b.rentalYield ?? 0) - (a.rentalYield ?? 0),
      )[0];
      break;
    case "growth":
      picked = [...cards].sort(
        (a, b) => (b.growthScore ?? 0) - (a.growthScore ?? 0),
      )[0];
      break;
    case "luxury":
      picked = [...cards].sort((a, b) => b.price - a.price)[0];
      break;
    case "family":
      picked = cards.find((c) => c.bhk >= 3) ?? cards[0];
      break;
    default:
      picked = cards[0];
  }
  return picked ?? null;
}

export default function RecommendationsCarousel() {
  const [listings, setListings] = useState<ListingProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchListingProperties()
      .then((rows) => {
        if (!cancelled) setListings(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const picks = useMemo(
    () =>
      RECOMMENDATION_CATEGORIES.map((cat) => ({
        ...cat,
        property: pickForCategory(cat.id, listings),
      })),
    [listings],
  );

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Personalized"
            title="Recommended For You"
            description="Based on market signals and buyer interests — not just the latest uploads."
            action={{ label: "View all", href: "/properties?type=buy" }}
          />
        </FadeIn>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[520px] animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
            {picks.map((pick, i) => (
              <motion.div
                key={pick.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-heading-primary">{pick.label}</p>
                    <p className="text-xs text-muted">{pick.desc}</p>
                  </div>
                  <Link
                    href={pick.askHref}
                    className="text-xs font-semibold no-underline hover:underline"
                    style={{ color: IQ_GREEN }}
                  >
                    Ask AreaIQ
                  </Link>
                </div>
                {pick.property ? (
                  <PropertyCard {...pick.property} />
                ) : (
                  <Link
                    href={pick.askHref}
                    className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-[#F7F9FB] p-6 text-center no-underline transition-colors hover:border-emerald-200"
                  >
                    <p className="text-sm font-medium text-body">
                      No listing match yet
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: IQ_GREEN }}>
                      Ask AreaIQ for {pick.label} →
                    </p>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
