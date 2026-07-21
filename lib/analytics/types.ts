/**
 * AreaIQ Analytics Engine — verified, reproducible metrics only.
 * The LLM may explain these numbers; it must never invent them.
 */

export const INSUFFICIENT_DATA = "Insufficient verified data";
export const INSUFFICIENT_COMPS = "Insufficient comparable listings";
export const WAITING_MARKET_DATA = "Waiting for sufficient verified market data";
export const HISTORICAL_UNAVAILABLE = "Historical data unavailable";
export const PENDING_VERIFICATION = "Pending verification";

export type MarketPositionLabel =
  | "Undervalued"
  | "Fairly Priced"
  | "Overpriced"
  | typeof INSUFFICIENT_DATA;

export interface AnalyticsConfidence {
  /** 0–100 */
  value: number | null;
  displayValue: string;
  basedOn: string;
  available: boolean;
}

export interface AnalyticsMetric {
  value: number | null;
  displayValue: string;
  available: boolean;
  confidence: AnalyticsConfidence;
  explanation?: string;
}

export interface ComparableListing {
  id: string;
  title: string;
  city: string;
  location: string;
  sector: string | null;
  subType: string | null;
  listingType: "buy" | "rent" | "commercial";
  bedrooms: number | null;
  /** Normalized market total (never a unit rate) */
  totalPrice: number;
  areaSqft: number;
  pricePerSqft: number;
  lat: number | null;
  lng: number | null;
  builderName: string | null;
  reraNumber: string | null;
  amenitiesCount: number;
  views: number;
  createdAt: string;
  distanceKm: number | null;
}

export interface SubjectPropertyInput {
  id: string;
  title: string;
  city: string;
  location: string;
  sector: string | null;
  subType: string | null;
  listingType: "buy" | "rent" | "commercial";
  bedrooms: number | null;
  /** Normalized market total */
  totalPrice: number;
  areaSqft: number;
  pricePerSqft: number | null;
  lat: number | null;
  lng: number | null;
  builderName: string | null;
  reraNumber: string | null;
  amenities: string[];
  views: number;
  createdAt: string;
  possession: string | null;
  nearbyPlaces: { name?: string; distance?: string; type?: string }[];
}

export interface CompFilterOptions {
  radiusKm?: number;
  areaTolerance?: number;
  minComps?: number;
}

export interface ComparablePriceAnalysis {
  available: boolean;
  message: string | null;
  comparableCount: number;
  currentTotalPrice: number | null;
  currentPricePerSqft: number | null;
  lowestPsf: number | null;
  highestPsf: number | null;
  medianPsf: number | null;
  averagePsf: number | null;
  differencePercent: number | null;
  marketPosition: MarketPositionLabel;
  priceRank: number | null;
  /** 1 = cheapest among comps+self by psf */
  priceRankLabel: string | null;
  confidence: AnalyticsConfidence;
  comps: ComparableListing[];
}

export interface FairValueAnalysis {
  available: boolean;
  message: string | null;
  averagePsf: number | null;
  propertyArea: number | null;
  low: number | null;
  expected: number | null;
  high: number | null;
  confidence: AnalyticsConfidence;
}

export interface ScoreBreakdownFactor {
  key: string;
  label: string;
  weight: number;
  /** 0–100 when available */
  score: number | null;
  available: boolean;
}

export interface ScoredMetric {
  available: boolean;
  score: number | null;
  displayValue: string;
  message: string | null;
  confidence: AnalyticsConfidence;
  factors: ScoreBreakdownFactor[];
}

export interface GrowthPrediction {
  available: boolean;
  message: string | null;
  /** e.g. "8%–11%" */
  rangeLabel: string | null;
  lowPercent: number | null;
  highPercent: number | null;
  confidence: AnalyticsConfidence;
  signals: string[];
}

export interface PriceTrendPoint {
  year: string;
  averagePsf: number;
  growthPercent: number | null;
}

export interface PriceTrendAnalysis {
  available: boolean;
  message: string | null;
  points: PriceTrendPoint[];
  confidence: AnalyticsConfidence;
}

export interface LegalScoreResult {
  available: boolean;
  score: number | null;
  displayValue: string;
  message: string | null;
  status: "verified" | "partial" | "pending";
  factors: { label: string; status: "pass" | "fail" | "unknown"; detail: string }[];
  confidence: AnalyticsConfidence;
}

export interface EngagementSignals {
  savedCount: number | null;
  visitRequestCount: number | null;
  viewEvents: number | null;
  /** property.views column */
  listingViews: number;
}

export interface PropertyAnalyticsReport {
  propertyId: string;
  generatedAt: string;
  price: ComparablePriceAnalysis;
  fairValue: FairValueAnalysis;
  investment: ScoredMetric;
  builder: ScoredMetric;
  legal: LegalScoreResult;
  liquidity: ScoredMetric;
  growth: GrowthPrediction;
  priceTrend: PriceTrendAnalysis;
  /** Deterministic opinion from calculated numbers only */
  priceOpinion: string;
  investmentOpinion: string;
}
