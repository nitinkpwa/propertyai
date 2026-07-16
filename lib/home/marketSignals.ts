import type { ListingProperty } from "@/lib/properties/types";
import type {
  AreaIntelligenceCard,
  BuilderShowcaseCard,
  MarketSignal,
} from "./types";

function formatPriceShort(price: number): string {
  if (price >= 10_000_000) {
    const cr = price / 10_000_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} Cr`;
  }
  if (price >= 100_000) {
    const lakhs = price / 100_000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)} L`;
  }
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Build market signal cards from live listings. Unknown metrics stay null + Ask AI. */
export function buildMarketSignals(listings: ListingProperty[]): MarketSignal[] {
  const prices = listings.map((l) => l.price).filter((p) => p > 0);
  const avgPrice = average(prices);
  const yields = listings
    .map((l) => l.rentalYield)
    .filter((y): y is number => y != null && y > 0);
  const avgYield = average(yields);

  const cityCounts = new Map<string, number>();
  for (const l of listings) {
    const city = (l.city || l.location || "").trim();
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const hotAreas = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return [
    {
      id: "avg-price",
      label: "Average Price",
      value: avgPrice != null ? formatPriceShort(avgPrice) : null,
      hint: "Across active listings",
      href: "/properties",
      kind: "metric",
    },
    {
      id: "active",
      label: "Active Listings",
      value: listings.length > 0 ? String(listings.length) : null,
      hint: "Live inventory",
      href: "/properties",
      kind: "metric",
    },
    {
      id: "hot-areas",
      label: "Hot Areas",
      value: hotAreas.length > 0 ? hotAreas.slice(0, 2).join(", ") : null,
      hint: "Most listed micro-markets",
      href: "/ask?q=Hot+areas+Tricity+investment",
      kind: "metric",
    },
    {
      id: "rental-yield",
      label: "Rental Yield",
      value: avgYield != null ? `${avgYield.toFixed(1)}%` : null,
      hint: avgYield != null ? "Avg from listed yields" : "Ask AI for yield outlook",
      href: "/ask?q=Highest+rental+yield+Tricity",
      kind: avgYield != null ? "metric" : "ask",
    },
    {
      id: "today-growth",
      label: "Today's Growth",
      value: null,
      hint: "Ask AI for market movement",
      href: "/ask?q=Today+property+price+growth+Tricity",
      kind: "ask",
    },
    {
      id: "weekly-growth",
      label: "Weekly Growth",
      value: null,
      hint: "Ask AI for weekly trends",
      href: "/ask?q=Weekly+property+price+trends+Tricity",
      kind: "ask",
    },
    {
      id: "launches",
      label: "Projects Launching",
      value: null,
      hint: "Ask AI for new launches",
      href: "/ask?q=New+launch+projects+Tricity",
      kind: "ask",
    },
    {
      id: "most-viewed",
      label: "Most Viewed",
      value: null,
      hint: "Ask AI what's trending",
      href: "/ask?q=Most+viewed+properties+Tricity",
      kind: "ask",
    },
    {
      id: "most-booked",
      label: "Most Booked",
      value: null,
      hint: "Ask AI about visit demand",
      href: "/ask?q=Most+booked+site+visits+Tricity",
      kind: "ask",
    },
    {
      id: "builder-score",
      label: "Builder Score",
      value: null,
      hint: "Ask AI to compare builders",
      href: "/ask?q=Most+reliable+builders+Tricity",
      kind: "ask",
    },
    {
      id: "confidence",
      label: "Market Confidence",
      value: null,
      hint: "Ask AI for outlook",
      href: "/ask?q=Market+confidence+Tricity+real+estate",
      kind: "ask",
    },
  ];
}

export function buildAreaIntelligenceCards(
  listings: ListingProperty[],
): AreaIntelligenceCard[] {
  const byCity = new Map<string, ListingProperty[]>();
  for (const l of listings) {
    const city = (l.city || "").trim() || "Tricity";
    const list = byCity.get(city) ?? [];
    list.push(l);
    byCity.set(city, list);
  }

  return [...byCity.entries()]
    .map(([name, rows]) => {
      const prices = rows.map((r) => r.price).filter((p) => p > 0);
      const growth = rows
        .map((r) => r.growthScore)
        .filter((g): g is number => g != null);
      const yields = rows
        .map((r) => r.rentalYield)
        .filter((y): y is number => y != null);
      return {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        listingCount: rows.length,
        averagePrice: average(prices),
        avgGrowthScore: average(growth),
        avgRentalYield: average(yields),
        href: `/ask?q=${encodeURIComponent(`${name} area intelligence`)}`,
      };
    })
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, 9);
}

export function buildBuilderShowcaseCards(
  listings: ListingProperty[],
): BuilderShowcaseCard[] {
  const byBuilder = new Map<string, ListingProperty[]>();
  for (const l of listings) {
    const name = (l.builderName || "").trim();
    if (!name || name.toLowerCase() === "unknown") continue;
    const list = byBuilder.get(name) ?? [];
    list.push(l);
    byBuilder.set(name, list);
  }

  return [...byBuilder.entries()]
    .map(([name, rows]) => {
      const prices = rows.map((r) => r.price).filter((p) => p > 0);
      const growth = rows
        .map((r) => r.growthScore)
        .filter((g): g is number => g != null);
      const yields = rows
        .map((r) => r.rentalYield)
        .filter((y): y is number => y != null);
      return {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        listingCount: rows.length,
        averagePrice: average(prices),
        avgGrowthScore: average(growth),
        avgRentalYield: average(yields),
        href: `/ask?q=${encodeURIComponent(`${name} builder review Tricity`)}`,
      };
    })
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, 6);
}

export { formatPriceShort };
