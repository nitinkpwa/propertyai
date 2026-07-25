import type { Property } from "@/lib/supabase";
import type { AdminPropertyRow } from "@/lib/admin/types";
import type { PropertyAIIntelligence } from "@/lib/admin/property/intelligence/types";
import type { ImportKnowledge } from "@/lib/admin/property/studio/types";
import type { PropertyStructuredMeta } from "@/lib/properties/nearbyPlacesMeta";
import { emptyPropertyStructuredMeta } from "@/lib/properties/nearbyPlacesMeta";
import { PROPERTY_STATUS_DEFAULT_CREATE } from "@/lib/properties/status";
import {
  emptyLegalVerification,
  type LegalVerificationState,
} from "./legalVerification";

export type WizardStepId =
  | "basic"
  | "location"
  | "pricing"
  | "specs"
  | "amenities"
  | "media"
  | "documents"
  | "seo"
  | "publishing"
  | "connect";

export interface AdminPropertyFormState {
  title: string;
  type: Property["type"];
  sub_type: Property["sub_type"];
  price: string;
  area_sqft: string;
  bedrooms: string;
  bathrooms: string;
  city: string;
  sector: string;
  location: string;
  lat: string;
  lng: string;
  contact_name: string;
  contact_phone: string;
  amenities: string[];
  photos: string[];
  status: Property["status"];
  is_featured: boolean;
  builder_name: string;
  furnishing: string;
  parking: string;
  facing: string;
  rera_number: string;
  possession: string;
  featured_image: string;
  connect_partner_id: string;
  /** When false, buyers cannot book site visits. Default true. */
  site_visit_enabled: boolean;
  /** Admin-only legal verification flags (never shown to buyers). */
  legal: LegalVerificationState;

  basic: PropertyStructuredMeta["basic"];
  locationMeta: PropertyStructuredMeta["location"];
  pricing: PropertyStructuredMeta["pricing"];
  specs: PropertyStructuredMeta["specs"];
  media: PropertyStructuredMeta["media"];
  documents: PropertyStructuredMeta["documents"];
  seo: PropertyStructuredMeta["seo"];
  publishing: PropertyStructuredMeta["publishing"];
  aiIntelligence: PropertyAIIntelligence | null;
  nearbyPlaces: Array<{ name: string; distance: string; type: string }>;
  /** AI Import knowledge blob (persisted in nearby_places.meta). */
  importKnowledge: ImportKnowledge | null;
  /** Per-field extraction confidence 0–100. */
  fieldConfidence: Record<string, number>;
}

export interface AdminPropertySaveResult {
  ok: boolean;
  propertyId?: string;
  error?: string;
}

export function createEmptyAdminPropertyForm(): AdminPropertyFormState {
  const meta = emptyPropertyStructuredMeta();
  return {
    title: "",
    type: "buy",
    sub_type: "flat",
    price: "",
    area_sqft: "",
    bedrooms: "",
    bathrooms: "",
    city: "Mohali",
    sector: "",
    location: "",
    lat: "",
    lng: "",
    contact_name: "",
    contact_phone: "",
    amenities: [],
    photos: [],
    status: PROPERTY_STATUS_DEFAULT_CREATE,
    is_featured: false,
    builder_name: "",
    furnishing: "",
    parking: "",
    facing: "",
    rera_number: "",
    possession: "",
    featured_image: "",
    connect_partner_id: "",
    site_visit_enabled: true,
    legal: emptyLegalVerification(),
    basic: { ...meta.basic },
    locationMeta: { ...meta.location },
    pricing: { ...meta.pricing },
    specs: { ...meta.specs },
    media: { ...meta.media, videos: [] },
    documents: { ...meta.documents, floorPlans: [] },
    seo: { ...meta.seo },
    publishing: { ...meta.publishing },
    aiIntelligence: null,
    nearbyPlaces: [],
    importKnowledge: null,
    fieldConfidence: {},
  };
}

export type AdminPropertyFormSource = AdminPropertyRow & {
  builder_name?: string | null;
  furnishing?: string | null;
  parking?: string | null;
  facing?: string | null;
  nearby_places?: unknown;
  rera_number?: string | null;
  possession?: string | null;
  featured_image?: string | null;
  lat?: number | null;
  lng?: number | null;
  growth_score?: number | null;
  rental_yield?: number | null;
  photos?: string[];
  site_visit_enabled?: boolean | null;
  approved_building_plan?: boolean | null;
  rera_certificate?: boolean | null;
  title_deed_verified?: boolean | null;
  noc_verified?: boolean | null;
  completion_certificate?: boolean | null;
  occupation_certificate?: boolean | null;
  environment_clearance?: boolean | null;
  fire_clearance?: boolean | null;
  bank_approved?: boolean | null;
  govt_layout_approved?: boolean | null;
  legal_verification_updated_at?: string | null;
  legal_verification_updated_by?: string | null;
  legal_verification_updated_by_name?: string | null;
};
