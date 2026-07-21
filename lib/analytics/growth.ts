import { calculateConfidence, unavailableConfidence } from "./confidence";
import { round1 } from "./math";
import type {
  ComparablePriceAnalysis,
  GrowthPrediction,
  SubjectPropertyInput,
} from "./types";
import { INSUFFICIENT_DATA } from "./types";

/**
 * Expected growth as a RANGE from verified signals — never a single invented %.
 */
export function calculateGrowthPrediction(
  subject: SubjectPropertyInput,
  price: ComparablePriceAnalysis,
  priceTrendPercent: number | null,
): GrowthPrediction {
  const signals: string[] = [];
  let low: number | null = null;
  let high: number | null = null;

  if (priceTrendPercent != null && Number.isFinite(priceTrendPercent)) {
    // Annualize roughly from recent vs older listing medians (already a %)
    const base = Math.max(-5, Math.min(18, priceTrendPercent));
    low = round1(Math.max(0, base * 0.7));
    high = round1(Math.max(low + 1, base * 1.15));
    signals.push(`Listing price trend signal ${round1(priceTrendPercent)}%`);
  }

  const infra = subject.nearbyPlaces.filter((p) => {
    const t = `${p.type ?? ""} ${p.name ?? ""}`.toLowerCase();
    return /metro|airport|it\b|highway|express|road|flyover/.test(t);
  });
  if (infra.length > 0) {
    signals.push(`${infra.length} nearby infrastructure cue(s) on listing`);
    if (low == null) {
      low = 6;
      high = 10;
    } else {
      low = round1(low + 0.5);
      high = round1(high! + 1.5);
    }
  }

  if (price.available && price.marketPosition === "Undervalued") {
    signals.push("Current pricing below comparable average");
    if (low != null && high != null) {
      low = round1(low + 0.5);
      high = round1(high + 1);
    }
  }

  if (subject.builderName && price.comps.some((c) => c.builderName === subject.builderName)) {
    signals.push("Builder has other active inventory in the comparable set");
  }

  if (low == null || high == null || signals.length < 2) {
    return {
      available: false,
      message: INSUFFICIENT_DATA,
      rangeLabel: null,
      lowPercent: null,
      highPercent: null,
      confidence: unavailableConfidence(
        "Need verified price trend and/or infrastructure signals",
      ),
      signals,
    };
  }

  // Cap absurd ranges
  low = Math.max(0, Math.min(15, low));
  high = Math.max(low + 1, Math.min(18, high));

  return {
    available: true,
    message: null,
    rangeLabel: `${low}%–${high}%`,
    lowPercent: low,
    highPercent: high,
    confidence: calculateConfidence({
      comparableCount: price.comparableCount,
      dataQuality: signals.length >= 3 ? 0.75 : 0.55,
      freshness: price.confidence.value != null ? price.confidence.value / 100 : 0.5,
    }),
    signals,
  };
}
