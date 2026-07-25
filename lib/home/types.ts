import type {
  LegalComplianceResult,
  LegalVerificationFlags,
} from "@/lib/properties/legalCompliance";
import type { ListingProperty } from "@/lib/properties/types";

export type MarketSignalKind =
  | "metric"
  | "ask";

export interface MarketSignal {
  id: string;
  label: string;
  /** Display value when known from live data; null means unknown (show em dash). */
  value: string | null;
  hint: string;
  href: string;
  kind: MarketSignalKind;
}

export interface AreaIntelligenceCard {
  id: string;
  name: string;
  listingCount: number;
  averagePrice: number | null;
  avgGrowthScore: number | null;
  avgRentalYield: number | null;
  href: string;
}

export interface BuilderShowcaseCard {
  id: string;
  name: string;
  listingCount: number;
  averagePrice: number | null;
  avgGrowthScore: number | null;
  avgRentalYield: number | null;
  href: string;
}

export interface PopularQuestion {
  id: string;
  question: string;
  href: string;
}

export interface SearchChip {
  id: string;
  label: string;
  href: string;
}

export interface WhyAreaIQItem {
  id: string;
  title: string;
  description: string;
  href: string;
}

export interface IntelligencePropertyCardModel {
  id: string;
  name: string;
  location: string;
  city?: string;
  price: number;
  builderName: string;
  bhk: number;
  area: number;
  areaUnit?: "sqft" | "sqyd";
  investmentScore: number | null;
  rentalYield: number | null;
  imageUrl?: string | null;
  imageAlt?: string;
  aiVerified?: boolean;
  reraVerified?: boolean;
  legalFlags?: Partial<LegalVerificationFlags> | null;
  legalCompliance?: LegalComplianceResult | null;
  href: string;
  askHref: string;
}

export function listingToIntelligenceCard(
  listing: ListingProperty,
): IntelligencePropertyCardModel {
  return {
    id: listing.id,
    name: listing.name,
    location: listing.location,
    city: listing.city,
    price: listing.price,
    builderName: listing.builderName,
    bhk: listing.bhk,
    area: listing.area,
    areaUnit: listing.areaUnit,
    investmentScore: listing.growthScore,
    rentalYield: listing.rentalYield,
    imageUrl: listing.imageUrl,
    imageAlt: listing.imageAlt,
    aiVerified: listing.aiVerified,
    reraVerified: listing.reraVerified,
    legalFlags: listing.legalFlags,
    legalCompliance: listing.legalCompliance,
    href: `/property/${listing.id}`,
    askHref: `/ask?q=${encodeURIComponent(`Tell me about ${listing.name} in ${listing.location}`)}&propertyId=${listing.id}`,
  };
}
