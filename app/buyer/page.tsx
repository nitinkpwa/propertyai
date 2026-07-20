"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProgressiveProfile } from "@/components/buyer/ProgressiveProfileProvider";
import ProfileCompletionRing from "@/components/premium/ProfileCompletionRing";
import MetricCard from "@/components/premium/MetricCard";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import TodaysActions from "@/components/buyer/TodaysActions";
import QuickActions from "@/components/buyer/QuickActions";
import AiInsights, { buildDashboardInsights } from "@/components/buyer/AiInsights";
import UpcomingVisitsPanel from "@/components/buyer/UpcomingVisitsPanel";
import RecentlyViewedPanel from "@/components/buyer/RecentlyViewedPanel";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import Card, { CardHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import {
  fetchRecentViewedWithMeta,
  fetchRecommendedPropertyCards,
  fetchSiteVisits,
} from "@/lib/buyer/queries";
import { fetchBuyerCrmSummary } from "@/lib/crm/queries";
import { getGreeting } from "@/lib/buyer/design";
import type { CrmLeadActivity, LeadStatus } from "@/lib/crm/types";
import type { PropertyCardProps } from "@/app/components/PropertyCard";
import type { SiteVisitRow } from "@/lib/buyer/types";
import EmptyState from "./components/EmptyState";
import PropertyCardsGrid from "./components/PropertyCardsGrid";

export default function BuyerDashboardPage() {
  const { user, profile } = useAuth();
  const { completeness, openModal } = useProgressiveProfile();
  const [recent, setRecent] = useState<(PropertyCardProps & { viewedAt: string })[]>([]);
  const [recommended, setRecommended] = useState<PropertyCardProps[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<SiteVisitRow[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
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
      const [nextRecent, nextRecommended, crm, allVisits] = await Promise.all([
        fetchRecentViewedWithMeta(user.id, 6),
        fetchRecommendedPropertyCards(user.id, preferred, 4),
        fetchBuyerCrmSummary(user.id),
        fetchSiteVisits(user.id),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = allVisits
        .filter(
          (v) =>
            v.visit_date >= today &&
            ["pending_approval", "accepted", "scheduled"].includes(v.status),
        )
        .slice(0, 3);
      setRecent(nextRecent);
      setRecommended(nextRecommended);
      setUpcomingVisits(upcoming);
      setPendingApprovals(allVisits.filter((v) => v.status === "pending_approval").length);
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

  const insights = useMemo(
    () =>
      buildDashboardInsights({
        recommendedCount: recommended.length,
        upcomingVisits: upcomingVisits.length,
        profileComplete: completeness.isComplete,
        preferredLocations: profile?.preferred_locations ?? [],
        savedCount: crmCounts.savedCount,
      }),
    [recommended.length, upcomingVisits.length, completeness.isComplete, profile?.preferred_locations, crmCounts.savedCount],
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-xl shadow-emerald-900/20 sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-teal-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
              {getGreeting()} · AreaIQ Intelligence
            </p>
            <h1 className="text-shadow-premium mt-2 text-[28px] font-bold tracking-tight sm:text-3xl">
              {firstName}, your property journey
            </h1>
            <p className="mt-2 max-w-lg text-sm text-emerald-50/90">
              {upcomingVisits.length > 0
                ? `You have ${upcomingVisits.length} upcoming visit${upcomingVisits.length > 1 ? "s" : ""}. Let's get you closer to your dream home.`
                : "Discover, compare, and book site visits — powered by AreaIQ Intelligence."}
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

      <TodaysActions
        upcomingVisits={upcomingVisits}
        pendingApprovals={pendingApprovals}
        profileIncomplete={!completeness.isComplete}
        onCompleteProfile={() => openModal()}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="-mx-1 flex gap-3 overflow-x-auto scroll-touch pb-1 snap-x sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
            <MetricCard icon="❤️" label="Saved" value={crmCounts.savedCount} href="/buyer/saved" accent="rose" />
            <MetricCard icon="👀" label="Viewed" value={crmCounts.viewedCount} accent="blue" />
            <MetricCard icon="🤖" label="Intelligence" value={crmCounts.chatsCount} href="/ask" accent="violet" />
            <MetricCard icon="📅" label="Visits" value={crmCounts.visitsCount} href="/buyer/site-visits" accent="amber" />
            <MetricCard icon="📩" label="Inquiries" value={crmCounts.enquiriesCount} href="/buyer/crm" accent="emerald" />
          </div>

          <Card>
            <CardHeader
              title="Recent Activity"
              description="Your property journey timeline"
              action={
                <ButtonLink href="/buyer/crm" variant="ghost" size="sm">
                  Full CRM →
                </ButtonLink>
              }
            />
            {activities.length === 0 ? (
              <EmptyState
                icon="✨"
                title="Your journey starts here"
                description="Save properties, chat with AI, or book a site visit to build your timeline."
                actionLabel="Start Exploring"
              />
            ) : (
              <ActivityTimeline activities={activities} maxItems={8} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <UpcomingVisitsPanel visits={upcomingVisits} />
          {pendingApprovals > 0 ? (
            <Card padding="sm" className="border-amber-100 bg-amber-50/50">
              <p className="text-sm font-semibold text-amber-900">⏳ Pending Approvals</p>
              <p className="mt-1 text-xs text-amber-800">
                {pendingApprovals} visit request{pendingApprovals > 1 ? "s" : ""} awaiting seller confirmation
              </p>
              <Link href="/buyer/site-visits" className="mt-2 inline-block text-xs font-semibold text-amber-700 hover:underline">
                Track status →
              </Link>
            </Card>
          ) : null}
        </div>
      </div>

      <AiInsights insights={insights} />

      <QuickActions />

      {recent.length > 0 ? (
        <RecentlyViewedPanel properties={recent} />
      ) : (
        <section>
          <h2 className="mb-4 text-lg font-bold text-heading-primary">Recently Viewed</h2>
          <EmptyState
            icon="👀"
            title="No recently viewed properties"
            description="Properties you browse will appear here so you can pick up where you left off."
            tips={["Browse listings and tap any property to view details", "Your viewing history helps AI refine recommendations"]}
          />
        </section>
      )}

      <section id="recommended">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-heading-primary">Recommended for You</h2>
          <p className="mt-1 text-sm text-muted">
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
            actionLabel="Complete Profile"
            actionHref="/buyer/profile"
          />
        ) : (
          <PropertyCardsGrid properties={recommended} columns="4" />
        )}
      </section>
    </div>
  );
}
