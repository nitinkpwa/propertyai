import { LOCATION_OPTIONS } from "./constants";
import type { PropertyFilterState } from "./types";

const KNOWN_LOCATIONS = [
  ...LOCATION_OPTIONS,
  "Chandigarh",
  "Tricity",
];

/**
 * Maps popular / free-text search chips into real filter fields
 * instead of stuffing everything into `location`.
 */
export function applySearchQuery(
  filters: PropertyFilterState,
  raw: string,
): PropertyFilterState {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ...filters, location: null };
  }

  const lower = trimmed.toLowerCase();

  const underCr = lower.match(/^under\s+(\d+(?:\.\d+)?)\s*cr$/i);
  if (underCr) {
    const crores = Number(underCr[1]);
    if (Number.isFinite(crores) && crores > 0) {
      return {
        ...filters,
        maxPrice: Math.round(crores * 10_000_000),
        minPrice: filters.minPrice,
      };
    }
  }

  const underLakh = lower.match(/^under\s+(\d+(?:\.\d+)?)\s*l(?:akh|ac)?s?$/i);
  if (underLakh) {
    const lakhs = Number(underLakh[1]);
    if (Number.isFinite(lakhs) && lakhs > 0) {
      return {
        ...filters,
        maxPrice: Math.round(lakhs * 100_000),
        minPrice: filters.minPrice,
      };
    }
  }

  const bhkOnly = lower.match(/^(\d)\s*bhk$/i);
  if (bhkOnly) {
    const bhk = Number(bhkOnly[1]);
    return {
      ...filters,
      bhk: filters.bhk.includes(bhk) ? filters.bhk : [...filters.bhk, bhk].sort((a, b) => a - b),
    };
  }

  const known = KNOWN_LOCATIONS.find((item) => item.toLowerCase() === lower);
  if (known) {
    return { ...filters, location: known };
  }

  // Free-text locality / project / builder search (fuzzy-matched in filterProperties)
  return { ...filters, location: trimmed };
}
