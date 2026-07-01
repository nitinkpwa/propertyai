import type { AreaIntelligenceReport, IntelligenceMetric, IntelligenceSource } from "./types";
import { UNAVAILABLE_MESSAGE } from "./types";

export function availableMetric<T>(
  value: T,
  displayValue: string,
  source: IntelligenceSource,
  extras?: Partial<IntelligenceMetric<T>>,
): IntelligenceMetric<T> {
  return {
    available: true,
    value,
    displayValue,
    source,
    ...extras,
  };
}

export function unavailableMetric<T = number | string>(
  displayValue = "Insufficient data",
): IntelligenceMetric<T> {
  return {
    available: false,
    value: null,
    displayValue,
    source: null,
    explanation: UNAVAILABLE_MESSAGE,
  };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function pricePerSqft(price: number, areaSqft: number): number | null {
  if (!price || !areaSqft || areaSqft <= 0) return null;
  return price / areaSqft;
}

export function normalizeLocality(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesLocality(listingLocation: string, locality: string): boolean {
  if (!locality) return true;
  return normalizeLocality(listingLocation).includes(normalizeLocality(locality));
}

export function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

export function formatPercent(value: number, digits = 1): string {
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(digits)}%`;
}

export function reputationLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 45) return "Moderate";
  return "Limited track record";
}

type ReportBody = Omit<AreaIntelligenceReport, "availableMetrics" | "unavailableMetrics">;

function trackMetric(
  key: string,
  metric: IntelligenceMetric,
  availableMetrics: string[],
  unavailableMetrics: string[],
): void {
  if (metric.available) availableMetrics.push(key);
  else unavailableMetrics.push(key);
}

export function summarizeReportMetrics(body: ReportBody): {
  availableMetrics: string[];
  unavailableMetrics: string[];
} {
  const availableMetrics: string[] = [];
  const unavailableMetrics: string[] = [];

  trackMetric("growthScore", body.growthScore, availableMetrics, unavailableMetrics);
  trackMetric("rentalYield", body.rentalYield, availableMetrics, unavailableMetrics);
  trackMetric("investmentScore", body.investmentScore, availableMetrics, unavailableMetrics);
  trackMetric("builderReputation", body.builderReputation, availableMetrics, unavailableMetrics);
  trackMetric("demandIndex", body.demandIndex, availableMetrics, unavailableMetrics);
  trackMetric("schoolsNearby", body.schoolsNearby, availableMetrics, unavailableMetrics);
  trackMetric("hospitalsNearby", body.hospitalsNearby, availableMetrics, unavailableMetrics);
  trackMetric("connectivity.airport", body.connectivity.airport, availableMetrics, unavailableMetrics);
  trackMetric("connectivity.metro", body.connectivity.metro, availableMetrics, unavailableMetrics);
  trackMetric("connectivity.highways", body.connectivity.highways, availableMetrics, unavailableMetrics);
  trackMetric(
    "builderAnalysis.reputation",
    body.builderAnalysis.reputation,
    availableMetrics,
    unavailableMetrics,
  );
  trackMetric(
    "builderAnalysis.listingCount",
    body.builderAnalysis.listingCount,
    availableMetrics,
    unavailableMetrics,
  );
  trackMetric(
    "builderAnalysis.reraCompliance",
    body.builderAnalysis.reraCompliance,
    availableMetrics,
    unavailableMetrics,
  );
  trackMetric(
    "builderAnalysis.activeCities",
    body.builderAnalysis.activeCities,
    availableMetrics,
    unavailableMetrics,
  );

  return { availableMetrics, unavailableMetrics };
}
