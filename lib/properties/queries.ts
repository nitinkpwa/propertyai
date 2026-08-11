import { extractNearbyPlacesList, extractPropertyMeta } from "@/lib/properties/nearbyPlacesMeta";
import type { PropertyCardProps } from "@/app/components/PropertyCard";
import type {
  AISummary,
  BuilderInfo,
  FloorPlan,
  NearbyPlace,
  PropertyDetail,
} from "@/app/property/[id]/data";
import type { AreaIntelligenceReport, MarketContext } from "@/lib/intelligence/types";
import {
  buildAiSummaryFromSources,
  buildPropertyIntelligenceBundle,
} from "@/lib/properties/intelligenceBundle";
import { formatPropertyTitle } from "@/lib/properties/formatPropertyTitle";
import { formatPropertyPrice } from "@/lib/properties/pricingDisplay";
import {
  calculateLegalCompliance,
  calculateLegalComplianceFromProperty,
  resolveLegalFlagsFromProperty,
} from "@/lib/properties/legalCompliance";
import { isReraApproved } from "@/lib/properties/reraStatus";
import { supabase, type Property } from "@/lib/supabase";
import { getLiveProperties } from "./getLiveProperties";
import type {
  Amenity,
  ListingProperty,
  ListingType,
  PossessionStatus,
  PropertyType,
} from "./types";

type PropertyRow = Omit<Property, "contact_name" | "contact_phone"> & {
  contact_name?: string | null;
  contact_phone?: string | null;
  calculated_price?: number | null;
  growth_score?: number | null;
  rental_yield?: number | null;
  ai_verified?: boolean | null;
  rera_verified?: boolean | null;
  builder_name?: string | null;
  possession?: string | null;
  project_name?: string | null;
  nearby_places?: unknown;
  facing?: string | null;
  furnishing?: string | null;
  parking?: string | null;
  rera_number?: string | null;
  featured_image?: string | null;
  deleted_at?: string | null;
  seller?: { full_name?: string | null } | null;
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
  views?: number | null;
};

const GALLERY_GRADIENTS = [
  "from-emerald-600/80 via-emerald-500/60 to-teal-400/50",
  "from-neutral-700/80 via-neutral-600/60 to-neutral-400/50",
  "from-stone-600/80 via-stone-500/60 to-amber-400/40",
  "from-slate-700/80 via-slate-600/60 to-sky-400/40",
  "from-teal-700/80 via-emerald-600/60 to-green-400/40",
  "from-zinc-700/80 via-zinc-600/60 to-emerald-400/40",
];

const AMENITY_ALIASES: Record<string, Amenity> = {
  "club-house": "club-house",
  "club house": "club-house",
  clubhouse: "club-house",
  gym: "gym",
  "swimming-pool": "swimming-pool",
  "swimming pool": "swimming-pool",
  pool: "swimming-pool",
  parking: "parking",
  "power-backup": "power-backup",
  "power backup": "power-backup",
  lift: "lift",
  garden: "garden",
  security: "security",
};

const SUB_TYPE_TO_PROPERTY_TYPE: Record<string, PropertyType> = {
  flat: "apartment",
  plot: "plot",
  house: "villa",
  builder_floor: "builder-floor",
  sco: "shop",
  office: "office",
  warehouse: "commercial",
  coworking: "commercial",
};

const SUB_TYPE_LABELS: Record<string, string> = {
  flat: "Residential Apartment",
  plot: "Plot",
  house: "Independent House / Villa",
  builder_floor: "Builder Floor",
  sco: "Shop / SCO",
  office: "Office Space",
  warehouse: "Warehouse",
  coworking: "Co-working Space",
};

const PROPERTY_PHOTOS_BUCKET = "property-photos";

function isAllowedNextImageHost(url: string): boolean {
  try {
    if (url.startsWith("/") || url.startsWith("blob:")) return true;
    const host = new URL(url).hostname;
    const supabaseHost = (() => {
      try {
        const env = process.env.NEXT_PUBLIC_SUPABASE_URL;
        return env ? new URL(env).hostname : "hydrtiwdtptwoxoywavd.supabase.co";
      } catch {
        return "hydrtiwdtptwoxoywavd.supabase.co";
      }
    })();
    return host === supabaseHost;
  } catch {
    return false;
  }
}

function resolvePhotoUrl(photo: string): string | null {
  const value = photo?.trim();
  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("/")
  ) {
    // Only return remote URLs Next/Image can optimize; unknown hosts crash PropertyCard.
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return isAllowedNextImageHost(value) ? value : null;
    }
    return value;
  }

  const { data } = supabase.storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .getPublicUrl(value);

  return data.publicUrl;
}

function resolvePhotoUrls(photos: string[] | null | undefined): string[] {
  if (!photos?.length) return [];

  return photos
    .map(resolvePhotoUrl)
    .filter((url): url is string => Boolean(url));
}

function getGrowthScore(row: PropertyRow): number | null {
  if (typeof row.growth_score === "number") return row.growth_score;
  return null;
}

function getRentalYield(row: PropertyRow): number | null {
  if (typeof row.rental_yield === "number") return row.rental_yield;
  return null;
}

function normalizeAmenity(value: string): Amenity | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, "-");
  return AMENITY_ALIASES[key] ?? AMENITY_ALIASES[value.trim().toLowerCase()] ?? null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatAmenityLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildAmenityLabels(values: string[] | null | undefined): string[] {
  if (!values?.length) return [];

  const labels = values
    .map(formatAmenityLabel)
    .filter((label): label is string => label !== null);

  if (labels.length > 0) return labels;

  return normalizeAmenities(values).map((value) =>
    value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  );
}

function normalizeAmenities(values: string[] | null | undefined): Amenity[] {
  if (!values?.length) return [];
  const seen = new Set<Amenity>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const amenity = normalizeAmenity(value);
    if (amenity) seen.add(amenity);
  }
  return [...seen];
}

function mapListingType(type: Property["type"]): ListingType {
  return type === "rent" ? "rent" : "buy";
}

function mapPropertyType(subType: string): PropertyType {
  return SUB_TYPE_TO_PROPERTY_TYPE[subType] ?? "apartment";
}

function mapPossession(value: string | null | undefined): PossessionStatus {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
  if (
    normalized === "under-construction" ||
    normalized === "under_construction"
  ) {
    return "under-construction";
  }
  if (normalized === "new-launch" || normalized === "new_launch") {
    return "new-launch";
  }
  return "ready";
}

function getBuilderName(row: PropertyRow): string {
  return (
    row.builder_name?.trim() ||
    row.contact_name?.trim() ||
    row.seller?.full_name?.trim() ||
    "Independent Seller"
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPossessionLabel(possession: PossessionStatus): string {
  if (possession === "under-construction") return "Under Construction";
  if (possession === "new-launch") return "New Launch";
  return "Ready to Move";
}

function buildGalleryImages(
  photos: string[] | null | undefined,
  featuredImage?: string | null,
) {
  const ordered = (() => {
    const list = [...(photos ?? [])].filter(Boolean);
    const cover = featuredImage?.trim();
    if (cover && list.includes(cover)) {
      return [cover, ...list.filter((p) => p !== cover)];
    }
    return list;
  })();
  const urls = resolvePhotoUrls(ordered);

  if (urls.length) {
    return urls.map((url, index) => ({
      id: String(index + 1),
      label: index === 0 ? "Cover Photo" : `Photo ${index + 1}`,
      gradient: GALLERY_GRADIENTS[index % GALLERY_GRADIENTS.length],
      url,
    }));
  }

  return GALLERY_GRADIENTS.slice(0, 4).map((gradient, index) => ({
    id: String(index + 1),
    label: index === 0 ? "Exterior View" : `View ${index + 1}`,
    gradient,
    url: null,
  }));
}

function buildAiSummary(
  row: PropertyRow,
  intelligenceReport: AreaIntelligenceReport | null,
): AISummary {
  const investmentScore =
    intelligenceReport?.investmentScore.available &&
    typeof intelligenceReport.investmentScore.value === "number"
      ? intelligenceReport.investmentScore.value
      : null;

  let riskLevel: AISummary["riskLevel"] = null;
  if (investmentScore !== null) {
    if (investmentScore >= 75) riskLevel = "Low";
    else if (investmentScore >= 55) riskLevel = "Moderate";
    else riskLevel = "High";
  }

  const pros = [
    `Located in ${row.city} — ${row.location}`,
    isReraApproved(row) ? "RERA verified listing" : null,
    intelligenceReport?.rentalYield.available
      ? `Estimated rental yield ${intelligenceReport.rentalYield.displayValue}`
      : null,
    intelligenceReport?.growthScore.available
      ? `Area growth score ${intelligenceReport.growthScore.displayValue}/100`
      : null,
  ].filter(Boolean) as string[];

  return {
    summary: `${formatPropertyTitle(row.title) || row.title} in ${row.location}, ${row.city}. Review AreaIQ Intelligence Engine below for verified metrics calculated from our database.`,
    pros: pros.length > 0 ? pros : ["Active listing on AreaIQ with verified seller contact"],
    cons: [
      "Verify possession timeline and documentation before booking",
      "Compare with nearby listings for price benchmarking",
    ],
    investmentScore,
    riskLevel,
  };
}

function buildNearbyPlaces(row: PropertyRow): NearbyPlace[] {
  return extractNearbyPlacesList(row.nearby_places).map((item) => ({
    name: item.name,
    distance: item.distance,
    type: (item.type ?? "mall") as NearbyPlace["type"],
  }));
}

function buildFloorPlans(row: PropertyRow): FloorPlan[] {
  const bedrooms = row.bedrooms ?? 0;
  const priced = formatPropertyPrice({
    price: row.price,
    calculated_price: row.calculated_price,
    area_sqft: row.area_sqft,
    sub_type: row.sub_type,
    nearby_places: row.nearby_places,
  });
  const area = priced.area ?? row.area_sqft ?? 0;
  const label =
    bedrooms > 0 ? `${bedrooms} BHK` : SUB_TYPE_LABELS[row.sub_type] ?? "Unit";

  return [
    {
      bhk: (bedrooms || 1) as FloorPlan["bhk"],
      area,
      price: priced.numericPrice,
      label,
    },
  ];
}

function buildBuilderInfo(row: PropertyRow): BuilderInfo {
  const name = getBuilderName(row);
  return {
    name,
    logoInitials: getInitials(name) || "IQ",
    yearsExperience: null,
    projectsDelivered: null,
  };
}

export function mapPropertyRowToListing(row: PropertyRow): ListingProperty {
  const amenities = normalizeAmenities(row.amenities);
  const possession = mapPossession(row.possession);
  const priced = formatPropertyPrice({
    price: row.price,
    calculated_price: row.calculated_price,
    area_sqft: row.area_sqft,
    sub_type: row.sub_type,
    nearby_places: row.nearby_places,
  });
  const legalFlags = resolveLegalFlagsFromProperty(row);
  const legalCompliance = calculateLegalComplianceFromProperty(row);

  const displayTitle = formatPropertyTitle(row.title) || "Property";

  return {
    id: row.id,
    name: displayTitle,
    location: row.location,
    city: row.city,
    price: priced.numericPrice,
    priceLabel: priced.displayPrice,
    rateLabel: priced.isPlot ? priced.unitPrice : null,
    sizeLabel: priced.sizeLabel,
    builderName: getBuilderName(row),
    bhk: row.bedrooms ?? 0,
    area:
      priced.isPlot && priced.minPlotSize
        ? priced.minPlotSize
        : priced.area ?? row.area_sqft ?? 0,
    areaUnit: priced.isPlot && priced.normalized.plotSizeUnit === "Sq Yard" ? "sqyd" : "sqft",
    growthScore: getGrowthScore(row),
    rentalYield: getRentalYield(row),
    imageUrl:
      resolvePhotoUrl(row.featured_image || row.photos?.[0] || "") ?? null,
    imageAlt: displayTitle,
    aiVerified: Boolean(row.ai_verified),
    reraVerified: isReraApproved(row),
    legalFlags,
    legalCompliance,
    lat:
      typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null,
    lng:
      typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null,
    propertyType: mapPropertyType(row.sub_type),
    listingType: mapListingType(row.type),
    possession,
    amenities,
  };
}

export function mapPropertyRowToCardProps(row: PropertyRow): PropertyCardProps {
  try {
    if (!row || typeof row !== "object" || !row.id) {
      throw new Error("Invalid property row");
    }
    const listing = mapPropertyRowToListing(row);
    return {
      id: listing.id,
      name: listing.name || "Property",
      location: listing.location || "",
      city: listing.city,
      price: typeof listing.price === "number" ? listing.price : 0,
      priceLabel: listing.priceLabel,
      rateLabel: listing.rateLabel,
      sizeLabel: listing.sizeLabel,
      builderName: listing.builderName || "Builder",
      bhk: listing.bhk,
      area: typeof listing.area === "number" && Number.isFinite(listing.area) ? listing.area : 0,
      areaUnit: listing.areaUnit,
      growthScore: listing.growthScore,
      rentalYield: listing.rentalYield,
      imageUrl: listing.imageUrl,
      imageAlt: listing.imageAlt,
      aiVerified: listing.aiVerified,
      reraVerified: listing.reraVerified,
      legalFlags: listing.legalFlags,
      legalCompliance: listing.legalCompliance,
      lat: listing.lat,
      lng: listing.lng,
      href: `/property/${listing.id}`,
    };
  } catch (err) {
    console.error("mapPropertyRowToCardProps:", err, { id: (row as { id?: string })?.id });
    const id = (row as { id?: string })?.id ?? "unknown";
    const legalFlags = resolveLegalFlagsFromProperty(row as PropertyRow);
    const legalCompliance = calculateLegalCompliance(legalFlags);
    return {
      id,
      name: formatPropertyTitle((row as { title?: string })?.title) || "Property",
      location: (row as { location?: string })?.location || "",
      city: (row as { city?: string })?.city,
      price: 0,
      priceLabel: "Price on Request",
      rateLabel: null,
      sizeLabel: null,
      builderName: "Builder",
      bhk: 0,
      area: 0,
      areaUnit: "sqft",
      growthScore: null,
      rentalYield: null,
      imageUrl: null,
      imageAlt: "Property",
      aiVerified: false,
      reraVerified: false,
      legalFlags,
      legalCompliance,
      href: `/property/${id}`,
    };
  }
}

export function mapPropertyRowToDetail(
  row: PropertyRow,
  similarProperties: PropertyCardProps[] = [],
  intelligenceReport: AreaIntelligenceReport | null = null,
  marketContext?: MarketContext | null,
  analytics?: import("@/lib/analytics").PropertyAnalyticsReport | null,
): PropertyDetail {
  const possession = mapPossession(row.possession);
  const bedrooms = row.bedrooms ?? 0;
  const builder = buildBuilderInfo(row);
  const amenities = buildAmenityLabels(row.amenities);
  const nearbyPlaces = buildNearbyPlaces(row);
  const structuredMeta = extractPropertyMeta(row.nearby_places);
  const statusLabel = row.status === "active" ? "Available" : row.status;
  const city = row.city?.trim() || "Tricity";
  const location = row.location?.trim() || "Location not specified";

  const priced = formatPropertyPrice({
    price: row.price,
    calculated_price: row.calculated_price,
    area_sqft: row.area_sqft,
    sub_type: row.sub_type,
    propertyTypeLabel: SUB_TYPE_LABELS[row.sub_type] ?? row.sub_type,
    meta: structuredMeta,
    nearby_places: row.nearby_places,
  });
  const pricingDisplay = priced.normalized;

  const price = priced.numericPrice;
  const pricePerSqFt = priced.pricePerSqft ?? 0;
  const area =
    priced.isPlot && priced.minPlotSize
      ? priced.minPlotSize
      : row.area_sqft && row.area_sqft < 50_000
        ? row.area_sqft
        : priced.minPlotSize ?? 0;

  const phone = row.contact_phone?.trim() ?? "";
  const whatsapp = phone.replace(/\D/g, "");

  const market: MarketContext =
    marketContext ??
    ({
      city,
      locality: location,
      listings: [],
      totalListings: 0,
      newListings90d: 0,
      buyListings: 0,
      rentListings: 0,
      medianPricePerSqft: null,
      recentMedianPricePerSqft: null,
      olderMedianPricePerSqft: null,
      avgViews: null,
    } satisfies MarketContext);

  const legalFlags = resolveLegalFlagsFromProperty(row);
  const legalCompliance = calculateLegalComplianceFromProperty(row);

  const displayTitle = formatPropertyTitle(row.title) || "Property";
  const displayProject =
    formatPropertyTitle(row.project_name) || displayTitle;

  const intelligenceBundle = buildPropertyIntelligenceBundle({
    id: row.id,
    name: displayTitle,
    price,
    pricePerSqFt,
    area,
    status: statusLabel,
    possession: formatPossessionLabel(possession),
    city,
    location,
    builderName: builder.name,
    amenities,
    reraVerified: isReraApproved(row),
    aiVerified: Boolean(row.ai_verified),
    report: intelligenceReport,
    meta: structuredMeta,
    market,
    similarProperties: similarProperties ?? [],
    nearbyPlaces,
    analytics: analytics ?? null,
    legalFlags,
    reraNumber: row.rera_number ?? null,
    legalVerificationAttempted: Boolean(row.legal_verification_updated_at),
    views: typeof row.views === "number" ? row.views : null,
    bedrooms: bedrooms > 0 ? bedrooms : null,
    imageCount: Array.isArray(row.photos) ? row.photos.length : 0,
  });

  const fallbackSummary = buildAiSummary(row, intelligenceReport);
  const aiSummary = buildAiSummaryFromSources(
    fallbackSummary,
    structuredMeta,
    intelligenceBundle,
  );

  const compiledDescription =
    structuredMeta?.ai?.compiled?.propertySummary?.trim() ||
    row.description?.trim() ||
    `${displayTitle} is listed in ${row.location}, ${row.city}. Contact the seller for full details, site visit scheduling, and documentation.`;

  return {
    id: row.id,
    name: displayTitle,
    project: displayProject,
    builder: {
      ...builder,
      projectsDelivered: intelligenceBundle.builder.projectsDelivered,
    },
    location,
    city,
    price,
    pricePerSqFt,
    pricingDisplay,
    propertyType: SUB_TYPE_LABELS[row.sub_type] ?? "Property",
    bhk: (bedrooms || 1) as PropertyDetail["bhk"],
    area,
    sizeLabel: priced.sizeLabel || pricingDisplay.sizeLabel || "",
    status: statusLabel,
    possession: formatPossessionLabel(possession),
    configuration:
      pricingDisplay.sizeLabel ||
      (bedrooms > 0 ? `${bedrooms} BHK` : SUB_TYPE_LABELS[row.sub_type] ?? "—"),
    totalFloors: (() => {
      const floors = structuredMeta?.specs.totalFloors?.trim();
      if (!floors) return null;
      const n = parseInt(floors, 10);
      return Number.isFinite(n) ? n : null;
    })(),
    parking: amenities.some((item) => item.toLowerCase().includes("parking"))
      ? "Available"
      : "Contact for details",
    facing: row.facing?.trim() || "Contact for details",
    furnishing: row.furnishing?.trim() || "Contact for details",
    description: compiledDescription,
    aiVerified: Boolean(row.ai_verified),
    reraVerified: isReraApproved(row),
    legalFlags,
    legalCompliance,
    images: buildGalleryImages(row.photos, row.featured_image),
    amenities,
    intelligenceReport,
    intelligenceBundle,
    structuredMeta,
    aiSummary,
    floorPlans: buildFloorPlans(row),
    nearbyPlaces,
    similarProperties: similarProperties ?? [],
    contactPhone: phone,
    whatsapp,
  };
}

/** Public catalog — shared with Home, Ask, recommendations via getLiveProperties(). */
export async function fetchListingProperties(): Promise<ListingProperty[]> {
  const rows = await getLiveProperties({ includeSeller: true });
  return rows.map((row) => mapPropertyRowToListing(row as PropertyRow));
}

export async function fetchSimilarListingProperties(
  city: string,
  excludeId: string,
  limit = 4,
  client?: { from: typeof supabase.from },
): Promise<PropertyCardProps[]> {
  const { resolvePlace, scoreLocationMatch, isLocationRelevant } =
    await import("@/lib/location");
  const place = resolvePlace(city);
  const cities = place?.cityValues?.length
    ? place.cityValues
    : city
      ? [city]
      : undefined;

  let rows = await getLiveProperties({
    client,
    includeSeller: true,
    cities,
    city: cities ? undefined : city,
    excludeId,
    limit: Math.max(limit * 6, 24),
  });

  if (place) {
    const scored = rows
      .map((row) => {
        const r = row as PropertyRow;
        const loc = scoreLocationMatch(
          {
            id: r.id,
            title: r.title,
            location: r.location,
            sector: r.sector,
            city: r.city,
            builder_name: r.builder_name,
            nearby_places: r.nearby_places,
            lat: r.lat,
            lng: r.lng,
          },
          place,
        );
        return { row, loc };
      })
      .filter((x) => isLocationRelevant(x.loc, { minScore: 50, maxDistanceKm: 30 }))
      .sort((a, b) => b.loc.matchScore - a.loc.matchScore)
      .map((x) => x.row);
    if (scored.length) rows = scored;
  }

  return rows.slice(0, limit).map((row) => mapPropertyRowToCardProps(row as PropertyRow));
}

export function extractBuilderOptions(properties: ListingProperty[]): string[] {
  return [...new Set(properties.map((property) => property.builderName))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
