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
import FeatureErrorBoundary from "@/components/stability/FeatureErrorBoundary";
import RenderProbe from "@/components/stability/RenderProbe";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import Card, { CardHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import {
  fetchRecentViewedWithMeta,
  fetchRecommendedPropertyCards,
  fetchSiteVisits,
} from "@/lib/buyer/queries";
import { fetchBuyerCrmSummary } from "@/lib/crm/queries";
import {
  compareUpcomingVisits,
  isVisitUpcoming,
} from "@/lib/crm/visitWorkflow";
import { getGreeting } from "@/lib/buyer/design";
import { logAsyncFailure, traceRender } from "@/lib/stability";
import type { CrmLeadActivity, LeadStatus } from "@/lib/crm/types";
import type { PropertyCardProps } from "@/app/components/PropertyCard";
import type { SiteVisitRow } from "@/lib/buyer/types";
import EmptyState from "./components/EmptyState";
import PropertyCardsGrid from "./components/PropertyCardsGrid";


const TRENDING_LOCALITIES = [
  { name: "New Chandigarh", note: "Infra-led appreciation" },
  { name: "Mohali Airport Road", note: "Strong rental demand" },
  { name: "Zirakpur", note: "Value corridor" },
  { name: "Kharar", note: "Affordable growth" },
];

const MARKET_INSIGHTS = [
  {
    title: "Tricity demand",
    body: "Ask AreaIQ which sectors are seeing the strongest buyer interest this week.",
    href: "/ask?q=Which%20Tricity%20sectors%20have%20the%20strongest%20buyer%20demand%20this%20week",
  },
  {
    title: "Rental yields",
    body: "Compare expected rental yields across Mohali, Zirakpur, and Chandigarh.",
    href: "/ask?q=Compare%20rental%20yields%20in%20Mohali%20Zirakpur%20and%20Chandigarh",
  },
  {
    title: "Ready to move",
    body: "Find ready-to-move homes that fit your budget and locality preferences.",
    href: "/properties?possession=ready",
  },
];

export default function BuyerDashboardPage() {
  traceRender("BuyerDashboard");
  const { user, profile, sessionStatus } = useAuth();
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[AreaIQ:render] Rendering BuyerDashboard", {
      userId: user?.id ?? null,
      role: profile?.role ?? null,
      sessionStatus,
      route: "/buyer",
    });
  }, [user?.id, profile?.role, sessionStatus]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const load = async () => {
      attempt += 1;
      setLoading(true);
      setLoadError(null);
      try {
        const preferred = Array.isArray(profile?.preferred_locations)
          ? profile.preferred_locations
          : [];

        // Isolate failures — never let one query kill the dashboard
        const [recentRes, recommendedRes, crmRes, visitsRes] = await Promise.allSettled([
          fetchRecentViewedWithMeta(user.id, 6),
          fetchRecommendedPropertyCards(user.id, preferred, 4),
          fetchBuyerCrmSummary(user.id),
          fetchSiteVisits(user.id),
        ]);

        if (cancelled) return;

        const nextRecent =
          recentRes.status === "fulfilled" && Array.isArray(recentRes.value)
            ? recentRes.value
            : [];
        const nextRecommended =
          recommendedRes.status === "fulfilled" && Array.isArray(recommendedRes.value)
            ? recommendedRes.value
            : [];
        const crm = crmRes.status === "fulfilled" ? crmRes.value : null;
        const allVisits =
          visitsRes.status === "fulfilled" && Array.isArray(visitsRes.value)
            ? visitsRes.value
            : [];

        const failed = [recentRes, recommendedRes, crmRes, visitsRes].filter(
          (r) => r.status === "rejected",
        );

        for (const r of [recentRes, recommendedRes, crmRes, visitsRes]) {
          if (r.status === "rejected") {
            logAsyncFailure({
              component: "BuyerDashboard",
              api:
                r === recentRes
                  ? "fetchRecentViewedWithMeta"
                  : r === recommendedRes
                    ? "fetchRecommendedPropertyCards"
                    : r === crmRes
                      ? "fetchBuyerCrmSummary"
                      : "fetchSiteVisits",
              error: r.reason,
              userId: user.id,
            });
          }
        }

        const upcoming = allVisits
          .filter((v) => isVisitUpcoming(v))
          .sort(compareUpcomingVisits)
          .slice(0, 3);

        setRecent(nextRecent);
        setRecommended(nextRecommended);
        setUpcomingVisits(upcoming);
        setPendingApprovals(
          allVisits.filter(
            (v) => v.status === "pending_approval" && isVisitUpcoming(v),
          ).length,
        );
        setCrmCounts({
          enquiriesCount: crm?.enquiriesCount ?? 0,
          savedCount: crm?.savedCount ?? 0,
          chatsCount: crm?.chatsCount ?? 0,
          visitsCount: crm?.visitsCount ?? 0,
          viewedCount: nextRecent.length,
        });
        setActivities(Array.isArray(crm?.activities) ? crm.activities.slice(-12).reverse() : []);
        setLeadStatus(crm?.lead?.status ?? null);

        if (failed.length > 0) {
          setLoadError("Couldn't refresh some widgets. Showing what we can.");
          if (attempt < 2) {
            window.setTimeout(() => {
              if (!cancelled) void load();
            }, 1200);
          }
        }
      } catch {
        if (cancelled) return;
        setLoadError("Couldn't refresh your dashboard. Showing what we can.");
        setRecent([]);
        setRecommended([]);
        setUpcomingVisits([]);
        if (attempt < 2) {
          window.setTimeout(() => {
            if (!cancelled) void load();
          }, 1200);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.preferred_locations]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const insights = useMemo(
    () =>
      buildDashboardInsights({
        recommendedCount: recommended.length,
        upcomingVisits: upcomingVisits.length,
        profileComplete: completeness.isComplete,
        preferredLocations: Array.isArray(profile?.preferred_locations)
          ? profile.preferred_locations
          : [],
        savedCount: crmCounts.savedCount,
      }),
    [
      recommended.length,
      upcomingVisits.length,
      completeness.isComplete,
      profile?.preferred_locations,
      crmCounts.savedCount,
    ],
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      {/* Hero — mobile-first single composition */}
      <FeatureErrorBoundary name="Profile Summary" compact>
        <RenderProbe name="ProfileSummary">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-xl shadow-emerald-900/20 sm:p-8">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-teal-400/10 blur-2xl" aria-hidden />
          <div className="relative space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                {getGreeting()} · AreaIQ
              </p>
              <h1 className="text-shadow-premium mt-2 text-[26px] font-bold leading-tight tracking-tight sm:text-3xl">
                {firstName}, continue your search
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-emerald-50/90">
                {upcomingVisits.length > 0
                  ? `You have ${upcomingVisits.length} upcoming visit${upcomingVisits.length > 1 ? "s" : ""}. Pick up where you left off.`
                  : "Discover, compare, and book site visits — powered by AreaIQ Intelligence."}
              </p>
              {leadStatus ? (
                <div className="mt-3 inline-flex rounded-full bg-white/15 px-1 py-1">
                  <LeadStatusBadge status={leadStatus} />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink
                href="/properties"
                className="min-h-12 bg-white text-emerald-800 shadow-none hover:bg-emerald-50"
              >
                Continue searching
              </ButtonLink>
              <ButtonLink
                href="/ask"
                variant="secondary"
                className="min-h-12 border-white/30 bg-white/10 text-white hover:bg-white/15"
              >
                Ask AreaIQ
              </ButtonLink>
            </div>

            <button
              type="button"
              onClick={() => openModal()}
              className="flex w-full min-h-12 items-center gap-4 rounded-2xl bg-white/10 p-4 text-left transition active:scale-[0.99] hover:bg-white/15 sm:max-w-sm"
            >
              <ProfileCompletionRing percent={completeness.percent} size="lg" showLabel={false} />
              <div>
                <p className="text-sm font-semibold">Profile {completeness.percent}% complete</p>
                <p className="text-xs text-emerald-100">
                  {completeness.isComplete
                    ? "Fully optimized for recommendations"
                    : `${completeness.missing.length} fields remaining`}
                </p>
              </div>
            </button>
          </div>
        </section>
        </RenderProbe>
      </FeatureErrorBoundary>

      {loadError ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      ) : null}

      <FeatureErrorBoundary name="Today's actions" compact>
        <TodaysActions
          upcomingVisits={upcomingVisits}
          pendingApprovals={pendingApprovals}
          profileIncomplete={!completeness.isComplete}
          onCompleteProfile={() => openModal()}
        />
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Activity metrics" compact>
        <section aria-label="Your activity">
          <div className="-mx-4 flex gap-3 overflow-x-auto scroll-touch px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
            <MetricCard icon="❤️" label="Saved" value={crmCounts.savedCount} href="/buyer/saved" accent="rose" />
            <MetricCard icon="👀" label="Viewed" value={crmCounts.viewedCount} href="#recently-viewed" accent="blue" />
            <MetricCard icon="🤖" label="Intelligence" value={crmCounts.chatsCount} href="/ask" accent="violet" />
            <MetricCard icon="📅" label="Visits" value={crmCounts.visitsCount} href="/buyer/site-visits" accent="amber" />
            <MetricCard icon="📩" label="Inquiries" value={crmCounts.enquiriesCount} href="/buyer/crm" accent="emerald" />
          </div>
        </section>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Visits" compact>
        <RenderProbe name="BuyerVisits">
          <UpcomingVisitsPanel visits={upcomingVisits} />
        </RenderProbe>
      </FeatureErrorBoundary>

      {pendingApprovals > 0 ? (
        <FeatureErrorBoundary name="Pending approvals" compact>
          <Card padding="sm" className="border-amber-100 bg-amber-50/50">
            <p className="text-sm font-semibold text-amber-900">Pending approvals</p>
            <p className="mt-1 text-xs text-amber-800">
              {pendingApprovals} visit request{pendingApprovals > 1 ? "s" : ""} awaiting seller confirmation
            </p>
            <Link
              href="/buyer/site-visits"
              className="mt-2 inline-flex min-h-12 items-center text-sm font-semibold text-amber-700"
            >
              Track status →
            </Link>
          </Card>
        </FeatureErrorBoundary>
      ) : null}

      <FeatureErrorBoundary name="AI Widgets" compact>
        <RenderProbe name="BuyerAIWidgets">
          <AiInsights insights={insights} />
        </RenderProbe>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Market Intelligence" compact>
        <RenderProbe name="MarketIntelligence">
        <section aria-label="Market insights">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-heading-primary">Market insights</h2>
            <p className="mt-1 text-sm text-muted">Signals worth watching this week</p>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto scroll-touch px-4 pb-1 snap-x sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {MARKET_INSIGHTS.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="min-w-[260px] shrink-0 snap-start rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm no-underline transition hover:border-emerald-200 active:scale-[0.99] sm:min-w-0"
              >
                <p className="text-sm font-semibold text-heading-primary">{item.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-body">{item.body}</p>
              </Link>
            ))}
          </div>
        </section>
        </RenderProbe>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Trending localities" compact>
        <section aria-label="Trending localities">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-heading-primary">Trending localities</h2>
            <p className="mt-1 text-sm text-muted">Where buyers are looking right now</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TRENDING_LOCALITIES.map((loc) => (
              <Link
                key={loc.name}
                href={`/properties?location=${encodeURIComponent(loc.name)}`}
                className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition active:scale-[0.98] hover:border-emerald-200"
              >
                <p className="text-sm font-semibold text-heading-primary">{loc.name}</p>
                <p className="mt-1 text-[11px] text-muted">{loc.note}</p>
              </Link>
            ))}
          </div>
        </section>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Investment shortcut" compact>
        <Card padding="sm" className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-heading-primary">Investment opportunities</p>
              <p className="mt-1 text-xs text-muted">
                Ask AreaIQ for yield, appreciation, and better alternatives near your budget.
              </p>
            </div>
            <ButtonLink href="/ask?q=Best%20investment%20opportunities%20in%20Tricity" className="min-h-12 shrink-0">
              Explore →
            </ButtonLink>
          </div>
        </Card>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Saved searches" compact>
        <Card padding="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-heading-primary">Saved searches</p>
              <p className="mt-1 text-xs text-muted">
                {crmCounts.savedCount > 0
                  ? `${crmCounts.savedCount} saved propert${crmCounts.savedCount === 1 ? "y" : "ies"} ready to revisit`
                  : "Save listings to build collections and compare later"}
              </p>
            </div>
            <ButtonLink href="/buyer/saved" variant="secondary" className="min-h-12 shrink-0">
              Open saved
            </ButtonLink>
          </div>
        </Card>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Quick actions" compact>
        <QuickActions />
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Saved Properties" compact>
        <RenderProbe name="SavedProperties">
          {recent.length > 0 ? (
            <div id="recently-viewed">
              <RecentlyViewedPanel properties={recent} />
            </div>
          ) : (
            <section>
              <h2 className="mb-4 text-lg font-bold text-heading-primary">Recently viewed</h2>
              <EmptyState
                icon="👀"
                title="No recently viewed properties"
                description="Properties you browse will appear here so you can pick up where you left off."
                tips={[
                  "Browse listings and tap any property to view details",
                  "Your viewing history helps AI refine recommendations",
                ]}
              />
            </section>
          )}
        </RenderProbe>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Recommendations" compact>
        <RenderProbe name="BuyerRecommendations">
        <section id="recommended">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-heading-primary">Recommended for you</h2>
            <p className="mt-1 text-sm text-muted">
              Personalized picks
              {Array.isArray(profile?.preferred_locations) && profile.preferred_locations.length
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
        </RenderProbe>
      </FeatureErrorBoundary>

      <FeatureErrorBoundary name="Activity timeline" compact>
        <Card>
          <CardHeader
            title="Recent activity"
            description="Your property journey timeline"
            action={
              <ButtonLink href="/buyer/crm" variant="ghost" size="sm" className="min-h-12">
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
      </FeatureErrorBoundary>
    </div>
  );
}
