/**
 * Score a property against a resolved place (multi-field + fuzzy + geo).
 */

import { haversineKm } from "@/lib/analytics/math";
import { extractPropertyMeta } from "@/lib/properties/nearbyPlacesMeta";
import { fuzzyIncludes, normalizeText, stringSimilarity } from "./fuzzy";
import { inferCoordsFromLabel } from "./resolve";
import { getPlaceByAlias } from "./synonyms";
import type {
  LocationMatchScore,
  LocationMatchTier,
  PropertyLocationFields,
  ResolvedPlace,
} from "./types";

/** Reject fuzzy collisions between two different known places (TDI City ≠ IT City). */
function isDistinctKnownPlaceCollision(a: string, b: string): boolean {
  const pa = getPlaceByAlias(a);
  const pb = getPlaceByAlias(b);
  if (!pa || !pb) return false;
  return pa.id !== pb.id;
}

const TIER_BASE: Record<LocationMatchTier, number> = {
  exact: 100,
  alias: 94,
  neighbor: 88,
  micromarket: 84,
  sector: 82,
  highway: 90,
  city: 72,
  district: 65,
  fuzzy: 78,
  geo: 80,
  none: 0,
};

function metaLocality(nearbyPlaces: unknown): string {
  try {
    const meta = extractPropertyMeta(nearbyPlaces);
    const loc = meta?.location;
    if (!loc) return "";
    return [
      loc.locality,
      loc.landmark,
      loc.areaCategory,
      loc.pincode,
    ]
      .filter(Boolean)
      .join(" ");
  } catch {
    return "";
  }
}

export function buildPropertyHaystack(p: PropertyLocationFields): {
  haystack: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {
    project_name: String(p.project_name ?? p.projectName ?? ""),
    title: String(p.title ?? p.name ?? ""),
    builder: String(p.builder_name ?? p.builderName ?? ""),
    location: String(p.location ?? ""),
    sector: String(p.sector ?? ""),
    address: String(p.address ?? ""),
    city: String(p.city ?? ""),
    district: String(p.district ?? ""),
    landmark: String(p.landmark ?? ""),
    micro_market: String(p.micro_market ?? p.micromarket ?? ""),
    highway: String(p.highway ?? ""),
    nearby_area: String(p.nearby_area ?? ""),
    description: String(p.description ?? ""),
    meta: metaLocality(p.nearby_places),
  };

  const haystack = Object.values(fields).filter(Boolean).join(" | ");
  return { haystack, fields };
}

function isParentCityNeedle(place: ResolvedPlace, needleNorm: string): boolean {
  const canonical = normalizeText(place.displayName);
  if (needleNorm === canonical) return false;
  if (place.parentCity && normalizeText(place.parentCity) === needleNorm) return true;
  // City-group parents (e.g. Mohali for Kharar) — not true locality neighbours
  return place.cityValues.some((c) => {
    const cn = normalizeText(c);
    return cn === needleNorm && cn !== canonical;
  });
}

function classifyTier(
  place: ResolvedPlace,
  matchedNeedle: string,
  fieldKey: string,
): LocationMatchTier {
  const n = normalizeText(matchedNeedle);
  const canonical = normalizeText(place.displayName);

  // Parent city alone is never "exact" / "neighbor"
  if (isParentCityNeedle(place, n)) return "city";

  if (n === canonical) {
    if (place.kind === "highway") return "highway";
    if (place.kind === "sector") return "sector";
    if (place.kind === "micromarket") return "micromarket";
    if (fieldKey === "city") return place.kind === "city" ? "exact" : "city";
    return "exact";
  }
  if (place.aliases.some((a) => normalizeText(a) === n)) return "alias";
  if (place.nearby.some((a) => normalizeText(a) === n)) {
    if (/highway|nh-?\d/i.test(matchedNeedle)) return "highway";
    return "neighbor";
  }
  // Needle may be an alias of a neighbouring place node
  const needlePlace = getPlaceByAlias(matchedNeedle);
  if (
    needlePlace &&
    place.nearby.some(
      (a) => normalizeText(a) === normalizeText(needlePlace.displayName),
    )
  ) {
    if (needlePlace.kind === "highway" || /highway|nh-?\d/i.test(matchedNeedle)) {
      return "highway";
    }
    return "neighbor";
  }
  if (place.cityValues.some((c) => normalizeText(c) === n)) return "city";
  return "fuzzy";
}

function distanceScoreFromKm(km: number | null): number {
  if (km == null || !Number.isFinite(km)) return 0;
  if (km <= 5) return 100;
  if (km <= 10) return 85;
  if (km <= 20) return 65;
  if (km <= 35) return 40;
  return Math.max(0, 25 - Math.round(km / 5));
}

function propertyCoords(
  p: PropertyLocationFields,
): { lat: number; lng: number } | null {
  if (
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng)
  ) {
    return { lat: p.lat, lng: p.lng };
  }
  const label = [p.location, p.sector, p.city, p.address].filter(Boolean).join(" ");
  return inferCoordsFromLabel(label);
}

/**
 * Score how well a property matches the resolved search place.
 * Never returns a hard miss when a neighbour / highway / fuzzy hit exists.
 */
export function scoreLocationMatch(
  property: PropertyLocationFields,
  place: ResolvedPlace | null,
  options?: { minFuzzy?: number },
): LocationMatchScore {
  if (!place) {
    return {
      matchScore: 0,
      distanceKm: null,
      distanceScore: 0,
      tier: "none",
      matchedOn: [],
      why: [],
      matchedNeedle: null,
    };
  }

  const minFuzzy = options?.minFuzzy ?? 84;
  const { haystack, fields } = buildPropertyHaystack(property);
  const why: string[] = [];
  const matchedOn: string[] = [];

  let bestScore = 0;
  let bestTier: LocationMatchTier = "none";
  let bestNeedle: string | null = null;

  const needles = place.searchNeedles;

  for (const needle of needles) {
    if (!needle || needle.length < 2) continue;

    // Field-level exact / substring
    for (const [key, value] of Object.entries(fields)) {
      if (!value) continue;
      const nv = normalizeText(value);
      const nn = normalizeText(needle);
      // Prefer needle-in-value. value-in-needle only when value is long enough
      // (avoids city="Mohali" matching needle="Greater Mohali" as a strong hit).
      const needleInValue = nv.includes(nn);
      const valueInNeedle =
        !needleInValue &&
        nn.includes(nv) &&
        nv.length >= 8 &&
        !isParentCityNeedle(place, nv);
      const substringHit = needleInValue || valueInNeedle;
      const sim = stringSimilarity(nv, nn);

      if (!substringHit && sim < minFuzzy) continue;
      // Fuzzy-only hit between two different graph nodes → ignore
      if (!substringHit && isDistinctKnownPlaceCollision(value, needle)) continue;
      if (!substringHit) {
        const fieldPlace = getPlaceByAlias(value);
        if (
          fieldPlace &&
          fieldPlace.id !== place.canonicalId &&
          !place.nearby.some((n) => normalizeText(n) === normalizeText(fieldPlace.displayName)) &&
          !place.aliases.some((a) => normalizeText(a) === normalizeText(fieldPlace.displayName))
        ) {
          continue;
        }
      }

      let score = sim;
      if (nv === nn) score = 100;
      else if (needleInValue) score = Math.max(score, 92);
      else if (valueInNeedle) score = Math.min(score, 70);

      const tier = classifyTier(place, needle, key);

      // Parent-city-only hits are weak signals (avoid dumping all of Mohali for Kharar)
      if (tier === "city" && isParentCityNeedle(place, nn)) {
        score = Math.min(score, key === "city" ? 62 : 58);
      }

      // Priority boosts for real locality / corridor fields
      if (key === "location" || key === "sector" || key === "highway") score += 4;
      if (key === "city" && normalizeText(place.displayName) === nn) score += 6;
      if (key === "meta" || key === "description") score -= 4;
      if (tier === "neighbor" || tier === "highway") score = Math.max(score, 88);
      if (tier === "exact" || tier === "alias") score = Math.max(score, 92);

      score = Math.min(100, score);
      if (score > bestScore) {
        bestScore = score;
        bestNeedle = needle;
        bestTier = tier;
        if (!matchedOn.includes(key)) matchedOn.push(key);
      }
    }

    // Whole haystack fuzzy (skip if needle is a parent-city-only signal)
    if (!isParentCityNeedle(place, normalizeText(needle))) {
      // Block fuzzy when any atomic field is a different known place than the needle
      const fieldCollision = Object.values(fields).some(
        (v) => v && isDistinctKnownPlaceCollision(v, needle),
      );
      if (!fieldCollision) {
        const fuzzy = fuzzyIncludes(haystack, needle, minFuzzy);
        if (fuzzy.hit && fuzzy.score > bestScore) {
          bestScore = fuzzy.score;
          bestNeedle = needle;
          bestTier = classifyTier(place, needle, "location");
          if (!matchedOn.includes("fuzzy")) matchedOn.push("fuzzy");
        }
      }
    }
  }

  // Geo distance
  let distanceKm: number | null = null;
  const origin =
    place.lat != null && place.lng != null
      ? { lat: place.lat, lng: place.lng }
      : null;
  const dest = propertyCoords(property);
  if (origin && dest) {
    distanceKm = Math.round(haversineKm(origin.lat, origin.lng, dest.lat, dest.lng) * 10) / 10;
  }
  const distanceScore = distanceScoreFromKm(distanceKm);

  // Geo only lifts empty/weak text matches within a tight radius
  if (distanceKm != null && distanceKm <= 12 && bestScore < 70) {
    bestScore = Math.max(bestScore, 70 + Math.round(distanceScore * 0.2));
    bestTier = bestTier === "none" ? "geo" : bestTier;
    matchedOn.push("distance");
    why.push(`Within ~${distanceKm} km`);
  }

  // Floor score from tier when we have a hit
  if (bestTier !== "none") {
    bestScore = Math.max(bestScore, TIER_BASE[bestTier] - 8);
  }

  if (bestTier === "exact") why.push("Exact locality");
  else if (bestTier === "alias") why.push("Similar locality");
  else if (bestTier === "neighbor" || bestTier === "highway") why.push("Nearby");
  else if (bestTier === "micromarket" || bestTier === "sector") why.push("Same micro-market");
  else if (bestTier === "city" || bestTier === "district") why.push("Same city / district");
  else if (bestTier === "fuzzy" || bestTier === "geo") why.push("Similar locality");
  if (distanceKm != null && distanceKm <= 20) {
    if (!why.some((w) => w.includes("km"))) {
      why.push(`Approx. ${distanceKm} km from ${place.displayName}`);
    }
  }

  // Deduplicate why
  const whyUnique = [...new Set(why)];

  return {
    matchScore: Math.round(Math.min(100, bestScore)),
    distanceKm,
    distanceScore,
    tier: bestTier,
    matchedOn,
    why: whyUnique,
    matchedNeedle: bestNeedle,
  };
}

const STRONG_TIERS = new Set<LocationMatchTier>([
  "exact",
  "alias",
  "neighbor",
  "highway",
  "micromarket",
  "sector",
  "fuzzy",
]);

/** True when the property is relevant enough to show (never empty if neighbours exist). */
export function isLocationRelevant(
  score: LocationMatchScore,
  options?: { minScore?: number; maxDistanceKm?: number; allowWeakCity?: boolean },
): boolean {
  const minScore = options?.minScore ?? 55;
  const maxDistanceKm = options?.maxDistanceKm ?? 25;
  const allowWeakCity = options?.allowWeakCity ?? false;

  if (score.tier === "none") {
    return (
      score.distanceKm != null &&
      score.distanceKm <= Math.min(maxDistanceKm, 12) &&
      score.distanceScore >= 40
    );
  }

  // Strong locality / corridor / alias hits always qualify
  if (STRONG_TIERS.has(score.tier) && score.matchScore >= minScore) return true;

  // Pure geo (no text locality signal) — tighter radius
  if (score.tier === "geo") {
    return score.distanceKm != null && score.distanceKm <= Math.min(maxDistanceKm, 12);
  }

  // Geo radius as supporting signal for weak tiers
  if (score.distanceKm != null && score.distanceKm <= Math.min(maxDistanceKm, 12)) return true;

  // Bare parent-city matches are weak — only if explicitly allowed (Tricity browse)
  if (score.tier === "city" || score.tier === "district") {
    if (allowWeakCity && score.matchScore >= minScore) return true;
    // Parent-city + distance still needs a tight radius (not the full corridor radius)
    if (score.distanceKm != null && score.distanceKm <= Math.min(maxDistanceKm, 10)) {
      return true;
    }
    return false;
  }

  return score.matchScore >= minScore;
}

/** Build PostgREST OR fragments for multi-field location search. */
export function buildLocationOrFilter(place: ResolvedPlace, limitNeedles = 12): string {
  const fields = ["city", "location", "sector", "title", "description", "project_name"];
  // Prefer high-signal needles: canonical, aliases, nearby corridors — NOT full parent city dump
  const needles = [
    place.displayName,
    ...place.aliases.slice(0, 4),
    ...place.nearby.slice(0, 10),
    // Include canonical city only when the place itself is a city
    ...(place.kind === "city" ? [place.displayName] : []),
  ]
    .map((n) => n.trim())
    .filter((n) => n.length >= 2);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const n of needles) {
    const key = normalizeText(n);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(n);
    if (unique.length >= limitNeedles) break;
  }

  const parts: string[] = [];
  for (const needle of unique) {
    const escaped = needle.replace(/[,()]/g, " ");
    for (const field of fields) {
      parts.push(`${field}.ilike.%${escaped}%`);
    }
  }
  return parts.join(",");
}
