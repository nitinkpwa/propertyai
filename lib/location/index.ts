/**
 * AreaIQ Location Intelligence Engine
 *
 * Replaces exact string matching with:
 * normalize → expand → fuzzy multi-field match → distance → ranked report
 */

export type {
  PlaceKind,
  PlaceNode,
  ResolvedPlace,
  PropertyLocationFields,
  LocationMatchScore,
  LocationMatchTier,
  LocationScoredProperty,
  LocationSearchReport,
  LocationSearchReportEntry,
} from "./types";

export {
  resolvePlace,
  resolvePlaceFromQuery,
  expandLocations,
  inferCoordsFromLabel,
  normalizePlaceToken,
  getPlaceNode,
} from "./resolve";

export {
  scoreLocationMatch,
  isLocationRelevant,
  buildLocationOrFilter,
  buildPropertyHaystack,
} from "./match";

export {
  stringSimilarity,
  fuzzyIncludes,
  normalizeText,
  bestSimilarity,
} from "./fuzzy";

export {
  rankByLocation,
  buildLocationSearchReport,
  combineRankingScore,
  nearbyMatchPreamble,
  alwaysShowPreamble,
} from "./report";

export { PLACE_GRAPH, getPlaceByAlias } from "./synonyms";
