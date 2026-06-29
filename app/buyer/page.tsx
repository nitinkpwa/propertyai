"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  fetchBuyerStats,
  fetchRecentViewedCards,
  fetchRecommendedPropertyCards,
} from "@/lib/buyer/queries";
import type { BuyerStats } from "@/lib/buyer/types";
import type { PropertyCardProps } from "@/app/components/PropertyCard";
import EmptyState from "./components/EmptyState";
import PropertyCardsGrid from "./components/PropertyCardsGrid";
import StatCard from "./components/StatCard";

export default function BuyerDashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<BuyerStats>({
    savedCount: 0,
    comparedCount: 0,
    upcomingVisitsCount: 0,
  });
  const [recent, setRecent] = useState<PropertyCardProps[]>([]);
  const [recommended, setRecommended] = useState<PropertyCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const preferred = profile?.preferred_locations ?? [];
      const [nextStats, nextRecent, nextRecommended] = await Promise.all([
        fetchBuyerStats(user.id),
        fetchRecentViewedCards(user.id),
        fetchRecommendedPropertyCards(user.id, preferred, 4),
      ]);
      setStats(nextStats);
      setRecent(nextRecent);
      setRecommended(nextRecommended);
      setLoading(false);
    };

    load();
  }, [user, profile?.preferred_locations]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
            Buyer Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Track saved homes, comparisons, and upcoming site visits in one place.
          </p>
        </div>
        <Link
          href="/properties"
          className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition-all hover:bg-neutral-50"
        >
          Explore Properties
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Saved Properties" value={stats.savedCount} icon="❤️" href="/buyer/saved" />
        <StatCard label="Compared" value={stats.comparedCount} icon="⚖️" href="/buyer/compare" />
        <StatCard label="Upcoming Visits" value={stats.upcomingVisitsCount} icon="📅" href="/buyer/site-visits" />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">Recently Viewed</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon="👀"
            title="No recently viewed properties"
            description="Properties you view will appear here so you can pick up where you left off."
          />
        ) : (
          <PropertyCardsGrid properties={recent} columns="4" />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">Recommended for You</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Based on active listings
              {profile?.preferred_locations?.length
                ? ` in ${profile.preferred_locations.join(", ")}`
                : " across Tricity"}
            </p>
          </div>
        </div>
        {recommended.length === 0 ? (
          <EmptyState
            icon="🏠"
            title="No recommendations yet"
            description="Browse properties to get personalized picks based on your preferences."
          />
        ) : (
          <PropertyCardsGrid properties={recommended} columns="4" />
        )}
      </section>
    </div>
  );
}
