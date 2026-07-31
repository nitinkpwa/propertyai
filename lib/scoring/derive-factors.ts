/**
 * Pure mappers: property / analytics / legal flags → scoring factor values.
 * Keeps calculators free of DB / analytics types.
 */

import type { LegalVerificationFlags } from "@/lib/properties/legalCompliance";
import { clampScore, scaleCount } from "./score-utils";
import type { LegalDocumentFlags } from "./types";

export function amenitiesToScore(amenities: string[] | null | undefined): number | null {
  if (!amenities?.length) return null;
  return scaleCount(amenities.length, 6, 40, 95);
}

export function nearbyToConnectivityScore(
  places: { type?: string; distance?: string }[] | null | undefined,
): number | null {
  if (!places?.length) return null;
  const types = new Set(
    places.map((p) => (p.type ?? "").toLowerCase()).filter(Boolean),
  );
  const keys = ["airport", "metro", "highway", "it", "school", "hospital", "mall"];
  const hits = keys.filter((t) => [...types].some((x) => x.includes(t))).length;
  if (hits === 0) return null;
  return clampScore(40 + hits * 10);
}

export function nearbyToLocationParts(
  places: { type?: string; distance?: string }[] | null | undefined,
): {
  schools: number | null;
  hospitals: number | null;
  highways: number | null;
  metro: number | null;
  airport: number | null;
  itParks: number | null;
} {
  const empty = {
    schools: null as number | null,
    hospitals: null as number | null,
    highways: null as number | null,
    metro: null as number | null,
    airport: null as number | null,
    itParks: null as number | null,
  };
  if (!places?.length) return empty;

  const scoreType = (needle: string): number | null => {
    const match = places.find((p) => (p.type ?? "").toLowerCase().includes(needle));
    if (!match) return null;
    // Presence alone = solid signal; distance strings not parsed here
    return 78;
  };

  return {
    schools: scoreType("school"),
    hospitals: scoreType("hospital"),
    highways: scoreType("highway"),
    metro: scoreType("metro"),
    airport: scoreType("airport"),
    itParks: scoreType("it"),
  };
}

/**
 * Map AreaIQ legal verification flags → Legal Score document inputs.
 * Unknown fields stay null (never assume pass/fail).
 *
 * When `verificationAttempted` is false, only positive evidence counts
 * (RERA number / verified=true). Unchecked defaults are treated as unknown
 * so we never mark an unverified listing as High Risk.
 */
export function legalFlagsToDocuments(
  flags: Partial<LegalVerificationFlags> | null | undefined,
  extras?: {
    reraNumber?: string | null;
    /** Explicit litigation flag when available */
    litigation?: boolean | null;
    encumbranceClear?: boolean | null;
    registryVerified?: boolean | null;
    /** True when admin has saved legal verification at least once */
    verificationAttempted?: boolean;
  },
): LegalDocumentFlags {
  const f = flags ?? {};
  const attempted = Boolean(extras?.verificationAttempted);
  const hasReraNumber = Boolean(extras?.reraNumber?.trim());

  const known = (value: boolean | undefined | null): boolean | null => {
    if (value === true) return true;
    if (attempted && value === false) return false;
    return null;
  };

  return {
    rera: f.rera_certificate === true || hasReraNumber ? true : known(f.rera_certificate),
    registry: extras?.registryVerified ?? null,
    ownership: known(f.title_deed_verified),
    approvedMaps:
      known(f.approved_building_plan) ?? known(f.govt_layout_approved),
    noc: known(f.noc_verified),
    occupationCertificate:
      known(f.occupation_certificate) ?? known(f.completion_certificate),
    bankApproval: known(f.bank_approved),
    titleClear: known(f.title_deed_verified),
    encumbrance: extras?.encumbranceClear ?? null,
    litigation: extras?.litigation ?? null,
  };
}

/** Map rental yield % (e.g. 3.5) into 0–100 investment factor */
export function rentalYieldToScore(yieldPercent: number | null | undefined): number | null {
  if (yieldPercent == null || yieldPercent <= 0) return null;
  return clampScore(30 + yieldPercent * 12);
}

/** Map growth mid-range % into appreciation factor */
export function growthToAppreciationScore(
  lowPercent: number | null | undefined,
  highPercent: number | null | undefined,
): number | null {
  if (lowPercent == null) return null;
  const mid = (lowPercent + (highPercent ?? lowPercent + 2)) / 2;
  return clampScore(35 + mid * 5);
}

/** Difference % vs market → entry price factor (lower price = higher score) */
export function priceDiffToEntryScore(differencePercent: number | null | undefined): number | null {
  if (differencePercent == null) return null;
  if (differencePercent <= -10) return 92;
  if (differencePercent <= -5) return 85;
  if (differencePercent <= 5) return 78;
  if (differencePercent <= 12) return 62;
  return 45;
}

/** Construction quality proxy from possession / status signals */
export function constructionQualityFromStatus(
  possession: string | null | undefined,
  status: string | null | undefined,
): number | null {
  const blob = `${possession ?? ""} ${status ?? ""}`.toLowerCase();
  if (!blob.trim()) return null;
  if (blob.includes("ready") || blob.includes("immediate")) return 82;
  if (blob.includes("construction") || blob.includes("under")) return 62;
  if (blob.includes("new") || blob.includes("launch")) return 55;
  return 60;
}

/** Livability from amenities + connectivity blend */
export function livabilityFromParts(
  amenitiesScore: number | null,
  connectivityScore: number | null,
  locationScore: number | null,
): number | null {
  const parts = [amenitiesScore, connectivityScore, locationScore].filter(
    (v): v is number => v != null,
  );
  if (parts.length === 0) return null;
  return clampScore(parts.reduce((a, b) => a + b, 0) / parts.length);
}

/** Demand from views vs market average */
export function demandFromViews(
  views: number | null | undefined,
  marketAvgViews: number | null | undefined,
): number | null {
  if (views == null || views < 0) return null;
  if (marketAvgViews == null || marketAvgViews <= 0) {
    return views > 0 ? clampScore(45 + Math.min(40, views / 5)) : null;
  }
  const ratio = views / marketAvgViews;
  return clampScore(40 + Math.min(55, ratio * 40));
}

/** Supply vs demand: fewer comps relative to demand → higher score */
export function supplyDemandScore(
  totalListings: number | null | undefined,
  demandScore: number | null | undefined,
): number | null {
  if (totalListings == null && demandScore == null) return null;
  const inventoryPressure =
    totalListings == null
      ? 50
      : totalListings <= 5
        ? 85
        : totalListings <= 15
          ? 70
          : totalListings <= 30
            ? 55
            : 40;
  if (demandScore == null) return inventoryPressure;
  return clampScore(inventoryPressure * 0.55 + demandScore * 0.45);
}

/**
 * Listing-signal baselines — used when rich intel is missing.
 * These are conservative, explainable floors from observable listing fields.
 * They do NOT invent market comps, rental yield, or crime data.
 */

/** City + locality on listing → location factor (boosted when nearby places exist). */
export function locationFromListingMeta(
  city?: string | null,
  location?: string | null,
  nearbyBoost?: number | null,
): number | null {
  const hasCity = Boolean(city?.trim());
  const hasLoc = Boolean(location?.trim());
  if (!hasCity && !hasLoc) return null;
  let base = hasCity && hasLoc ? 74 : 66;
  if (nearbyBoost != null) {
    base = clampScore(base * 0.55 + nearbyBoost * 0.45);
  }
  return clampScore(base);
}

/** Named builder without verified track record — identified, not rated elite. */
export function builderFromName(name?: string | null): number | null {
  const n = name?.trim();
  if (!n || /^unknown|n\/?a|tbd|builder$/i.test(n)) return null;
  return 70;
}

/**
 * Documented list price. Without comps this is NOT "fair value" —
 * it confirms pricing completeness so AreaIQ can score partially.
 */
export function priceFromListingDocumented(
  price?: number | null,
  areaSqft?: number | null,
): number | null {
  if (price == null || price <= 0) return null;
  if (areaSqft != null && areaSqft > 0) return 76;
  return 70;
}

/** BHK / area / possession → construction & configuration completeness. */
export function constructionFromConfiguration(input: {
  bedrooms?: number | null;
  areaSqft?: number | null;
  possession?: string | null;
  status?: string | null;
}): number | null {
  const fromStatus = constructionQualityFromStatus(input.possession, input.status);
  const hasBeds = input.bedrooms != null && input.bedrooms > 0;
  const hasArea = input.areaSqft != null && input.areaSqft > 0;
  if (!fromStatus && !hasBeds && !hasArea) return null;
  let score = fromStatus ?? 68;
  if (hasBeds && hasArea) score = clampScore(score * 0.65 + 80 * 0.35);
  else if (hasBeds || hasArea) score = clampScore(score * 0.75 + 74 * 0.25);
  return score;
}

/** Photo count → amenity/livability support signal (media completeness). */
export function mediaCompletenessScore(imageCount?: number | null): number | null {
  if (imageCount == null || imageCount <= 0) return null;
  return clampScore(58 + Math.min(32, imageCount * 4));
}
