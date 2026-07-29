/**
 * Smart Intelligence Engine — assembles explainable notifications from live data.
 * Never invents market numbers. Empty / low-confidence → fallback clock or nothing.
 */

import { fetchUserNotifications } from "@/lib/crm/queries";
import {
  fetchRecentViewedWithMeta,
  fetchRecommendedPropertyCards,
  fetchSavedPropertyCards,
  fetchSiteVisits,
} from "@/lib/buyer/queries";
import type { Profile } from "@/lib/supabase";
import { recordPerf, timed } from "@/lib/perf/timing";
import type { IntelligenceNotification } from "../types";
import {
  fetchActiveAnnouncements,
  fetchActiveListingsSample,
  fetchPlatformStats,
} from "./queries";
import {
  generateBuyerIntelligence,
  generateCriticalFromCrm,
  generateCriticalFromVisits,
  generateFromAnnouncements,
  generateMarketFromListings,
  generateMarketStatusFallback,
  generatePlatformStatNotifications,
  generateSavedIntelligence,
} from "./generators";
import { scoreAndRank, selectDisplayQueue } from "./scoring";

export interface RunIntelligenceEngineInput {
  userId?: string | null;
  profile?: Profile | null;
  isLoggedIn: boolean;
}

export interface IntelligenceEngineResult {
  /** Ranked queue for the top priority band (rotate among these only) */
  queue: IntelligenceNotification[];
  /** Full ranked list for the drawer */
  all: IntelligenceNotification[];
  statsFetchedAt: string | null;
  generatedAt: string;
}

export async function runIntelligenceEngine(
  input: RunIntelligenceEngineInput,
): Promise<IntelligenceEngineResult> {
  const t0 = performance.now();
  const generatedAt = new Date().toISOString();
  const candidates: IntelligenceNotification[] = [];

  const [stats, listings, announcements] = await Promise.all([
    timed("notifications.fetchPlatformStats", () => fetchPlatformStats()),
    timed("notifications.fetchListingsSample200", () => fetchActiveListingsSample(200)),
    timed("notifications.fetchAnnouncements", () => fetchActiveAnnouncements()),
  ]);

  // Admin broadcasts (real table only — localStorage broadcasts are optional admin drafts)
  candidates.push(...generateFromAnnouncements(announcements));

  if (input.isLoggedIn && input.userId) {
  const preferred = Array.isArray(input.profile?.preferred_locations)
      ? input.profile.preferred_locations
      : [];

    const [crm, visits, saved, recent, recommended] = await Promise.all([
      timed("notifications.fetchCrm", () => fetchUserNotifications(input.userId!, 30)),
      timed("notifications.fetchVisits", () => fetchSiteVisits(input.userId!)),
      timed("notifications.fetchSaved", () => fetchSavedPropertyCards(input.userId!)),
      timed("notifications.fetchRecent", () => fetchRecentViewedWithMeta(input.userId!, 6)),
      timed("notifications.fetchRecommended", () =>
        fetchRecommendedPropertyCards(input.userId!, preferred, 6),
      ),
    ]);

    candidates.push(...generateCriticalFromCrm(crm));
    candidates.push(...generateCriticalFromVisits(visits));
    candidates.push(...generateSavedIntelligence(saved));
    candidates.push(
      ...generateBuyerIntelligence({
        profile: input.profile ?? null,
        recommended,
        recent,
      }),
    );
  } else {
    // Logged out — verified platform stats + listing aggregates only
    if (stats) {
      candidates.push(...generatePlatformStatNotifications(stats));
    }
    candidates.push(...generateMarketFromListings(listings));
  }

  // Market aggregates also useful when logged in (lower priority than personal)
  if (input.isLoggedIn) {
    candidates.push(...generateMarketFromListings(listings));
    if (stats) {
      candidates.push(...generatePlatformStatNotifications(stats));
    }
  }

  let ranked = scoreAndRank(candidates);

  // Logged out: if nothing verified, show date + market status only (never invent stats).
  // Logged in: if nothing meaningful, show nothing — do not invent a status banner.
  if (ranked.length === 0 && !input.isLoggedIn) {
    ranked = [generateMarketStatusFallback(stats?.fetchedAt ?? null)];
  }

  const queue = selectDisplayQueue(ranked);

  recordPerf("notifications.runIntelligenceEngine.total", performance.now() - t0, {
    isLoggedIn: input.isLoggedIn,
    candidateCount: candidates.length,
    queueCount: queue.length,
  });

  return {
    queue,
    all: ranked,
    statsFetchedAt: stats?.fetchedAt ?? null,
    generatedAt,
  };
}

export { scoreAndRank, selectDisplayQueue };
export { recordIntelligenceSeen, getIntelligenceHistory } from "./history";
