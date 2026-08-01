/** Derived intelligence models for the Bloomberg-style homepage terminal. */

export type BandLevel = "high" | "medium" | "low" | "unknown";
export type MomentumLevel = "bullish" | "neutral" | "bearish" | "unknown";
export type HeatTone = "green" | "yellow" | "red" | "neutral";

export interface HeroStat {
  id: string;
  label: string;
  /** Numeric value for animated counters; null when unknown */
  value: number | null;
  /** Optional display override (e.g. ₹94L) */
  display: string | null;
  href: string;
}

export type InvestmentGrade = "A" | "B" | "C" | "D" | null;

export interface MapTopProject {
  id: string;
  name: string;
  score: number | null;
  price: number | null;
  href: string;
}

export interface MapSuggestedQuestion {
  id: string;
  label: string;
  href: string;
}

export interface MapAreaActivity {
  id: string;
  label: string;
  detail: string;
  href: string;
}

export interface TricityMapNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Approximate locality polygon ring [lng, lat][] (closed). */
  polygon: [number, number][];
  /** @deprecated SVG legacy — kept for heatmap grid layout */
  x: number;
  y: number;
  listingCount: number;
  verifiedCount: number;
  averagePrice: number | null;
  avgGrowthScore: number | null;
  avgRentalYield: number | null;
  avgAreaIqScore: number | null;
  avgBuilderScore: number | null;
  /** Derived investment score (AreaIQ + growth blend) */
  investmentScore: number | null;
  investmentGrade: InvestmentGrade;
  legalConfidence: number | null;
  marketConfidence: number | null;
  builderCount: number;
  verificationConfidence: number | null;
  demand: BandLevel;
  supply: BandLevel;
  risk: BandLevel;
  /** Relative heat 0–1 within loaded areas */
  heat: number;
  /** Composite glow weight for heatmap (0–1) */
  heatWeight: number;
  /** green | yellow | red | grey tone for polygons */
  zoneTone: "green" | "yellow" | "red" | "grey";
  topProject: MapTopProject | null;
  topProjects: MapTopProject[];
  recentActivity: MapAreaActivity[];
  suggestedQuestions: MapSuggestedQuestion[];
  hasIntelligence: boolean;
  href: string;
  listingsHref: string;
  compareHref: string;
}

export interface MapPointFeature {
  id: string;
  /** Stable property UUID when kind is listing/premium */
  propertyId?: string;
  name: string;
  lat: number;
  lng: number;
  href: string;
  score?: number | null;
  price?: number | null;
  builderName?: string | null;
  kind?: "listing" | "builder" | "premium";
  /** Matched Tricity map zone id */
  areaId?: string | null;
  imageUrl?: string | null;
  bhk?: number | null;
  areaSize?: number | null;
  areaUnit?: "sqft" | "sqyd" | null;
  legalPercent?: number | null;
  builderRating?: number | null;
  verified?: boolean;
  isBestMatch?: boolean;
  /** Grey contextual pin outside the selected area */
  isNearby?: boolean;
  askHref?: string;
  bookVisitHref?: string;
}

export interface MapBuilderLink {
  id: string;
  builderName: string;
  color: string;
  coordinates: [number, number][];
}

export interface MapRoadFeature {
  id: string;
  name: string;
  coordinates: [number, number][];
}

export interface MapLandmarkFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "airport" | "infra";
}

export interface IntelligenceMapLayers {
  verifiedListings: MapPointFeature[];
  builderHeadquarters: MapPointFeature[];
  premiumProjects: MapPointFeature[];
  majorRoads: MapRoadFeature[];
  airport: MapLandmarkFeature | null;
  upcomingInfrastructure: MapLandmarkFeature[];
  builderLinks: MapBuilderLink[];
}

export interface MarketPulseMetric {
  id: string;
  label: string;
  value: string | null;
  numeric: number | null;
  band?: BandLevel | MomentumLevel;
  href: string;
}

export interface LiveActivityItem {
  id: string;
  kind: "builder" | "rera" | "listing" | "legal" | "score";
  label: string;
  detail: string;
  href: string;
}

export interface HeatmapCell {
  id: string;
  name: string;
  averagePrice: number | null;
  monthlyGrowthProxy: number | null;
  outlook: BandLevel;
  tone: HeatTone;
  listingCount: number;
  href: string;
}

export interface BuilderLeaderboardRow {
  id: string;
  rank: number;
  name: string;
  score: number | null;
  projects: number;
  trustPct: number | null;
  deliveryPct: number | null;
  href: string;
}

export interface InvestmentGauge {
  id: string;
  label: string;
  value: number | null;
  href: string;
}

export interface AreaComparisonRow {
  id: string;
  area: string;
  price: number | null;
  roi: number | null;
  rental: number | null;
  builder: number | null;
  demand: number | null;
  score: number | null;
  href: string;
}

export interface TrendingLocationCard {
  id: string;
  name: string;
  score: number | null;
  growth: number | null;
  averagePrice: number | null;
  verifiedProjects: number;
  imageUrl: string | null;
  href: string;
}

export interface ChartPoint {
  name: string;
  value: number;
}

export interface TerminalChartSeries {
  inventoryByArea: ChartPoint[];
  priceBands: ChartPoint[];
  yieldDistribution: ChartPoint[];
  scoreRadials: ChartPoint[];
  marketConfidence: ChartPoint[];
}

export interface StructuredSearchOption {
  id: string;
  label: string;
  value: string;
}

export interface StructuredSearchDefaults {
  locations: StructuredSearchOption[];
  budgets: StructuredSearchOption[];
  bedrooms: StructuredSearchOption[];
  propertyTypes: StructuredSearchOption[];
  goals: StructuredSearchOption[];
}

export interface TerminalBundle {
  heroStats: HeroStat[];
  mapNodes: TricityMapNode[];
  mapLayers: IntelligenceMapLayers;
  pulse: MarketPulseMetric[];
  activity: LiveActivityItem[];
  heatmap: HeatmapCell[];
  builders: BuilderLeaderboardRow[];
  investmentGauges: InvestmentGauge[];
  areaComparison: AreaComparisonRow[];
  trending: TrendingLocationCard[];
  intelligenceGauges: InvestmentGauge[];
  charts: TerminalChartSeries;
  searchDefaults: StructuredSearchDefaults;
}
