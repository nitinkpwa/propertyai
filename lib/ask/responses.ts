import type { ListingProperty } from "@/lib/properties/types";
import type { AskSearchResult, AskSearchStats, AskSection } from "./types";

export function computeSearchStats(listings: ListingProperty[]): AskSearchStats | null {
  if (listings.length === 0) return null;

  const count = listings.length;
  const avgPrice = listings.reduce((sum, p) => sum + p.price, 0) / count;

  const yieldListings = listings.filter((p) => p.rentalYield !== null);
  const avgRentalYield =
    yieldListings.length > 0
      ? yieldListings.reduce((sum, p) => sum + (p.rentalYield ?? 0), 0) / yieldListings.length
      : 0;

  const scoreListings = listings.filter((p) => p.growthScore !== null);
  const bestInvestmentScore =
    scoreListings.length > 0
      ? Math.max(...scoreListings.map((p) => p.growthScore ?? 0))
      : 0;

  return { count, avgPrice, avgRentalYield, bestInvestmentScore };
}

export function formatPriceShort(price: number): string {
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} crore`;
  }
  return `₹${Math.round(price / 100_000)} lakh`;
}

export function buildSearchHeadline(result: AskSearchResult, stats: AskSearchStats | null): string {
  if (!stats) {
    return "I couldn't find any properties matching your search right now.";
  }

  if (result.isSimilar) {
    return `I found ${stats.count} similar ${stats.count === 1 ? "property" : "properties"}.`;
  }

  return `I found ${stats.count} matching ${stats.count === 1 ? "property" : "properties"}.`;
}

export function buildSearchSubtext(result: AskSearchResult): string | null {
  if (result.listings.length === 0) return null;
  if (result.isSimilar) {
    return `No exact match — showing alternatives based on ${result.similarReason ?? "nearby listings"}.`;
  }
  return "Sorted by relevance to your search.";
}

export function buildKnowledgeHeadline(topic: string): string {
  return `Here's what you should know about ${topic}.`;
}

export function buildComparisonHeadline(areaA: string, areaB: string): string {
  return `${areaA} vs ${areaB} — side-by-side analysis.`;
}

export function buildBuilderHeadline(name: string): string {
  return `Is ${name} a good builder? Here's the AreaIQ assessment.`;
}

export function buildInvestmentHeadline(budgetLabel: string): string {
  return `Top investment opportunities ${budgetLabel}.`;
}

export function buildLocalityHeadline(name: string): string {
  return `Locality guide: ${name}.`;
}

export function sectionsToPlainText(sections: AskSection[]): string {
  return sections.map((s) => `**${s.title}**\n${s.content}`).join("\n\n");
}

export function getTypingStatus(phase: "understanding" | "searching" | "responding"): string {
  if (phase === "understanding") {
    return "I'm comparing projects around your preferred location.";
  }
  if (phase === "searching") {
    return "Checking builder credibility and live listings…";
  }
  return "Looking beyond the advertised price…";
}
