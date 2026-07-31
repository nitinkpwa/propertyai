import {
  scoreLocationMatch,
  type ResolvedPlace,
} from "@/lib/location";
import type { ListingProperty } from "@/lib/properties/types";
import type { StructuredIntent, RankedListing } from "../types";

/**
 * Rank properties using intent + Location Intelligence signals.
 */
export function rankListings(
  listings: ListingProperty[],
  intent: StructuredIntent,
): RankedListing[] {
  const place: ResolvedPlace | null = intent.resolvedPlace ?? null;

  return listings
    .map((listing) => {
      let rankScore = 0;
      const matchReasons: string[] = [];

      if (intent.bedrooms != null && listing.bhk === intent.bedrooms) {
        rankScore += 40;
        matchReasons.push(`Exact ${intent.bedrooms} BHK`);
      } else if (intent.bedrooms != null) {
        // Soft penalty — still showable as alternative
        rankScore += Math.max(0, 12 - Math.abs(listing.bhk - intent.bedrooms) * 4);
      }

      if (intent.budgetMax != null && listing.price <= intent.budgetMax) {
        rankScore += 25;
        matchReasons.push("Within budget");
        if (intent.intentStyle === "luxury") {
          const ratio = listing.price / intent.budgetMax;
          rankScore += Math.round(ratio * 10);
        }
      } else if (intent.budgetMax != null && listing.price <= intent.budgetMax * 1.12) {
        rankScore += 10;
        matchReasons.push("Near budget");
      }

      if (intent.budgetMin != null && listing.price >= intent.budgetMin) {
        rankScore += 8;
      }

      // Location Intelligence — multi-field + expansion + distance
      const loc = scoreLocationMatch(
        {
          id: listing.id,
          title: listing.name,
          location: listing.location,
          city: listing.city,
          builder_name: listing.builderName,
        },
        place,
      );

      if (loc.tier !== "none") {
        rankScore += Math.round(loc.matchScore * 0.4);
        for (const w of loc.why) {
          if (!matchReasons.includes(w)) matchReasons.push(w);
        }
      } else {
        // Legacy substring fallback when no resolved place
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
        if (intent.locality && cityHay.includes(intent.locality.toLowerCase())) {
          rankScore += 12;
          matchReasons.push(`Locality: ${intent.locality}`);
        }
      }

      if (loc.distanceKm != null && loc.distanceKm <= 20) {
        rankScore += Math.round(loc.distanceScore * 0.12);
      }

      // Property type soft match
      if (intent.subType) {
        const typeHay = `${listing.propertyType ?? ""}`.toLowerCase();
        if (
          (intent.subType === "flat" && (typeHay.includes("apartment") || typeHay.includes("flat"))) ||
          (intent.subType === "plot" && typeHay.includes("plot")) ||
          (intent.subType === "house" && (typeHay.includes("villa") || typeHay.includes("house")))
        ) {
          rankScore += 10;
          matchReasons.push("Property type match");
        }
      }

      if (
        intent.builder &&
        listing.builderName?.toLowerCase().includes(intent.builder.toLowerCase())
      ) {
        rankScore += 10;
        matchReasons.push(`Builder: ${intent.builder}`);
      }

      // AreaIQ / growth / legal / freshness proxies
      if (typeof listing.growthScore === "number") {
        rankScore += Math.min(12, Math.round(listing.growthScore / 8));
        if (listing.growthScore >= 70) matchReasons.push("Strong AreaIQ Score");
      }
      if (intent.investment && typeof listing.rentalYield === "number") {
        rankScore += Math.min(8, listing.rentalYield);
        matchReasons.push(`Yield ${listing.rentalYield}%`);
      }

      if (listing.aiVerified) {
        rankScore += 4;
        matchReasons.push("Verified listing");
      }
      if (listing.reraVerified) rankScore += 3;
      if (listing.legalCompliance?.level === "verified") {
        rankScore += 5;
        matchReasons.push("Legal verified");
      }

      return {
        listing,
        rankScore,
        matchReasons,
        locationMatchScore: loc.matchScore,
        distanceKm: loc.distanceKm,
        distanceScore: loc.distanceScore,
        locationTier: loc.tier,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}
