"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProgressiveProfile } from "@/components/buyer/ProgressiveProfileProvider";
import ProfileCompletionRing from "@/components/premium/ProfileCompletionRing";
import MetricCard from "@/components/premium/MetricCard";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import {
  fetchBuyerStats,
  fetchRecentViewedCards,
  fetchRecommendedPropertyCards,
} from "@/lib/buyer/queries";
import { fetchBuyerCrmSummary } from "@/lib/crm/queries";
import type { CrmLeadActivity, LeadStatus } from "@/lib/crm/types";
import type { BuyerStats } from "@/lib/buyer/types";
import type { PropertyCardProps } from "@/app/components/PropertyCard";
import EmptyState from "./components/EmptyState";
import PropertyCardsGrid from "./components/PropertyCardsGrid";

export default function BuyerDashboardPage() {
  const { user, profile } = useAuth();
  const { completeness, openModal } = useProgressiveProfile();
  const [stats, setStats] = useState<BuyerStats>({
    savedCount: 0,
    comparedCount: 0,
    upcomingVisitsCount: 0,
  });
  const [recent, setRecent] = useState<PropertyCardProps[]>([]);
  const [recommended, setRecommended] = useState<PropertyCardProps[]>([]);
  const [crmCounts, setCrmCounts] = useState({
    enquiriesCount: 0,
    savedCount: 0,
    chatsCount: 0,
    visitsCount: 0,
    viewedCount: 0,
  });
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);
  const [leadStatus, setLeadStatus] = useState<LeadStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const preferred = profile?.preferred_locations ?? [];
      const [nextStats, nextRecent, nextRecommended, crm] = await Promise.all([
        fetchBuyerStats(user.id),
        fetchRecentViewedCards(user.id),
        fetchRecommendedPropertyCards(user.id, preferred, 4),
        fetchBuyerCrmSummary(user.id),
      ]);
      setStats(nextStats);
      setRecent(nextRecent);
      setRecommended(nextRecommended);
      setCrmCounts({
        enquiriesCount: crm.enquiriesCount,
        savedCount: crm.savedCount,
        chatsCount: crm.chatsCount,
        visitsCount: crm.visitsCount,
        viewedCount: nextRecent.length,
      });
      setActivities(crm.activities.slice(-12).reverse());
      setLeadStatus(crm.lead?.status ?? null);
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-xl shadow-emerald-900/20 sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
              AreaIQ Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 max-w-md text-sm text-emerald-50/90">
              Your personalized property journey — saved homes, AI insights, and site visits in one place.
            </p>
            {leadStatus ? (
              <div className="mt-3 inline-flex rounded-full bg-white/15 px-1 py-1 backdrop-blur">
                <LeadStatusBadge status={leadStatus} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => openModal()}
            className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 text-left backdrop-blur transition hover:bg-white/15"
          >
            <ProfileCompletionRing percent={completeness.percent} size="lg" showLabel={false} />
            <div>
              <p className="text-sm font-semibold">Profile {completeness.percent}% Complete</p>
              <p className="text-xs text-emerald-100">
                {completeness.isComplete
                  ? "Fully optimized for recommendations"
                  : `${completeness.missing.length} fields remaining`}
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard icon="❤️" label="Saved Properties" value={crmCounts.savedCount} href="/buyer/saved" accent="rose" />
        <MetricCard icon="👀" label="Viewed Properties" value={crmCounts.viewedCount} accent="blue" />
        <MetricCard icon="🤖" label="AI Chats" value={crmCounts.chatsCount} href="/ask" accent="violet" />
        <MetricCard icon="📅" label="Site Visits" value={crmCounts.visitsCount} href="/buyer/site-visits" accent="amber" />
        <MetricCard icon="📩" label="Inquiries" value={crmCounts.enquiriesCount} href="/buyer/crm" accent="emerald" />
      </div>

      <section className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Recent Activity</h2>
            <p className="text-sm text-neutral-500">Your property journey timeline</p>
          </div>
          <Link
            href="/buyer/crm"
            className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
          >
            Full CRM Journey →
          </Link>
        </div>
        {activities.length === 0 ? (
          <EmptyState
            icon="✨"
            title="Your journey starts here"
            description="Save properties, chat with AI, or book a site visit to build your timeline."
          />
        ) : (
          <ActivityTimeline activities={activities} maxItems={10} />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Recently Viewed</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon="👀"
            title="No recently viewed properties"
            description="Properties you view will appear here."
          />
        ) : (
          <PropertyCardsGrid properties={recent} columns="4" />
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-neutral-900">Recommended for You</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Personalized picks
            {profile?.preferred_locations?.length
              ? ` in ${profile.preferred_locations.join(", ")}`
              : " across Tricity"}
          </p>
        </div>
        {recommended.length === 0 ? (
          <EmptyState
            icon="🏠"
            title="Complete your profile for better picks"
            description="Add budget and preferred areas to unlock smarter recommendations."
          />
        ) : (
          <PropertyCardsGrid properties={recommended} columns="4" />
        )}
      </section>
    </div>
  );
}
