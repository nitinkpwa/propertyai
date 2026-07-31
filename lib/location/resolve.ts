/**
 * Resolve a user query / place token into a canonical place + expansions.
 */

import { stringSimilarity, normalizeText } from "./fuzzy";
import {
  ALL_ALIAS_KEYS,
  getPlaceByAlias,
  getPlaceById,
  normalizePlaceToken,
  resolveNearbyNodes,
} from "./synonyms";
import type { PlaceNode, ResolvedPlace } from "./types";

export { normalizePlaceToken };

const SECTOR_RE = /\b(?:sector|sec\.?)\s*([0-9]{1,3}[A-Za-z]?)\b/i;
const NH_RE = /\b(?:nh[-\s]?(\d{1,3})|national\s+highway\s+(\d{1,3}))\b/i;

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalizeText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function cityValuesFor(place: PlaceNode, nearby: PlaceNode[]): string[] {
  const cities = new Set<string>();
  if (place.parentCity) cities.add(place.parentCity);
  if (place.kind === "city") cities.add(place.displayName);
  for (const n of nearby) {
    if (n.parentCity) cities.add(n.parentCity);
    if (n.kind === "city") cities.add(n.displayName);
  }
  // Always keep Mohali in Kharar belt expansions
  if (
    place.id === "kharar" ||
    place.id === "kurali" ||
    place.id.startsWith("kurali") ||
    place.id === "nh-21" ||
    place.id === "chandigarh-highway" ||
    place.id === "sunny-enclave" ||
    place.id === "new-chandigarh-belt"
  ) {
    cities.add("Mohali");
    cities.add("Kharar");
    cities.add("New Chandigarh");
  }
  return [...cities];
}

function toResolved(place: PlaceNode, queryToken: string, confidence: number): ResolvedPlace {
  const nearbyNodes = resolveNearbyNodes(place);
  const nearbyNames = nearbyNodes.map((n) => n.displayName);

  // Needles = self + aliases + neighbour display names + neighbour locality aliases.
  // Do NOT flood with parent-city aliases (that makes every Mohali listing a Kharar hit).
  const neighbourLocalityAliases = nearbyNodes
    .filter((n) => n.kind !== "city" && n.kind !== "district")
    .flatMap((n) => n.aliases);

  const searchNeedles = uniqueStrings([
    place.displayName,
    ...place.aliases,
    ...nearbyNames,
    ...neighbourLocalityAliases,
  ]);

  return {
    canonicalId: place.id,
    displayName: place.displayName,
    kind: place.kind,
    aliases: [...place.aliases],
    nearby: nearbyNames,
    parentCity: place.parentCity,
    cityValues: cityValuesFor(place, nearbyNodes),
    searchNeedles,
    lat: place.lat,
    lng: place.lng,
    matchConfidence: confidence,
    queryToken,
  };
}

/** Find the best place mentioned in free text (greedy longest alias). */
export function resolvePlaceFromQuery(query: string): ResolvedPlace | null {
  const text = normalizeText(query);
  if (!text) return null;

  // Explicit sector
  const sectorMatch = SECTOR_RE.exec(query);
  if (sectorMatch) {
    const label = `Sector ${sectorMatch[1]}`;
    const node = getPlaceByAlias(label);
    if (node) return toResolved(node, label, 0.95);
    // Synthetic sector node
    return {
      canonicalId: `sector-${sectorMatch[1].toLowerCase()}`,
      displayName: label,
      kind: "sector",
      aliases: [label.toLowerCase(), `sec ${sectorMatch[1]}`],
      nearby: ["Mohali"],
      parentCity: "Mohali",
      cityValues: ["Mohali"],
      searchNeedles: [label, `Sec ${sectorMatch[1]}`, `Sector ${sectorMatch[1]}`, "Mohali"],
      lat: null,
      lng: null,
      matchConfidence: 0.85,
      queryToken: label,
    };
  }

  // NH pattern
  const nh = NH_RE.exec(query);
  if (nh) {
    const num = nh[1] || nh[2];
    const label = `NH-${num}`;
    const node = getPlaceByAlias(label) ?? getPlaceByAlias(`nh${num}`);
    if (node) return toResolved(node, label, 0.95);
  }

  // Longest alias substring match
  for (const alias of ALL_ALIAS_KEYS) {
    if (alias.length < 3) continue;
    // Word-boundary-ish: alias appears as contiguous substring
    if (text.includes(alias)) {
      const place = getPlaceByAlias(alias);
      if (place) return toResolved(place, place.displayName, 0.92);
    }
  }

  // Fuzzy against display names / aliases for short tokens
  const tokens = text.split(" ").filter((t) => t.length >= 4);
  let best: { place: PlaceNode; score: number; token: string } | null = null;
  for (const token of tokens) {
    for (const alias of ALL_ALIAS_KEYS) {
      if (alias.length < 4) continue;
      const score = stringSimilarity(token, alias);
      if (score >= 86 && (!best || score > best.score)) {
        const place = getPlaceByAlias(alias);
        if (place) best = { place, score, token };
      }
    }
  }
  if (best) {
    return toResolved(best.place, best.place.displayName, best.score / 100);
  }

  return null;
}

/** Resolve a single location filter string (dropdown / preferred location). */
export function resolvePlace(token: string): ResolvedPlace | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (/\btricity\b|\btri\s*city\b/i.test(trimmed)) {
    return {
      canonicalId: "tricity",
      displayName: "Tricity",
      kind: "district",
      aliases: ["tricity", "tri city"],
      nearby: ["Mohali", "Chandigarh", "Panchkula", "Zirakpur", "Kharar", "Aerocity"],
      parentCity: null,
      cityValues: [
        "Mohali",
        "Chandigarh",
        "Panchkula",
        "Zirakpur",
        "Kharar",
        "New Chandigarh",
        "Aerocity",
        "Derabassi",
      ],
      searchNeedles: [
        "Mohali",
        "Chandigarh",
        "Panchkula",
        "Zirakpur",
        "Kharar",
        "New Chandigarh",
        "Aerocity",
        "Derabassi",
        "Kurali",
        "Airport Road",
      ],
      lat: 30.72,
      lng: 76.76,
      matchConfidence: 0.99,
      queryToken: "Tricity",
    };
  }

  const byAlias = getPlaceByAlias(trimmed);
  if (byAlias) return toResolved(byAlias, byAlias.displayName, 0.98);

  return resolvePlaceFromQuery(trimmed);
}

/** Expand a place into all searchable location strings. */
export function expandLocations(place: ResolvedPlace): string[] {
  return uniqueStrings([
    place.displayName,
    ...place.aliases,
    ...place.nearby,
    ...place.searchNeedles,
    ...place.cityValues,
  ]);
}

/** Look up centroid for a free-text location label (for distance). */
export function inferCoordsFromLabel(
  label: string,
): { lat: number; lng: number } | null {
  const place = getPlaceByAlias(label) ?? resolvePlaceFromQuery(label);
  if (place?.lat != null && place?.lng != null) {
    return { lat: place.lat, lng: place.lng };
  }
  // Partial: scan aliases inside label
  const text = normalizeText(label);
  for (const alias of ALL_ALIAS_KEYS) {
    if (alias.length >= 4 && text.includes(alias)) {
      const node = getPlaceByAlias(alias);
      if (node?.lat != null && node?.lng != null) {
        return { lat: node.lat, lng: node.lng };
      }
    }
  }
  return null;
}

export function getPlaceNode(id: string): PlaceNode | undefined {
  return getPlaceById(id);
}
