import type {
  LegalComplianceResult,
  LegalVerificationFlags,
} from "@/lib/properties/legalCompliance";
import type { ListingProperty } from "@/lib/properties/types";
import { scorePropertyCardFromListing } from "@/lib/scoring/engine";
import { areaIqLabel, legalLabel } from "@/lib/scoring/score-utils";

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

export interface HeroUspItem {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
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
  /** V1 Property Intelligence card scores — never display "—" */
  areaIqScore?: number | null;
  areaIqLabel?: string | null;
  areaIqConfidence?: number | null;
  legalScore?: number | null;
  legalScoreLabel?: string | null;
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
  const verifiedCount = listing.legalCompliance?.verifiedCount ?? 0;
  const cardScores = scorePropertyCardFromListing({
    propertyId: listing.id,
    amenities: (listing.amenities ?? []).map(String),
    legalFlags: listing.legalFlags ?? null,
    legalVerificationAttempted:
      verifiedCount > 0 || Boolean(listing.reraVerified),
    reraNumber: listing.reraVerified ? "verified" : null,
    growthScore: listing.growthScore,
    possession: listing.possession ?? null,
    status: null,
    builderName: listing.builderName,
    city: listing.city,
    location: listing.location,
    price: listing.price,
    areaSqft: listing.area > 0 ? listing.area : null,
    bedrooms: listing.bhk > 0 ? listing.bhk : null,
    imageCount: listing.imageUrl ? 1 : 0,
  });

  const cachedAreaIq =
    typeof (listing as { areaiqScore?: number | null }).areaiqScore === "number"
      ? (listing as { areaiqScore?: number | null }).areaiqScore!
      : null;
  const cachedLegal =
    typeof (listing as { legalScore?: number | null }).legalScore === "number"
      ? (listing as { legalScore?: number | null }).legalScore!
      : null;

  // Prefer engine scores — compliance % is fallback for Legal only when engine lacks docs
  const areaIqScore = cachedAreaIq ?? cardScores.areaIq.score;
  const legalScore = cachedLegal ?? cardScores.legal.score;

  const areaIqLabelValue =
    cardScores.areaIq.available && cardScores.areaIq.label
      ? cardScores.areaIq.label
      : areaIqScore != null
        ? areaIqLabel(areaIqScore)
        : "Insufficient Data";

  const legalLabelValue =
    cardScores.legal.available && cardScores.legal.label
      ? cardScores.legal.label
      : legalScore != null
        ? legalLabel(legalScore)
        : "Insufficient Data";

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
    areaIqScore,
    areaIqLabel: areaIqLabelValue,
    areaIqConfidence: cardScores.areaIq.confidence,
    legalScore,
    legalScoreLabel: legalLabelValue,
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
