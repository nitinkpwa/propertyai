/**
 * AreaIQ Location Intelligence Engine — shared types.
 */

export type PlaceKind =
  | "city"
  | "locality"
  | "sector"
  | "highway"
  | "micromarket"
  | "landmark"
  | "corridor"
  | "district";

/** How strongly a property matches the resolved place. */
export type LocationMatchTier =
  | "exact"
  | "alias"
  | "neighbor"
  | "micromarket"
  | "sector"
  | "highway"
  | "city"
  | "district"
  | "fuzzy"
  | "geo"
  | "none";

export interface PlaceNode {
  id: string;
  displayName: string;
  kind: PlaceKind;
  /** Search aliases (case-insensitive). */
  aliases: string[];
  /** Neighbouring / expanded places (display names or ids). */
  nearby: string[];
  parentCity: string | null;
  /** Approximate centroid for distance ranking. */
  lat: number | null;
  lng: number | null;
}

export interface ResolvedPlace {
  canonicalId: string;
  displayName: string;
  kind: PlaceKind;
  aliases: string[];
  nearby: string[];
  parentCity: string | null;
  /** Cities to include in SQL cityGroup-style filters. */
  cityValues: string[];
  /** All needles for multi-field text match (canonical + aliases + nearby). */
  searchNeedles: string[];
  lat: number | null;
  lng: number | null;
  matchConfidence: number;
  /** Raw token(s) extracted from the user query. */
  queryToken: string;
}

export interface PropertyLocationFields {
  id?: string;
  title?: string | null;
  name?: string | null;
  project_name?: string | null;
  projectName?: string | null;
  builder_name?: string | null;
  builderName?: string | null;
  location?: string | null;
  sector?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  description?: string | null;
  landmark?: string | null;
  micro_market?: string | null;
  micromarket?: string | null;
  highway?: string | null;
  nearby_area?: string | null;
  nearby_places?: unknown;
  lat?: number | null;
  lng?: number | null;
}

export interface LocationMatchScore {
  matchScore: number;
  distanceKm: number | null;
  distanceScore: number;
  tier: LocationMatchTier;
  matchedOn: string[];
  why: string[];
  matchedNeedle: string | null;
}

export interface LocationScoredProperty<T = PropertyLocationFields> {
  property: T;
  location: LocationMatchScore;
  finalScore: number;
}

export interface LocationSearchReportEntry {
  propertyId: string;
  title: string;
  locationLabel: string;
  matchScore: number;
  distanceKm: number | null;
  distanceScore: number;
  finalRankingScore: number;
  tier: LocationMatchTier;
  why: string[];
}

export interface LocationSearchReport {
  query: string;
  resolvedPlace: ResolvedPlace | null;
  expandedLocations: string[];
  matchedCount: number;
  properties: LocationSearchReportEntry[];
}
