import type { PropertyDetail, AISummary } from "@/app/property/[id]/data";
import type { AdminPropertyRow } from "@/lib/admin/types";
import { runPropertyIntelligencePipeline } from "@/lib/admin/property/intelligence/pipeline";
import {
  buildAiSummaryFromSources,
  buildPropertyIntelligenceBundle,
} from "@/lib/properties/intelligenceBundle";
import {
  buildNearbyPlacesPayload,
  extractNearbyPlacesList,
  extractPropertyMeta,
  type PropertyStructuredMeta,
} from "@/lib/properties/nearbyPlacesMeta";
import { normalizePricing } from "@/lib/properties/pricingDisplay";
import type { MarketContext } from "@/lib/intelligence/types";
import {
  PROPERTY_STATUS,
  PROPERTY_STATUS_DEFAULT_CREATE,
  toPropertyStatus,
} from "@/lib/properties/status";
import {
  createEmptyAdminPropertyForm,
  type AdminPropertyFormSource,
  type AdminPropertyFormState,
} from "./types";

const EMPTY_MARKET: MarketContext = {
  city: "",
  locality: "",
  listings: [],
  totalListings: 0,
  newListings90d: 0,
  buyListings: 0,
  rentListings: 0,
  medianPricePerSqft: null,
  recentMedianPricePerSqft: null,
  olderMedianPricePerSqft: null,
  avgViews: null,
};

function numStr(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value);
}

function buildFactualMetaFromForm(
  form: AdminPropertyFormState,
  existingAi: PropertyStructuredMeta["ai"] = null,
  existingMeta?: PropertyStructuredMeta | null,
): PropertyStructuredMeta {
  return {
    v: 2,
    basic: form.basic,
    location: form.locationMeta,
    pricing: form.pricing,
    specs: form.specs,
    media: form.media,
    documents: form.documents,
    seo: form.seo,
    publishing: form.publishing,
    ai: existingAi,
    importKnowledge: form.importKnowledge ?? existingMeta?.importKnowledge ?? null,
    fieldConfidence:
      Object.keys(form.fieldConfidence || {}).length > 0
        ? form.fieldConfidence
        : existingMeta?.fieldConfidence,
  };
}

export function buildFactualDescription(form: AdminPropertyFormState): string {
  const config = form.basic.configuration || (form.bedrooms ? `${form.bedrooms} BHK` : "");
  const location = form.location || form.locationMeta.locality || form.sector || form.city;
  const segments = [form.title, config, location].filter(Boolean);
  return segments.join(" — ") || form.title || "";
}

function mergeMetaIntoForm(
  form: AdminPropertyFormState,
  meta: PropertyStructuredMeta | null,
): AdminPropertyFormState {
  if (!meta) return form;
  return {
    ...form,
    basic: { ...form.basic, ...meta.basic },
    locationMeta: { ...form.locationMeta, ...meta.location },
    pricing: { ...form.pricing, ...meta.pricing },
    specs: { ...form.specs, ...meta.specs },
    media: { ...form.media, ...meta.media },
    documents: { ...form.documents, ...meta.documents },
    seo: { ...form.seo, ...meta.seo },
    publishing: { ...form.publishing, ...meta.publishing },
    aiIntelligence: meta.ai ?? form.aiIntelligence,
    importKnowledge: meta.importKnowledge ?? form.importKnowledge,
    fieldConfidence: meta.fieldConfidence ?? form.fieldConfidence,
  };
}

export function adminRowToForm(row: AdminPropertyFormSource): AdminPropertyFormState {
  const form = createEmptyAdminPropertyForm();
  const meta = extractPropertyMeta(row.nearby_places);
  const places = extractNearbyPlacesList(row.nearby_places);

  const merged: AdminPropertyFormState = {
    ...form,
    title: row.title || "",
    type: row.type || "buy",
    sub_type: row.sub_type || "flat",
    price: numStr(row.price),
    area_sqft: numStr(row.area_sqft),
    bedrooms: numStr(row.bedrooms),
    bathrooms: numStr(row.bathrooms),
    city: row.city || "Mohali",
    sector: row.sector || "",
    location: row.location || "",
    lat: numStr(row.lat),
    lng: numStr(row.lng),
    contact_name: row.contact_name || "",
    contact_phone: row.contact_phone || "",
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    photos: Array.isArray(row.photos) ? row.photos : [],
    status: toPropertyStatus(row.status),
    is_featured: Boolean(row.is_featured),
    builder_name: row.builder_name || "",
    furnishing: row.furnishing || "",
    parking: row.parking || "",
    facing: row.facing || "",
    rera_number: row.rera_number || "",
    possession: row.possession || "",
    featured_image: row.featured_image || "",
    connect_partner_id: row.connect_partner_id || "",
    site_visit_enabled: row.site_visit_enabled !== false,
    nearbyPlaces: places.map((p) => ({
      name: p.name,
      distance: p.distance,
      type: p.type || "mall",
    })),
    basic: {
      ...form.basic,
      builder: row.builder_name || "",
      seller: row.contact_name || "",
    },
  };

  return mergeMetaIntoForm(merged, meta);
}

export function formToDbPayload(
  form: AdminPropertyFormState,
  sellerId: string,
  options?: { preserveStatus?: boolean; existingNearbyPlaces?: unknown },
): Record<string, unknown> {
  const existingMeta = extractPropertyMeta(options?.existingNearbyPlaces ?? null);
  const meta = buildFactualMetaFromForm(
    form,
    form.aiIntelligence ?? existingMeta?.ai ?? null,
    existingMeta,
  );
  const places = form.nearbyPlaces.length ? form.nearbyPlaces : buildPlacesFromLocation(form);

  const price =
    parseFloat(form.price) ||
    parseFloat(form.pricing.totalPrice) ||
    parseFloat(form.pricing.currentPrice) ||
    0;
  const workflowStatus = form.publishing.workflowStatus;
  const dbStatus = toPropertyStatus(
    options?.preserveStatus && form.status
      ? form.status
      : workflowStatus === "active" || workflowStatus === "approved"
        ? PROPERTY_STATUS.ACTIVE
        : workflowStatus === "archived"
          ? PROPERTY_STATUS.PAUSED
          : PROPERTY_STATUS_DEFAULT_CREATE,
  );

  // Never persist concatenated plot ranges as area_sqft
  const carpet = parseFloat(form.specs.carpetArea) || parseFloat(form.area_sqft) || null;
  const areaSqft =
    form.sub_type === "plot"
      ? null
      : carpet && carpet < 50_000
        ? carpet
        : parseFloat(form.area_sqft) || null;

  return {
    title: form.title,
    type: form.type,
    sub_type: form.sub_type,
    price,
    area_sqft: areaSqft,
    bedrooms: parseInt(form.bedrooms, 10) || null,
    bathrooms: parseInt(form.bathrooms, 10) || null,
    city: form.city,
    sector: form.sector,
    location: form.location,
    lat: parseFloat(form.lat) || null,
    lng: parseFloat(form.lng) || null,
    description: buildFactualDescription(form),
    contact_name: form.contact_name || form.basic.seller,
    contact_phone: form.contact_phone,
    amenities: form.amenities,
    photos: form.photos,
    status: dbStatus,
    is_featured: form.publishing.featured || form.is_featured,
    builder_name: form.builder_name || form.basic.builder,
    furnishing: form.furnishing,
    parking: form.parking || form.pricing.parking,
    facing: form.facing,
    rera_number: form.rera_number,
    possession: form.possession || form.basic.propertyStatus,
    featured_image: form.featured_image || form.photos[0] || null,
    nearby_places: buildNearbyPlacesPayload(places, meta),
    site_visit_enabled: form.site_visit_enabled !== false,
    seller_id: sellerId,
    updated_at: new Date().toISOString(),
  };
}

/** Post-publish workflow: writes AI intelligence into nearby_places meta only. */
export function formToIntelligencePayload(
  form: AdminPropertyFormState,
  existingNearbyPlaces?: unknown,
): Record<string, unknown> {
  const aiIntelligence = runPropertyIntelligencePipeline(form);
  const places = form.nearbyPlaces.length ? form.nearbyPlaces : buildPlacesFromLocation(form);
  const existingMeta = extractPropertyMeta(existingNearbyPlaces ?? null);
  const meta = buildFactualMetaFromForm(form, aiIntelligence, existingMeta);
  const compiled = aiIntelligence.compiled;

  return {
    description: compiled.propertySummary || buildFactualDescription(form),
    nearby_places: buildNearbyPlacesPayload(places, meta),
    updated_at: new Date().toISOString(),
  };
}

function buildPlacesFromLocation(form: AdminPropertyFormState) {
  const items: Array<{ name: string; distance: string; type: string }> = [];
  const push = (label: string, value: string, type: string) => {
    if (value.trim()) items.push({ name: label, distance: value.trim(), type });
  };
  push("Airport", form.locationMeta.airportDistance, "airport");
  push("School", form.locationMeta.schoolDistance, "school");
  push("Hospital", form.locationMeta.hospitalDistance, "hospital");
  push("Mall", form.locationMeta.mallDistance, "mall");
  push("Metro", form.locationMeta.upcomingMetro, "metro");
  push("IT Park", form.locationMeta.itParkDistance, "it");
  return items;
}

function getCompiled(form: AdminPropertyFormState): Record<string, string> {
  if (form.aiIntelligence?.compiled && Object.keys(form.aiIntelligence.compiled).length > 0) {
    return form.aiIntelligence.compiled;
  }
  return runPropertyIntelligencePipeline(form).compiled;
}

export function formToPropertyDetail(form: AdminPropertyFormState, id = "preview"): PropertyDetail {
  const bedrooms = parseInt(form.bedrooms, 10) || 0;
  const compiled = getCompiled(form);
  const metaPreview = buildFactualMetaFromForm(form, form.aiIntelligence);
  const pricingDisplay = normalizePricing({
    dbPrice: parseFloat(form.price) || parseFloat(form.pricing.totalPrice) || parseFloat(form.pricing.currentPrice) || 0,
    dbAreaSqft: parseFloat(form.area_sqft) || parseFloat(form.specs.carpetArea) || null,
    subType: form.sub_type,
    propertyTypeLabel: form.basic.configuration || form.sub_type,
    meta: metaPreview,
  });
  const price = pricingDisplay.totalPrice ?? 0;
  const area =
    form.sub_type === "plot"
      ? pricingDisplay.minPlotSize ?? 0
      : parseFloat(form.area_sqft) || parseFloat(form.specs.carpetArea) || 0;

  const fallbackSummary: AISummary = {
    summary: compiled.buyerSummary || compiled.propertySummary || form.title,
    pros: (compiled.pros || "")
      .split("\n")
      .map((s) => s.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean),
    cons: (compiled.cons || "")
      .split("\n")
      .map((s) => s.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean),
    investmentScore: parseFloat(compiled.investmentScore) || null,
    riskLevel:
      parseFloat(compiled.riskAnalysis ? "50" : "35") >= 70
        ? "High"
        : parseFloat(compiled.investmentScore || "50") < 55
          ? "Moderate"
          : "Low",
  };

  const gradients = [
    "from-emerald-600/80 via-emerald-500/60 to-teal-400/50",
    "from-neutral-700/80 via-neutral-600/60 to-neutral-400/50",
    "from-stone-600/80 via-stone-500/60 to-amber-400/40",
  ];

  const images =
    form.photos.length > 0
      ? form.photos.map((url, i) => ({
          id: `img-${i}`,
          label: form.title || "Property",
          gradient: gradients[i % gradients.length],
          url,
        }))
      : [
          {
            id: "placeholder",
            label: form.title || "Property",
            gradient: gradients[0],
            url: form.featured_image || null,
          },
        ];

  const location = form.location || form.locationMeta.locality || form.sector;
  const city = form.city;
  const pricePerSqFt = pricingDisplay.pricePerSqft ?? 0;
  const nearbyPlaces = (form.nearbyPlaces.length ? form.nearbyPlaces : buildPlacesFromLocation(form)).map(
    (p) => ({
      name: p.name,
      distance: p.distance,
      type: (p.type as "airport" | "school" | "hospital" | "mall" | "metro" | "it") || "mall",
    }),
  );
  const meta = metaPreview;
  const builderName = form.builder_name || form.basic.builder || "Builder";
  const intelligenceBundle = buildPropertyIntelligenceBundle({
    id,
    name: form.title || "Untitled Property",
    price,
    pricePerSqFt,
    area,
    status: form.basic.propertyStatus || form.publishing.workflowStatus,
    possession: form.possession || "—",
    city,
    location,
    builderName,
    amenities: form.amenities,
    reraVerified: Boolean(form.rera_number),
    aiVerified: (form.aiIntelligence?.confidence ?? 0) >= 70,
    report: null,
    meta,
    market: { ...EMPTY_MARKET, city, locality: location },
    similarProperties: [],
    nearbyPlaces,
  });
  const aiSummary = buildAiSummaryFromSources(fallbackSummary, meta, intelligenceBundle);

  return {
    id,
    name: form.title || "Untitled Property",
    project: form.basic.project || form.title,
    builder: {
      name: builderName,
      logoInitials: builderName.slice(0, 2).toUpperCase(),
      yearsExperience: null,
      projectsDelivered: intelligenceBundle.builder.projectsDelivered,
    },
    location,
    city,
    price,
    pricePerSqFt,
    pricingDisplay,
    propertyType: form.sub_type.replace("_", " "),
    bhk: (bedrooms || 1) as PropertyDetail["bhk"],
    area,
    sizeLabel: pricingDisplay.sizeLabel || "",
    status: form.basic.propertyStatus || form.publishing.workflowStatus,
    possession: form.possession || "—",
    configuration:
      pricingDisplay.sizeLabel ||
      form.basic.configuration ||
      (bedrooms ? `${bedrooms} BHK` : "—"),
    totalFloors: parseInt(form.specs.totalFloors, 10) || null,
    parking: form.parking || form.pricing.parking || "—",
    facing: form.facing || "—",
    furnishing: form.furnishing || "—",
    description: compiled.propertySummary || form.title,
    aiVerified: (form.aiIntelligence?.confidence ?? 0) >= 70,
    reraVerified: Boolean(form.rera_number),
    images,
    amenities: form.amenities,
    intelligenceBundle,
    structuredMeta: meta,
    aiSummary,
    floorPlans: [
      {
        bhk: (bedrooms || 1) as PropertyDetail["bhk"],
        area,
        price,
        label: form.basic.configuration || `${bedrooms || 1} BHK`,
      },
    ],
    nearbyPlaces,
    similarProperties: [],
    contactPhone: form.contact_phone,
    whatsapp: form.contact_phone,
  };
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function syncLegacyFormFields(form: AdminPropertyFormState): AdminPropertyFormState {
  const defaults = createEmptyAdminPropertyForm();
  const next: AdminPropertyFormState = {
    ...defaults,
    ...form,
    basic: { ...defaults.basic, ...form.basic },
    locationMeta: { ...defaults.locationMeta, ...form.locationMeta },
    pricing: { ...defaults.pricing, ...form.pricing },
    specs: { ...defaults.specs, ...form.specs },
    media: { ...defaults.media, ...form.media, videos: form.media?.videos ?? defaults.media.videos },
    documents: {
      ...defaults.documents,
      ...form.documents,
      floorPlans: form.documents?.floorPlans ?? defaults.documents.floorPlans,
    },
    seo: { ...defaults.seo, ...form.seo },
    publishing: { ...defaults.publishing, ...form.publishing },
    amenities: Array.isArray(form.amenities) ? form.amenities : defaults.amenities,
    photos: Array.isArray(form.photos) ? form.photos : defaults.photos,
    nearbyPlaces: Array.isArray(form.nearbyPlaces) ? form.nearbyPlaces : defaults.nearbyPlaces,
  };
  if (!next.seo.slug && next.title) next.seo.slug = slugifyTitle(next.title);
  if (!next.pricing.currentPrice && next.price) next.pricing.currentPrice = next.price;
  if (!next.price && next.pricing.currentPrice) next.price = next.pricing.currentPrice;
  if (!next.basic.builder && next.builder_name) next.basic.builder = next.builder_name;
  if (!next.builder_name && next.basic.builder) next.builder_name = next.basic.builder;
  return next;
}

export function loadLegacyAdminForm(row: AdminPropertyRow): AdminPropertyFormState {
  return adminRowToForm(row as AdminPropertyFormSource);
}
