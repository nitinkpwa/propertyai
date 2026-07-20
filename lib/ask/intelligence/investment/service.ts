import type { ListingProperty } from "@/lib/properties/types";
import type { InvestmentIntelligence, StructuredIntent } from "../types";

function gradeFromScore(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

/**
 * Investment Intelligence — computed only from verified listing metrics.
 * Missing fields stay null (composer must say unavailable).
 */
export function computeInvestmentIntelligence(
  listings: ListingProperty[],
  intent: StructuredIntent,
): InvestmentIntelligence | null {
  if (!intent.investment && !intent.rentalFocus) {
    // Still compute lightly when we have yield data for search answers
    if (listings.every((l) => l.rentalYield == null && l.growthScore == null)) {
      return null;
    }
  }

  const yields = listings
    .map((l) => l.rentalYield)
    .filter((v): v is number => typeof v === "number");
  const growth = listings
    .map((l) => l.growthScore)
    .filter((v): v is number => typeof v === "number");

  const avgYield =
    yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : null;
  const avgGrowth =
    growth.length > 0 ? growth.reduce((a, b) => a + b, 0) / growth.length : null;

  const demandScore = avgGrowth;
  const liquidityScore =
    avgYield != null && avgGrowth != null
      ? Math.round((avgYield * 8 + avgGrowth) / 2)
      : avgGrowth != null
        ? Math.round(avgGrowth)
        : null;

  const expectedRoi =
    avgYield != null && avgGrowth != null
      ? Math.round((avgYield + avgGrowth / 10) * 10) / 10
      : avgYield;

  const notes: string[] = [];
  if (avgYield == null) {
    notes.push("Rental yield is currently unavailable for some matched listings.");
  }
  if (avgGrowth == null) {
    notes.push("Capital appreciation score is currently unavailable for some matched listings.");
  }
  if (intent.intentStyle === "luxury") {
    notes.push("Luxury intent prioritises product quality over pure yield.");
  }

  return {
    rentalYield: avgYield != null ? Math.round(avgYield * 10) / 10 : null,
    capitalAppreciation: avgGrowth != null ? Math.round(avgGrowth) : null,
    demandScore: demandScore != null ? Math.round(demandScore) : null,
    liquidityScore,
    holdingPeriodYears: intent.investment ? 5 : 7,
    expectedRoi,
    investmentGrade: gradeFromScore(
      expectedRoi != null ? Math.min(100, expectedRoi * 10) : avgGrowth,
    ),
    rentalGrade: gradeFromScore(avgYield != null ? avgYield * 12 : null),
    selfUseGrade: gradeFromScore(avgGrowth),
    notes,
  };
}

export function formatInvestmentForComposer(
  inv: InvestmentIntelligence | null,
): string {
  if (!inv) return "Investment Intelligence: not computed for this query.";
  return [
    inv.rentalYield != null
      ? `Avg rental yield: ${inv.rentalYield}%`
      : "Avg rental yield: unavailable",
    inv.capitalAppreciation != null
      ? `Capital appreciation score: ${inv.capitalAppreciation}/100`
      : "Capital appreciation: unavailable",
    inv.demandScore != null ? `Demand score: ${inv.demandScore}/100` : null,
    inv.liquidityScore != null ? `Liquidity score: ${inv.liquidityScore}/100` : null,
    inv.holdingPeriodYears != null
      ? `Suggested holding period: ${inv.holdingPeriodYears} years`
      : null,
    inv.expectedRoi != null ? `Expected ROI signal: ${inv.expectedRoi}` : null,
    inv.investmentGrade && `Investment grade: ${inv.investmentGrade}`,
    inv.rentalGrade && `Rental grade: ${inv.rentalGrade}`,
    inv.selfUseGrade && `Self-use grade: ${inv.selfUseGrade}`,
    ...inv.notes,
  ]
    .filter(Boolean)
    .join("\n");
}
