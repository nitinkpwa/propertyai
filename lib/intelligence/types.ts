export type IntelligenceSource =
  | "AreaIQ Database"
  | "AreaIQ Calculated"
  | "AreaIQ Listings"
  | "OpenAI Analysis"
  | "Google Maps API"
  | "OpenStreetMap API"
  | "Schools API"
  | "Hospitals API"
  | "Metro API"
  | "Airport API"
  | "Traffic API"
  | "RERA API"
  | "Future Development API";

export const UNAVAILABLE_MESSAGE =
  "Data not available yet. AreaIQ will calculate this automatically as more market data is collected.";

export interface IntelligenceMetric<T = number | string> {
  available: boolean;
  value: T | null;
  displayValue: string;
  source: IntelligenceSource | null;
  explanation?: string;
  factors?: string[];
}

export interface MarketContext {
  city: string;
  locality: string;
  listings: MarketListing[];
  totalListings: number;
  newListings90d: number;
  buyListings: number;
  rentListings: number;
  medianPricePerSqft: number | null;
  recentMedianPricePerSqft: number | null;
  olderMedianPricePerSqft: number | null;
  avgViews: number | null;
}

export interface MarketListing {
  id: string;
  price: number;
  areaSqft: number;
  bedrooms: number | null;
  type: "buy" | "rent" | "commercial";
  location: string;
  city: string;
  createdAt: string;
  views: number;
  builderName: string | null;
  /** Raw RERA registration number when provided by seller — not a calculated score. */
  reraNumber: string | null;
}

export interface PropertyIntelligenceInput {
  id: string;
  title: string;
  price: number;
  areaSqft: number;
  bedrooms: number | null;
  type: "buy" | "rent" | "commercial";
  location: string;
  city: string;
  sector: string | null;
  builderName: string | null;
  reraNumber: string | null;
  possession: string | null;
  nearbyPlaces: NearbyPlaceRecord[];
  views: number;
  createdAt: string;
}

export interface NearbyPlaceRecord {
  name?: string;
  distance?: string;
  type?: string;
}

export interface BuilderAnalysisResult {
  reputation: IntelligenceMetric<string>;
  listingCount: IntelligenceMetric<number>;
  reraCompliance: IntelligenceMetric<string>;
  activeCities: IntelligenceMetric<number>;
}

export interface ConnectivityResult {
  airport: IntelligenceMetric<string>;
  metro: IntelligenceMetric<string>;
  highways: IntelligenceMetric<string>;
}

export interface AreaIntelligenceReport {
  propertyId: string;
  generatedAt: string;
  growthScore: IntelligenceMetric<number>;
  rentalYield: IntelligenceMetric<number>;
  investmentScore: IntelligenceMetric<number>;
  builderReputation: IntelligenceMetric<string>;
  demandIndex: IntelligenceMetric<number>;
  schoolsNearby: IntelligenceMetric<number>;
  hospitalsNearby: IntelligenceMetric<number>;
  connectivity: ConnectivityResult;
  builderAnalysis: BuilderAnalysisResult;
  futureOutlook: IntelligenceMetric<string>;
  availableMetrics: string[];
  unavailableMetrics: string[];
  marketSnapshot: {
    comparableListings: number;
    city: string;
    locality: string;
  };
}

export interface OpenAIInsightsInput {
  propertyName: string;
  city: string;
  location: string;
  metrics: Pick<
    AreaIntelligenceReport,
    "growthScore" | "rentalYield" | "investmentScore" | "builderReputation"
  >;
}

export interface IntelligenceProvider<TInput, TResult> {
  id: string;
  source: IntelligenceSource;
  isEnabled: () => boolean;
  fetch: (input: TInput) => Promise<TResult | null>;
}
