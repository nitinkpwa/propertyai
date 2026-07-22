/**
 * Smart Intelligence Bar — explainable, real-data notifications only.
 * Never invent market numbers. Confidence < 80 → do not display.
 */

export type IntelligencePriorityScore = 100 | 90 | 80 | 70 | 10;

export type IntelligenceSource =
  | "crm"
  | "site_visit"
  | "saved_property"
  | "buyer_profile"
  | "property_view"
  | "platform_stats"
  | "market_listings"
  | "admin_broadcast"
  | "system_clock";

export type IntelligenceKind =
  | "critical"
  | "saved_intel"
  | "buyer_intel"
  | "market_intel"
  | "platform_stat"
  | "market_status";

export interface IntelligenceNotification {
  id: string;
  /** Display title — derived from real data */
  title: string;
  message?: string;
  icon: string;
  href?: string;
  /** Numeric priority: 100 critical … 70 market … 10 fallback clock */
  score: IntelligencePriorityScore;
  kind: IntelligenceKind;
  /** Where the fact came from */
  source: IntelligenceSource;
  /** Why this was shown (explainable) */
  reason: string;
  /** 0–100; must be ≥ MIN_CONFIDENCE to display */
  confidence: number;
  /** ISO timestamp of the underlying event / computation */
  timestamp: string;
  read?: boolean;
  propertyId?: string | null;
}

export interface PlatformStatsSnapshot {
  activeProperties: number;
  builders: number;
  cities: number;
  newPropertiesThisMonth: number;
  /** Site visits scheduled for today (any buyer) — verified count */
  visitsToday: number;
  fetchedAt: string;
}

export type BroadcastCategory =
  | "maintenance"
  | "feature"
  | "holiday"
  | "market_report"
  | "builder_update"
  | "general";

export interface AdminBroadcastInput {
  title: string;
  message?: string;
  icon?: string;
  href?: string;
  category: BroadcastCategory;
  audience: "public" | "authenticated" | "buyer" | "all";
}

/** Minimum confidence to surface a notification */
export const MIN_CONFIDENCE = 80;

export const ROTATE_MS = 6000;
export const SMART_BAR_HEIGHT_PX = 44;

/** Cache TTL for platform stats / market snapshots */
export const STATS_CACHE_TTL_MS = 3 * 60_000;

/** Legacy aliases used by older UI — prefer score */
export type NotificationPriority = "critical" | "high" | "intelligence" | "market";
export type SmartNotification = IntelligenceNotification & {
  priority?: NotificationPriority;
  kind: IntelligenceKind | string;
  createdAt?: string;
  audience?: string;
  category?: string;
};

export const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  intelligence: 2,
  market: 3,
};

export function scoreToLegacyPriority(score: number): NotificationPriority {
  if (score >= 100) return "critical";
  if (score >= 90) return "high";
  if (score >= 80) return "intelligence";
  return "market";
}
