import type { IntelligenceMetric, MarketContext, PropertyIntelligenceInput } from "../types";
import { availableMetric, formatPercent, median, unavailableMetric } from "../utils";

const MIN_RENT_COMPS = 2;

export function calculateRentalYield(
  property: PropertyIntelligenceInput,
  market: MarketContext,
): IntelligenceMetric<number> {
  if (property.type !== "buy" || property.price <= 0) {
    return unavailableMetric("Insufficient data");
  }

  const rentComps = market.listings.filter((listing) => {
    if (listing.type !== "rent" || listing.price <= 0) return false;
    if (property.bedrooms && listing.bedrooms && listing.bedrooms !== property.bedrooms) {
      return false;
    }
    return true;
  });

  if (rentComps.length < MIN_RENT_COMPS) {
    return unavailableMetric("Insufficient data");
  }

  const monthlyRents = rentComps.map((l) => l.price);
  const medianMonthlyRent = median(monthlyRents);
  if (medianMonthlyRent === null || medianMonthlyRent <= 0) {
    return unavailableMetric("Insufficient data");
  }

  const annualRent = medianMonthlyRent * 12;
  const yieldPercent = (annualRent / property.price) * 100;

  if (yieldPercent <= 0 || yieldPercent > 25) {
    return unavailableMetric("Insufficient data");
  }

  return availableMetric(
    Number(yieldPercent.toFixed(2)),
    formatPercent(yieldPercent),
    "AreaIQ Calculated",
    {
      factors: [
        `Based on ${rentComps.length} rental listings in ${market.city}`,
        `Median rent ₹${Math.round(medianMonthlyRent).toLocaleString("en-IN")}/month`,
        `Formula: (Annual Rent ÷ Property Price) × 100`,
      ],
    },
  );
}
