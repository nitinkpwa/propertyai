/**
 * Structured property metadata stored inside `properties.nearby_places` jsonb
 * without schema migrations. Legacy rows use a plain array of place objects.
 */

import type { PropertyAIIntelligence } from "@/lib/admin/property/intelligence/types";

export const METADATA_KEY = "meta";
export const PLACES_KEY = "places";

export interface NearbyPlaceItem {
  name: string;
  distance: string;
  type?: string;
}

/** Facts-only structured meta (v2). Admin enters facts; AI fills `ai`. */
export interface PropertyStructuredMeta {
  v: 2;
  basic: {
    builder: string;
    seller: string;
    project: string;
    configuration: string;
    propertyStatus: string;
    purpose: string;
    ownership: string;
  };
  location: {
    country: string;
    state: string;
    pincode: string;
    locality: string;
    landmark: string;
    areaCategory: string;
    upcomingMetro: string;
    airportDistance: string;
    schoolDistance: string;
    hospitalDistance: string;
    mallDistance: string;
    itParkDistance: string;
    highwayDistance: string;
    futureInfrastructure: string;
    googleMapsUrl: string;
  };
  pricing: {
    basePrice: string;
    currentPrice: string;
    launchPrice: string;
    expectedAppreciation: string;
    rentalEstimate: string;
    pricePerSqft: string;
    maintenance: string;
    plc: string;
    gst: string;
    parking: string;
    registration: string;
    clubCharges: string;
    possessionCost: string;
    hiddenCharges: string;
    loanAvailable: string;
    banks: string;
    paymentPlan: string;
    constructionLinkedPlan: string;
    downPayment: string;
    emiEstimate: string;
  };
  specs: {
    balconies: string;
    study: string;
    servantRoom: string;
    store: string;
    floor: string;
    totalFloors: string;
    lift: string;
    powerBackup: string;
    carpetArea: string;
    builtUpArea: string;
    superArea: string;
    plotArea: string;
    ceilingHeight: string;
    constructionQuality: string;
    greenRating: string;
  };
  media: {
    videos: string[];
    tour360: string;
    droneVideo: string;
    virtualTourUrl: string;
    youtube: string;
  };
  documents: {
    brochure: string;
    floorPlans: string[];
    masterPlan: string;
    pdf: string;
  };
  seo: {
    slug: string;
    canonical: string;
  };
  publishing: {
    workflowStatus: string;
    featured: boolean;
    trending: boolean;
    premium: boolean;
    exclusive: boolean;
    editorsPick: boolean;
  };
  ai: PropertyAIIntelligence | null;
}

/** Legacy v1 shape — read-only for migration */
interface LegacyMetaV1 {
  v: 1;
  generatedInsights?: Record<string, string>;
  knowledge?: { overview?: string };
  [key: string]: unknown;
}

export function extractNearbyPlacesList(raw: unknown): NearbyPlaceItem[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "Nearby place",
        distance: typeof item.distance === "string" ? item.distance : "—",
        type: typeof item.type === "string" ? item.type : undefined,
      }));
  }
  if (raw && typeof raw === "object" && PLACES_KEY in (raw as Record<string, unknown>)) {
    return extractNearbyPlacesList((raw as Record<string, unknown>)[PLACES_KEY]);
  }
  return [];
}

export function extractPropertyMeta(raw: unknown): PropertyStructuredMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const meta = (raw as Record<string, unknown>)[METADATA_KEY];
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;

  const v = (meta as Record<string, unknown>).v;
  if (v === 2) return meta as PropertyStructuredMeta;

  if (v === 1) {
    return migrateLegacyMeta(meta as LegacyMetaV1);
  }
  return null;
}

function migrateLegacyMeta(legacy: LegacyMetaV1): PropertyStructuredMeta | null {
  try {
    const empty = emptyPropertyStructuredMeta();
    const merged = { ...empty, ...(legacy as unknown as Partial<PropertyStructuredMeta>) };
    merged.v = 2;
    if (legacy.generatedInsights && !merged.ai) {
      merged.ai = {
        pipelineVersion: "legacy",
        generatedAt: "",
        lastUpdated: "",
        confidence: 0,
        agents: {},
        compiled: legacy.generatedInsights,
      };
    }
    return merged;
  } catch {
    return null;
  }
}

export function emptyPropertyStructuredMeta(): PropertyStructuredMeta {
  return {
    v: 2,
    basic: {
      builder: "",
      seller: "",
      project: "",
      configuration: "",
      propertyStatus: "ready",
      purpose: "end-use",
      ownership: "freehold",
    },
    location: {
      country: "India",
      state: "Punjab",
      pincode: "",
      locality: "",
      landmark: "",
      areaCategory: "",
      upcomingMetro: "",
      airportDistance: "",
      schoolDistance: "",
      hospitalDistance: "",
      mallDistance: "",
      itParkDistance: "",
      highwayDistance: "",
      futureInfrastructure: "",
      googleMapsUrl: "",
    },
    pricing: {
      basePrice: "",
      currentPrice: "",
      launchPrice: "",
      expectedAppreciation: "",
      rentalEstimate: "",
      pricePerSqft: "",
      maintenance: "",
      plc: "",
      gst: "",
      parking: "",
      registration: "",
      clubCharges: "",
      possessionCost: "",
      hiddenCharges: "",
      loanAvailable: "yes",
      banks: "",
      paymentPlan: "",
      constructionLinkedPlan: "",
      downPayment: "",
      emiEstimate: "",
    },
    specs: {
      balconies: "",
      study: "",
      servantRoom: "",
      store: "",
      floor: "",
      totalFloors: "",
      lift: "",
      powerBackup: "",
      carpetArea: "",
      builtUpArea: "",
      superArea: "",
      plotArea: "",
      ceilingHeight: "",
      constructionQuality: "",
      greenRating: "",
    },
    media: {
      videos: [],
      tour360: "",
      droneVideo: "",
      virtualTourUrl: "",
      youtube: "",
    },
    documents: {
      brochure: "",
      floorPlans: [],
      masterPlan: "",
      pdf: "",
    },
    seo: { slug: "", canonical: "" },
    publishing: {
      workflowStatus: "draft",
      featured: false,
      trending: false,
      premium: false,
      exclusive: false,
      editorsPick: false,
    },
    ai: null,
  };
}

export function buildNearbyPlacesPayload(
  places: NearbyPlaceItem[],
  meta: PropertyStructuredMeta | null,
): unknown {
  if (!meta && places.length === 0) return [];
  if (!meta) return places;
  return { [PLACES_KEY]: places, [METADATA_KEY]: meta };
}

export function extractPropertyAI(raw: unknown): PropertyAIIntelligence | null {
  const meta = extractPropertyMeta(raw);
  return meta?.ai ?? null;
}
