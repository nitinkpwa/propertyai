/**
 * AreaIQ AI Property Studio — import, confidence, and knowledge types.
 */

import type { AdminPropertyFormState } from "../types";

export type StudioMode = "ai_import" | "manual";

export type StudioStage = "import" | "progress" | "review";

/** Future-ready import channels (WhatsApp implemented; others stubbed). */
export type ImportSource =
  | "whatsapp"
  | "email"
  | "telegram"
  | "excel"
  | "csv"
  | "erp"
  | "url"
  | "folder"
  | "gdrive";

export type EmbeddingStatus = "pending" | "skipped";

export const AI_PIPELINE_STEPS = [
  { id: "whatsapp", label: "Reading WhatsApp message..." },
  { id: "brochures", label: "Scanning brochures..." },
  { id: "layouts", label: "Extracting layouts..." },
  { id: "images", label: "Reading images..." },
  { id: "builder", label: "Matching builder..." },
  { id: "structured", label: "Creating structured property..." },
  { id: "seo", label: "Generating SEO description..." },
  { id: "insights", label: "Calculating AI insights..." },
] as const;

export type AiPipelineStepId = (typeof AI_PIPELINE_STEPS)[number]["id"];

export interface StudioDocumentRef {
  id: string;
  name: string;
  url: string;
  category:
    | "brochure"
    | "price_list"
    | "layout"
    | "payment_plan"
    | "rera"
    | "master_plan"
    | "other";
}

export interface StudioImageRef {
  id: string;
  url: string;
  name: string;
}

/** Single structured fact for AreaIQ AI Brain / semantic search. */
export interface BrainFact {
  key: string;
  label: string;
  value: string;
  confidence: number;
  category:
    | "identity"
    | "pricing"
    | "location"
    | "connectivity"
    | "compliance"
    | "product"
    | "investment"
    | "amenities"
    | "contact"
    | "media"
    | "other";
  sourceSnippet?: string;
}

/** AI Brain knowledge blob persisted in nearby_places.meta.importKnowledge */
export interface ImportKnowledge {
  source: ImportSource;
  whatsappText: string;
  extractedText: string;
  ocrSnippets: string[];
  documentRefs: StudioDocumentRef[];
  imageRefs: StudioImageRef[];
  googleMapsUrl: string;
  lat: string;
  lng: string;
  fieldConfidence: Record<string, number>;
  /** All extracted facts as searchable brain units. */
  brainFacts: BrainFact[];
  /** Flattened structured map for queries (key → value). */
  structuredFields: Record<string, string | string[]>;
  /** Concatenated search corpus for future embeddings. */
  semanticSearchText: string;
  embeddingStatus: EmbeddingStatus;
  importedAt: string;
}

/**
 * Full semantic extraction schema.
 * Marketing prose must be decomposed into these fields — never left only in description.
 */
export interface ExtractedListingFields {
  // Identity
  projectName: string;
  builder: string;
  developer: string;
  seller: string;
  propertyType: string;
  listingType: string;
  segment: string;
  configuration: string;
  plotSizes: string;
  minPlotSize: string;
  maxPlotSize: string;
  plotSizeUnit: string;
  apartmentSizes: string;

  // Pricing
  price: string;
  priceRange: string;
  pricePerSqFt: string;
  pricePerYard: string;
  pricePerAcre: string;
  totalPrice: string;
  currency: string;
  paymentPlan: string;

  // Timeline / status
  possession: string;
  launchStatus: string;

  // Compliance
  rera: string;
  reraStatus: string;
  projectTrustScore: string;

  // Roads / connectivity
  roadWidth: string;
  roadName: string;
  roadStatus: string;
  connectivity: string;
  connectivityAdvantage: string;

  // Location intelligence
  facing: string;
  location: string;
  city: string;
  sector: string;
  locality: string;
  landmark: string;
  nearbyLandmark: string;
  areaType: string;
  nearbyAirport: string;
  airportProximity: string;
  airportDistance: string;
  metroDistance: string;
  hospitalDistance: string;
  schoolDistance: string;
  mallDistance: string;
  highwayDistance: string;
  investmentAdvantage: string;

  // Investment / buyer fit
  suitableFor: string;
  investorScore: string;
  buyerPersona: string;

  // Product extras
  amenities: string[];
  clubHouse: string;
  pool: string;
  gym: string;
  park: string;
  security: string;
  powerBackup: string;
  water: string;
  parking: string;
  lift: string;
  landscape: string;

  // Copy (assembled FROM structured facts — not a dump of raw WhatsApp)
  description: string;
  shortDescription: string;
  longDescription: string;
  investmentHighlights: string;
  buyerHighlights: string;
  keywords: string;

  // Contact / media
  phone: string;
  email: string;
  website: string;
  contactName: string;
  youtube: string;
  googleMapsUrl: string;
  lat: string;
  lng: string;
}

export interface FieldConfidenceMap {
  [fieldPath: string]: number;
}

export interface PropertyImportRequest {
  whatsappText: string;
  images: StudioImageRef[];
  documents: StudioDocumentRef[];
  googleMapsUrl?: string;
  lat?: string;
  lng?: string;
  source?: ImportSource;
}

export interface PropertyImportResult {
  form: AdminPropertyFormState;
  fieldConfidence: FieldConfidenceMap;
  warnings: string[];
  missingRequired: string[];
  knowledge: ImportKnowledge;
  summary: string;
  lowConfidenceFields: Array<{ path: string; label: string; confidence: number }>;
  /** Flat list of brain facts for review UI. */
  brainFacts: BrainFact[];
}

export type GenerateAction =
  | "improve_description"
  | "rewrite_seo"
  | "whatsapp_ad"
  | "facebook_ad"
  | "google_ad"
  | "social_caption"
  | "reel_script"
  | "video_narration";

export interface GenerateRequest {
  action: GenerateAction;
  form: AdminPropertyFormState;
}

export interface GenerateResult {
  action: GenerateAction;
  content: string;
  title: string;
}

export interface ImportAdapter {
  source: ImportSource;
  label: string;
  /** Whether this adapter is wired in the current ship. */
  implemented: boolean;
  normalize(input: unknown): Partial<PropertyImportRequest>;
}

export function emptyExtractedListingFields(): ExtractedListingFields {
  return {
    projectName: "",
    builder: "",
    developer: "",
    seller: "",
    propertyType: "",
    listingType: "buy",
    segment: "",
    configuration: "",
    plotSizes: "",
    minPlotSize: "",
    maxPlotSize: "",
    plotSizeUnit: "",
    apartmentSizes: "",
    price: "",
    priceRange: "",
    pricePerSqFt: "",
    pricePerYard: "",
    pricePerAcre: "",
    totalPrice: "",
    currency: "",
    paymentPlan: "",
    possession: "",
    launchStatus: "",
    rera: "",
    reraStatus: "",
    projectTrustScore: "",
    roadWidth: "",
    roadName: "",
    roadStatus: "",
    connectivity: "",
    connectivityAdvantage: "",
    facing: "",
    location: "",
    city: "",
    sector: "",
    locality: "",
    landmark: "",
    nearbyLandmark: "",
    areaType: "",
    nearbyAirport: "",
    airportProximity: "",
    airportDistance: "",
    metroDistance: "",
    hospitalDistance: "",
    schoolDistance: "",
    mallDistance: "",
    highwayDistance: "",
    investmentAdvantage: "",
    suitableFor: "",
    investorScore: "",
    buyerPersona: "",
    amenities: [],
    clubHouse: "",
    pool: "",
    gym: "",
    park: "",
    security: "",
    powerBackup: "",
    water: "",
    parking: "",
    lift: "",
    landscape: "",
    description: "",
    shortDescription: "",
    longDescription: "",
    investmentHighlights: "",
    buyerHighlights: "",
    keywords: "",
    phone: "",
    email: "",
    website: "",
    contactName: "",
    youtube: "",
    googleMapsUrl: "",
    lat: "",
    lng: "",
  };
}
