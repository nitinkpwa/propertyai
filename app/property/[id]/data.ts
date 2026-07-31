import type { BHKOption, PropertyCardProps } from "../../components/PropertyCard";
import type { AreaIntelligenceReport } from "@/lib/intelligence/types";
import type { PropertyStructuredMeta } from "@/lib/properties/nearbyPlacesMeta";
import type {
  LegalComplianceResult,
  LegalVerificationFlags,
} from "@/lib/properties/legalCompliance";
import {
  formatInrAmount,
  formatPropertyPrice as formatPropertyPriceParts,
  type NormalizedPricing,
} from "@/lib/properties/pricingDisplay";

export interface AISummary {
  summary: string;
  pros: string[];
  cons: string[];
  investmentScore: number | null;
  riskLevel: "Low" | "Moderate" | "High" | null;
  bullets?: string[];
}

export interface FloorPlan {
  bhk: BHKOption;
  area: number;
  price: number;
  label: string;
}

export interface NearbyPlace {
  name: string;
  distance: string;
  type: "airport" | "school" | "hospital" | "mall" | "metro" | "it";
}

export interface BuilderInfo {
  name: string;
  logoInitials: string;
  yearsExperience: number | null;
  projectsDelivered: number | null;
}

export type ScoreMetric = {
  label: string;
  value: number | null;
  displayValue: string;
  available: boolean;
  /** 0–100 confidence when available */
  confidence?: number | null;
  confidenceLabel?: string | null;
  basedOn?: string | null;
};

export type MarketPosition =
  | "Undervalued"
  | "Fair Value"
  | "Fairly Priced"
  | "Slightly Premium"
  | "Overpriced"
  | "Unknown"
  | "Insufficient verified data";

export interface PriceAnalysisData {
  currentPrice: number;
  pricePerSqFt: number;
  averageAreaPrice: number | null;
  averagePsf: number | null;
  medianPsf: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  lowestPsf: number | null;
  highestPsf: number | null;
  differencePercent: number | null;
  priceRankLabel: string | null;
  priceTrendPercent: number | null;
  marketPosition: MarketPosition;
  fairValuePsf: number | null;
  fairValueEstimate: number | null;
  fairValueLow: number | null;
  fairValueHigh: number | null;
  aiOpinion: string;
  comparableCount: number;
  confidence: number | null;
  confidenceLabel: string;
  basedOn: string;
  available: boolean;
  unavailableMessage: string | null;
}

export interface AppreciationScenario {
  label: "Conservative" | "Balanced" | "Aggressive";
  annualRatePercent: number;
  year1: number;
  year3: number;
  year5: number;
}

export interface AppreciationData {
  scenarios: AppreciationScenario[];
  assumptions: string[];
  expectedGrowthLabel: string;
  baseAnnualRate: number | null;
}

export interface RentalIntelData {
  expectedMonthlyRent: number | null;
  annualIncome: number | null;
  yieldPercent: number | null;
  occupancyLabel: string;
  demandLabel: string;
  cashFlowEstimate: number | null;
  roiLabel: string;
  aiOpinion: string;
  available: boolean;
}

export interface BuilderIntelData {
  name: string;
  overallRating: number | null;
  projectsDelivered: number | null;
  activeProjects: number | null;
  deliveryRecord: string;
  constructionQuality: string;
  legalIssues: string;
  customerReviews: string;
  financialStability: string;
  averageDeliveryDelay: string;
  summary: string;
  reraCompliance: string;
}

export interface SimilarSaleComp {
  id: string;
  title: string;
  price: number;
  pricePerSqFt: number | null;
  areaSqft: number;
  location: string;
  builderName: string | null;
  listedAt: string;
  href: string;
}

export interface SimilarSalesData {
  comps: SimilarSaleComp[];
  averagePrice: number | null;
  highestPrice: number | null;
  lowestPrice: number | null;
  monthlyTrendPercent: number | null;
  quarterlyTrendPercent: number | null;
  yearlyTrendPercent: number | null;
  note: string;
}

export interface CompareCandidate {
  id: string;
  name: string;
  price: number;
  area: number;
  builderName: string;
  roi: number | null;
  rentalYield: number | null;
  amenityCount: number | null;
  futureGrowth: number | null;
  areaIqScore: number | null;
  href: string;
}

export interface CompareNearbyData {
  candidates: CompareCandidate[];
  aiVerdict: string;
}

export type RecommendationReason =
  | "Better ROI"
  | "Higher Appreciation"
  | "Better Builder"
  | "Near Metro"
  | "Higher Rental"
  | "Better Value";

export interface RecommendedProperty {
  property: PropertyCardProps;
  reasons: RecommendationReason[];
  why: string;
}

export interface TimelineMilestone {
  id: string;
  label: string;
  status: "done" | "current" | "upcoming";
  detail: string;
}

export interface ProjectTimelineData {
  progressPercent: number;
  milestones: TimelineMilestone[];
  completionLabel: string;
  handoverLabel: string;
  note: string;
}

export interface AreaSignal {
  label: string;
  value: string;
  available: boolean;
  detail?: string;
}

export interface AreaIntelData {
  signals: AreaSignal[];
  futureProjects: string;
  demandSupply: string;
  summary: string;
}

export interface PropertyIntelligenceBundle {
  scores: {
    areaIq: ScoreMetric;
    investment: ScoreMetric;
    rental: ScoreMetric;
    builder: ScoreMetric;
    legal: ScoreMetric;
    location: ScoreMetric;
    amenities: ScoreMetric;
    connectivity: ScoreMetric;
    liquidity: ScoreMetric;
    futureGrowth: ScoreMetric;
    demand: ScoreMetric;
    availability: ScoreMetric;
  };
  /** Full V1 scoring engine report — explanations, confidence, factor breakdown */
  scoringReport?: import("@/lib/scoring/types").PropertyIntelligenceReport | null;
  priceAnalysis: PriceAnalysisData;
  appreciation: AppreciationData;
  rental: RentalIntelData;
  builder: BuilderIntelData;
  similarSales: SimilarSalesData;
  compareNearby: CompareNearbyData;
  recommendations: RecommendedProperty[];
  timeline: ProjectTimelineData;
  area: AreaIntelData;
  compiled: Record<string, string>;
}

export interface PropertyDetail {
  id: string;
  name: string;
  project: string;
  builder: BuilderInfo;
  location: string;
  city: string;
  /** Total price when known; 0 means unknown — use pricingDisplay.primaryPriceLabel */
  price: number;
  /** Legacy PPSF; prefer pricingDisplay for UI */
  pricePerSqFt: number;
  /** Normalized multi-unit pricing for buyer UI */
  pricingDisplay: NormalizedPricing;
  propertyType: string;
  bhk: BHKOption;
  area: number;
  /** Plot / size display e.g. "100–150 Sq Yard" */
  sizeLabel: string;
  status: string;
  possession: string;
  configuration: string;
  totalFloors: number | null;
  parking: string;
  facing: string;
  furnishing: string;
  description: string;
  aiVerified: boolean;
  reraVerified: boolean;
  /** Legal verification flags from DB / meta. */
  legalFlags: LegalVerificationFlags;
  /** Precomputed legal compliance for Trust Layer UI. */
  legalCompliance: LegalComplianceResult;
  images: { id: string; label: string; gradient: string; url?: string | null }[];
  amenities: string[];
  intelligenceReport?: AreaIntelligenceReport | null;
  intelligenceBundle?: PropertyIntelligenceBundle | null;
  structuredMeta?: PropertyStructuredMeta | null;
  aiSummary: AISummary;
  floorPlans: FloorPlan[];
  nearbyPlaces: NearbyPlace[];
  similarProperties: PropertyCardProps[];
  contactPhone: string;
  whatsapp: string;
}

export function formatPrice(price: number): string {
  if (!price || price <= 0) return "Price on Request";
  return formatInrAmount(price);
}

/** Buyer-facing primary market-value line (never a bare unit rate). */
export function formatPropertyPrice(
  property: Pick<PropertyDetail, "pricingDisplay" | "price" | "propertyType" | "area" | "sizeLabel">,
): string {
  if (
    property.pricingDisplay?.primaryPriceLabel &&
    !/\/\s*sq/i.test(property.pricingDisplay.primaryPriceLabel)
  ) {
    return property.pricingDisplay.primaryPriceLabel;
  }
  return formatPropertyPriceParts({
    price: property.price,
    pricingDisplay: property.pricingDisplay,
    propertyType: property.propertyType,
    area: property.area,
  }).displayPrice;
}
