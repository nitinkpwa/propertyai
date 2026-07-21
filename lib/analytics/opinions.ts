import type {
  ComparablePriceAnalysis,
  FairValueAnalysis,
  PropertyAnalyticsReport,
  ScoredMetric,
} from "./types";
import { INSUFFICIENT_COMPS, INSUFFICIENT_DATA } from "./types";

/**
 * Deterministic explanations from calculated numbers only.
 * No LLM, no invented metrics.
 */
export function buildPriceOpinion(
  price: ComparablePriceAnalysis,
  fairValue: FairValueAnalysis,
): string {
  if (!price.available || price.currentPricePerSqft == null || price.averagePsf == null) {
    return price.message === INSUFFICIENT_COMPS
      ? INSUFFICIENT_COMPS
      : INSUFFICIENT_DATA;
  }

  const parts = [
    `Current ₹${price.currentPricePerSqft.toLocaleString("en-IN")}/sqft`,
    `area average ₹${price.averagePsf.toLocaleString("en-IN")}/sqft`,
  ];
  if (price.differencePercent != null) {
    const sign = price.differencePercent > 0 ? "+" : "";
    parts.push(`difference ${sign}${price.differencePercent}%`);
  }
  parts.push(`position ${price.marketPosition}`);
  if (price.confidence.available && price.confidence.value != null) {
    parts.push(`confidence ${price.confidence.displayValue}`);
  }
  parts.push(`based on ${price.confidence.basedOn}`);

  let verdict = "";
  if (price.marketPosition === "Undervalued") {
    verdict =
      " This listing sits below the comparable average — useful negotiating context, not a guarantee of upside.";
  } else if (price.marketPosition === "Overpriced") {
    verdict =
      " This listing sits above the comparable average — confirm location or amenity premiums before stretching.";
  } else {
    verdict = " Pricing is in line with verified comparable active listings.";
  }

  if (fairValue.available && fairValue.expected != null) {
    verdict += ` Estimated fair value band centers near ₹${Math.round(fairValue.expected).toLocaleString("en-IN")}.`;
  }

  return `${parts.join(" · ")}.${verdict}`;
}

export function buildInvestmentOpinion(investment: ScoredMetric): string {
  if (!investment.available || investment.score == null) {
    return investment.message ?? INSUFFICIENT_DATA;
  }

  const used = investment.factors
    .filter((f) => f.available && f.score != null)
    .map((f) => `${f.label} ${f.score}`)
    .slice(0, 5);

  return `Investment score ${investment.score}/100 (confidence ${investment.confidence.displayValue}). Factors used: ${used.join(", ") || "verified market signals"}. ${investment.confidence.basedOn}.`;
}

export function buildAnalyticsOpinions(report: Pick<
  PropertyAnalyticsReport,
  "price" | "fairValue" | "investment"
>): Pick<PropertyAnalyticsReport, "priceOpinion" | "investmentOpinion"> {
  return {
    priceOpinion: buildPriceOpinion(report.price, report.fairValue),
    investmentOpinion: buildInvestmentOpinion(report.investment),
  };
}
