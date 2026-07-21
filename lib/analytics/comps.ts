import { calculateConfidence, unavailableConfidence } from "./confidence";
import { average, haversineKm, median, round1 } from "./math";
import type {
  CompFilterOptions,
  ComparableListing,
  ComparablePriceAnalysis,
  SubjectPropertyInput,
} from "./types";
import { INSUFFICIENT_COMPS, INSUFFICIENT_DATA } from "./types";

const DEFAULT_RADIUS_KM = 5;
const DEFAULT_AREA_TOLERANCE = 0.2;
const MIN_COMPS = 3;

function localityMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

/**
 * Filter candidate listings into strict comparables.
 * Uses live schema rules: status=active already applied by fetch.
 */
export function filterComparables(
  subject: SubjectPropertyInput,
  candidates: ComparableListing[],
  options: CompFilterOptions = {},
): ComparableListing[] {
  const radiusKm = options.radiusKm ?? DEFAULT_RADIUS_KM;
  const areaTol = options.areaTolerance ?? DEFAULT_AREA_TOLERANCE;

  const city = subject.city.trim().toLowerCase();
  const area = subject.areaSqft;

  return candidates
    .filter((c) => c.id !== subject.id)
    .filter((c) => c.listingType === subject.listingType)
    .filter((c) => c.totalPrice > 0 && c.areaSqft > 0 && c.pricePerSqft > 0)
    .filter((c) => c.city.trim().toLowerCase().includes(city) || city.includes(c.city.trim().toLowerCase()))
    .filter((c) => {
      if (subject.subType && c.subType) {
        return c.subType.toLowerCase() === subject.subType.toLowerCase();
      }
      return true;
    })
    .filter((c) => {
      if (subject.bedrooms != null && subject.bedrooms > 0 && c.bedrooms != null) {
        return Math.abs(c.bedrooms - subject.bedrooms) <= 1;
      }
      return true;
    })
    .filter((c) => {
      if (area <= 0 || c.areaSqft <= 0) return false;
      const ratio = c.areaSqft / area;
      return ratio >= 1 - areaTol && ratio <= 1 + areaTol;
    })
    .map((c) => {
      let distanceKm = c.distanceKm;
      if (
        distanceKm == null &&
        subject.lat != null &&
        subject.lng != null &&
        c.lat != null &&
        c.lng != null
      ) {
        distanceKm = haversineKm(subject.lat, subject.lng, c.lat, c.lng);
      }
      return { ...c, distanceKm };
    })
    .filter((c) => {
      // Prefer radius when both have coords; otherwise allow same locality/city pool
      if (c.distanceKm != null) return c.distanceKm <= radiusKm;
      return (
        localityMatch(c.location, subject.location) ||
        localityMatch(c.sector ?? "", subject.sector ?? "") ||
        localityMatch(c.location, subject.sector ?? "") ||
        localityMatch(subject.location, c.sector ?? "")
      );
    })
    .sort((a, b) => {
      const da = a.distanceKm ?? 999;
      const db = b.distanceKm ?? 999;
      if (da !== db) return da - db;
      return Math.abs(a.areaSqft - area) - Math.abs(b.areaSqft - area);
    });
}

export function calculateComparablePrices(
  subject: SubjectPropertyInput,
  candidates: ComparableListing[],
  options: CompFilterOptions = {},
): ComparablePriceAnalysis {
  const minComps = options.minComps ?? MIN_COMPS;
  let comps = filterComparables(subject, candidates, options);

  // Soften locality if too few comps: same city + type + area band only
  if (comps.length < minComps) {
    comps = filterComparables(subject, candidates, {
      ...options,
      radiusKm: (options.radiusKm ?? DEFAULT_RADIUS_KM) * 2,
    });
  }

  if (comps.length < minComps) {
    // Last resort: city + type + area only (ignore locality/radius)
    const area = subject.areaSqft;
    const areaTol = options.areaTolerance ?? DEFAULT_AREA_TOLERANCE;
    comps = candidates
      .filter((c) => c.id !== subject.id)
      .filter((c) => c.listingType === subject.listingType)
      .filter((c) => c.totalPrice > 0 && c.pricePerSqft > 0 && c.areaSqft > 0)
      .filter((c) => {
        if (area <= 0) return true;
        const ratio = c.areaSqft / area;
        return ratio >= 1 - areaTol && ratio <= 1 + areaTol;
      })
      .slice(0, 40);
  }

  const currentPsf = subject.pricePerSqft;
  const currentTotal = subject.totalPrice > 0 ? subject.totalPrice : null;

  if (comps.length < minComps || currentPsf == null || currentPsf <= 0) {
    return {
      available: false,
      message: comps.length < minComps ? INSUFFICIENT_COMPS : INSUFFICIENT_DATA,
      comparableCount: comps.length,
      currentTotalPrice: currentTotal,
      currentPricePerSqft: currentPsf,
      lowestPsf: null,
      highestPsf: null,
      medianPsf: null,
      averagePsf: null,
      differencePercent: null,
      marketPosition: INSUFFICIENT_DATA,
      priceRank: null,
      priceRankLabel: null,
      confidence: unavailableConfidence(
        comps.length < minComps
          ? `${comps.length} comparable listing${comps.length === 1 ? "" : "s"} (need ${minComps}+)`
          : "Subject price/sqft unavailable",
      ),
      comps,
    };
  }

  const psfs = comps.map((c) => c.pricePerSqft);
  const lowestPsf = Math.min(...psfs);
  const highestPsf = Math.max(...psfs);
  const medianPsf = median(psfs)!;
  const averagePsf = average(psfs)!;
  const differencePercent = round1(((currentPsf - averagePsf) / averagePsf) * 100);

  let marketPosition: ComparablePriceAnalysis["marketPosition"] = "Fairly Priced";
  if (differencePercent <= -8) marketPosition = "Undervalued";
  else if (differencePercent >= 8) marketPosition = "Overpriced";

  const ranked = [...psfs, currentPsf].sort((a, b) => a - b);
  const priceRank = ranked.indexOf(currentPsf) + 1;
  const totalInRank = ranked.length;

  const now = Date.now();
  const freshShare =
    comps.filter((c) => now - new Date(c.createdAt).getTime() < 180 * 86400000).length /
    comps.length;

  const confidence = calculateConfidence({
    comparableCount: comps.length,
    dataQuality: subject.subType ? 0.85 : 0.65,
    freshness: freshShare,
  });

  return {
    available: true,
    message: null,
    comparableCount: comps.length,
    currentTotalPrice: currentTotal,
    currentPricePerSqft: Math.round(currentPsf),
    lowestPsf: Math.round(lowestPsf),
    highestPsf: Math.round(highestPsf),
    medianPsf: Math.round(medianPsf),
    averagePsf: Math.round(averagePsf),
    differencePercent,
    marketPosition,
    priceRank,
    priceRankLabel: `${priceRank} of ${totalInRank} by price/sqft`,
    confidence,
    comps,
  };
}
