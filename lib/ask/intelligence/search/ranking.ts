import type { ListingProperty } from "@/lib/properties/types";
import type { StructuredIntent, RankedListing } from "../types";

/**
 * Rank properties using intent match signals only — never invents scores from thin air.
 */
export function rankListings(
  listings: ListingProperty[],
  intent: StructuredIntent,
): RankedListing[] {
  return listings
    .map((listing) => {
      let rankScore = 0;
      const matchReasons: string[] = [];

      if (intent.bedrooms != null && listing.bhk === intent.bedrooms) {
        rankScore += 40;
        matchReasons.push(`Exact ${intent.bedrooms} BHK`);
      }

      if (intent.budgetMax != null && listing.price <= intent.budgetMax) {
        rankScore += 25;
        matchReasons.push("Within budget");
        // Prefer closer to budget top for luxury intent
        if (intent.intentStyle === "luxury") {
          const ratio = listing.price / intent.budgetMax;
          rankScore += Math.round(ratio * 10);
        }
      }

      if (intent.budgetMin != null && listing.price >= intent.budgetMin) {
        rankScore += 8;
      }

      const cityHay = `${listing.city ?? ""} ${listing.location ?? ""}`.toLowerCase();
      if (intent.cityGroup?.length) {
        if (intent.cityGroup.some((c) => cityHay.includes(c.toLowerCase()))) {
          rankScore += 15;
          matchReasons.push("Tricity match");
        }
      } else if (intent.city && cityHay.includes(intent.city.toLowerCase())) {
        rankScore += 15;
        matchReasons.push(`City: ${intent.city}`);
      }

      if (intent.locality) {
        if (cityHay.includes(intent.locality.toLowerCase())) {
          rankScore += 12;
          matchReasons.push(`Locality: ${intent.locality}`);
        }
      }

      if (
        intent.builder &&
        listing.builderName?.toLowerCase().includes(intent.builder.toLowerCase())
      ) {
        rankScore += 10;
        matchReasons.push(`Builder: ${intent.builder}`);
      }

      if (typeof listing.growthScore === "number") {
        rankScore += Math.min(10, Math.round(listing.growthScore / 10));
      }
      if (intent.investment && typeof listing.rentalYield === "number") {
        rankScore += Math.min(8, listing.rentalYield);
        matchReasons.push(`Yield ${listing.rentalYield}%`);
      }

      if (listing.aiVerified) rankScore += 3;
      if (listing.reraVerified) rankScore += 2;

      return { listing, rankScore, matchReasons };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}
