import { unavailableConfidence } from "./confidence";
import type { ComparablePriceAnalysis, FairValueAnalysis, SubjectPropertyInput } from "./types";
import { INSUFFICIENT_COMPS, INSUFFICIENT_DATA } from "./types";

/**
 * Fair value = average comparable ₹/sqft × property area.
 * Range uses low/high comparable PSF band (± spread).
 */
export function calculateFairValue(
  subject: SubjectPropertyInput,
  price: ComparablePriceAnalysis,
): FairValueAnalysis {
  const area = subject.areaSqft;
  if (!price.available || price.averagePsf == null || !(area > 0)) {
    return {
      available: false,
      message: price.available ? INSUFFICIENT_DATA : INSUFFICIENT_COMPS,
      averagePsf: price.averagePsf,
      propertyArea: area > 0 ? area : null,
      low: null,
      expected: null,
      high: null,
      confidence: price.confidence.available
        ? price.confidence
        : unavailableConfidence("Need verified comps and area"),
    };
  }

  const avg = price.averagePsf;
  const lowPsf = price.lowestPsf ?? avg * 0.95;
  const highPsf = price.highestPsf ?? avg * 1.05;
  // Constrain range to a sensible band around average when outliers are extreme
  const bandLow = Math.max(lowPsf, avg * 0.92);
  const bandHigh = Math.min(highPsf, avg * 1.08);

  return {
    available: true,
    message: null,
    averagePsf: avg,
    propertyArea: area,
    low: Math.round(bandLow * area),
    expected: Math.round(avg * area),
    high: Math.round(bandHigh * area),
    confidence: price.confidence,
  };
}
