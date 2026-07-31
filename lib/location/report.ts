/**
 * Location search report — query → expansions → scored matches.
 */

import type {
  LocationMatchScore,
  LocationSearchReport,
  LocationSearchReportEntry,
  LocationScoredProperty,
  PropertyLocationFields,
  ResolvedPlace,
} from "./types";
import { expandLocations } from "./resolve";
import { isLocationRelevant, scoreLocationMatch } from "./match";

function propertyTitle(p: PropertyLocationFields): string {
  return String(p.title ?? p.name ?? p.project_name ?? p.projectName ?? "Property");
}

function propertyLocationLabel(p: PropertyLocationFields): string {
  return [p.location, p.sector, p.city].filter(Boolean).join(", ");
}

export function combineRankingScore(
  location: LocationMatchScore,
  extras?: {
    budgetScore?: number;
    bedroomScore?: number;
    typeScore?: number;
    areaIqScore?: number;
    legalScore?: number;
    freshnessScore?: number;
    builderScore?: number;
  },
): number {
  const e = extras ?? {};
  return Math.round(
    location.matchScore * 0.34 +
      location.distanceScore * 0.14 +
      (e.budgetScore ?? 50) * 0.14 +
      (e.bedroomScore ?? 50) * 0.12 +
      (e.typeScore ?? 50) * 0.08 +
      (e.areaIqScore ?? 40) * 0.08 +
      (e.legalScore ?? 40) * 0.05 +
      (e.freshnessScore ?? 40) * 0.03 +
      (e.builderScore ?? 40) * 0.02,
  );
}

export function rankByLocation<T extends PropertyLocationFields>(
  properties: T[],
  place: ResolvedPlace | null,
  options?: {
    minScore?: number;
    maxDistanceKm?: number;
    scoreExtras?: (p: T, loc: LocationMatchScore) => {
      budgetScore?: number;
      bedroomScore?: number;
      typeScore?: number;
      areaIqScore?: number;
      legalScore?: number;
      freshnessScore?: number;
      builderScore?: number;
    };
  },
): LocationScoredProperty<T>[] {
  const scored: LocationScoredProperty<T>[] = [];

  for (const property of properties) {
    const location = scoreLocationMatch(property, place);
    if (!isLocationRelevant(location, options) && place) continue;
    // If no place resolved, keep everything with neutral location score
    if (!place) {
      scored.push({
        property,
        location: {
          matchScore: 50,
          distanceKm: null,
          distanceScore: 0,
          tier: "none",
          matchedOn: [],
          why: [],
          matchedNeedle: null,
        },
        finalScore: 50,
      });
      continue;
    }

    const extras = options?.scoreExtras?.(property, location);
    scored.push({
      property,
      location,
      finalScore: combineRankingScore(location, extras),
    });
  }

  return scored.sort((a, b) => b.finalScore - a.finalScore);
}

export function buildLocationSearchReport(
  query: string,
  place: ResolvedPlace | null,
  scored: LocationScoredProperty[],
): LocationSearchReport {
  const entries: LocationSearchReportEntry[] = scored.map((s) => ({
    propertyId: String(s.property.id ?? ""),
    title: propertyTitle(s.property),
    locationLabel: propertyLocationLabel(s.property),
    matchScore: s.location.matchScore,
    distanceKm: s.location.distanceKm,
    distanceScore: s.location.distanceScore,
    finalRankingScore: s.finalScore,
    tier: s.location.tier,
    why: s.location.why,
  }));

  return {
    query,
    resolvedPlace: place,
    expandedLocations: place ? expandLocations(place) : [],
    matchedCount: entries.length,
    properties: entries,
  };
}

/** Buyer-facing preamble when exact locality is empty but nearby hits exist. */
export function nearbyMatchPreamble(placeDisplayName: string): string {
  return `I couldn't find an exact property inside ${placeDisplayName} today. However I found verified projects very close to your preferred location.`;
}

export function alwaysShowPreamble(): string {
  return "I found nearby verified options that closely match your requirement.";
}
