import type { PropertyCardProps } from "@/app/components/PropertyCard";
import type {
  AISummary,
  BuilderInfo,
  FloorPlan,
  NearbyPlace,
  PropertyDetail,
} from "@/app/property/[id]/data";
import { areaIntelligenceService } from "@/lib/intelligence/AreaIntelligenceService";
import { supabase, type Property } from "@/lib/supabase";
import type {
  Amenity,
  ListingProperty,
  ListingType,
  PossessionStatus,
  PropertyType,
} from "./types";

type PropertyRow = Property & {
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
  seller?: { full_name?: string | null } | null;
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

const ACTIVE_LISTINGS_SELECT =
  "*, seller:profiles!properties_seller_id_fkey(full_name)";

const PROPERTY_PHOTOS_BUCKET = "property-photos";

function resolvePhotoUrl(photo: string): string | null {
  const value = photo?.trim();
  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("/")
  ) {
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

function buildGalleryImages(photos: string[] | null | undefined) {
  const urls = resolvePhotoUrls(photos);

  if (urls.length) {
    return urls.map((url, index) => ({
      id: String(index + 1),
      label: index === 0 ? "Main View" : `Photo ${index + 1}`,
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
  intelligenceReport: Awaited<ReturnType<typeof areaIntelligenceService.generateReport>>,
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
    row.rera_verified ? "RERA verified listing" : null,
    intelligenceReport?.rentalYield.available
      ? `Estimated rental yield ${intelligenceReport.rentalYield.displayValue}`
      : null,
    intelligenceReport?.growthScore.available
      ? `Area growth score ${intelligenceReport.growthScore.displayValue}/100`
      : null,
  ].filter(Boolean) as string[];

  return {
    summary: `${row.title} in ${row.location}, ${row.city}. Review AreaIQ Intelligence Engine below for verified metrics calculated from our database.`,
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
  const raw = row.nearby_places;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "Nearby place",
        distance: typeof item.distance === "string" ? item.distance : "—",
        type: (typeof item.type === "string" ? item.type : "mall") as NearbyPlace["type"],
      }));
  }
  return [];
}

function buildFloorPlans(row: PropertyRow): FloorPlan[] {
  const bedrooms = row.bedrooms ?? 0;
  const area = row.area_sqft ?? 0;
  const label =
    bedrooms > 0 ? `${bedrooms} BHK` : SUB_TYPE_LABELS[row.sub_type] ?? "Unit";

  return [
    {
      bhk: (bedrooms || 1) as FloorPlan["bhk"],
      area,
      price: row.price,
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

  return {
    id: row.id,
    name: row.title,
    location: row.location,
    city: row.city,
    price: row.price,
    builderName: getBuilderName(row),
    bhk: row.bedrooms ?? 0,
    area: row.area_sqft ?? 0,
    areaUnit: row.sub_type === "plot" ? "sqft" : "sqft",
    growthScore: getGrowthScore(row),
    rentalYield: getRentalYield(row),
    imageUrl: resolvePhotoUrl(row.photos?.[0] ?? "") ?? null,
    imageAlt: row.title,
    aiVerified: Boolean(row.ai_verified),
    reraVerified: Boolean(row.rera_verified),
    propertyType: mapPropertyType(row.sub_type),
    listingType: mapListingType(row.type),
    possession,
    amenities,
  };
}

export function mapPropertyRowToCardProps(row: PropertyRow): PropertyCardProps {
  const listing = mapPropertyRowToListing(row);
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
    growthScore: listing.growthScore,
    rentalYield: listing.rentalYield,
    imageUrl: listing.imageUrl,
    imageAlt: listing.imageAlt,
    aiVerified: listing.aiVerified,
    reraVerified: listing.reraVerified,
    href: `/property/${listing.id}`,
  };
}

export function mapPropertyRowToDetail(
  row: PropertyRow,
  similarProperties: PropertyCardProps[] = [],
  intelligenceReport: Awaited<ReturnType<typeof areaIntelligenceService.generateReport>> = null,
): PropertyDetail {
  const possession = mapPossession(row.possession);
  const bedrooms = row.bedrooms ?? 0;
  const area = row.area_sqft ?? 0;
  const builder = buildBuilderInfo(row);
  const amenities = buildAmenityLabels(row.amenities);

  const phone = row.contact_phone?.trim() ?? "";
  const whatsapp = phone.replace(/\D/g, "");

  return {
    id: row.id,
    name: row.title?.trim() || "Property",
    project: row.project_name?.trim() || row.title?.trim() || "Property",
    builder,
    location: row.location?.trim() || "Location not specified",
    city: row.city?.trim() || "Tricity",
    price: row.price ?? 0,
    pricePerSqFt: area > 0 ? Math.round(row.price / area) : 0,
    propertyType: SUB_TYPE_LABELS[row.sub_type] ?? "Property",
    bhk: (bedrooms || 1) as PropertyDetail["bhk"],
    area,
    status: row.status === "active" ? "Available" : row.status,
    possession: formatPossessionLabel(possession),
    configuration:
      bedrooms > 0 ? `${bedrooms} BHK` : SUB_TYPE_LABELS[row.sub_type] ?? "—",
    totalFloors: null,
    parking: amenities.some((item) => item.toLowerCase().includes("parking"))
      ? "Available"
      : "Contact for details",
    facing: row.facing?.trim() || "Contact for details",
    furnishing: row.furnishing?.trim() || "Contact for details",
    description:
      row.description?.trim() ||
      `${row.title} is listed in ${row.location}, ${row.city}. Contact the seller for full details, site visit scheduling, and documentation.`,
    aiVerified: Boolean(row.ai_verified),
    reraVerified: Boolean(row.rera_verified),
    images: buildGalleryImages(row.photos),
    amenities,
    intelligenceReport,
    aiSummary: buildAiSummary(row, intelligenceReport),
    floorPlans: buildFloorPlans(row),
    nearbyPlaces: buildNearbyPlaces(row),
    similarProperties: similarProperties ?? [],
    contactPhone: phone,
    whatsapp,
  };
}

export async function fetchListingProperties(): Promise<ListingProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(ACTIVE_LISTINGS_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch listing properties:", error.message);
    return [];
  }

  return (data as PropertyRow[] | null)?.map(mapPropertyRowToListing) ?? [];
}

export async function fetchPropertyDetailById(
  id: string,
): Promise<PropertyDetail | null> {
  const normalizedId = id?.trim();
  if (!normalizedId || !UUID_RE.test(normalizedId)) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("properties")
      .select(ACTIVE_LISTINGS_SELECT)
      .eq("id", normalizedId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("Failed to fetch property detail:", error.message);
      }
      return null;
    }

    const row = data as PropertyRow;
    const [similar, intelligenceReport] = await Promise.all([
      fetchSimilarListingProperties(row.city, row.id, 4),
      areaIntelligenceService.generateReport(row.id),
    ]);

    return mapPropertyRowToDetail(row, similar, intelligenceReport);
  } catch (error) {
    console.error("Failed to fetch property detail:", error);
    return null;
  }
}

export async function fetchSimilarListingProperties(
  city: string,
  excludeId: string,
  limit = 4,
): Promise<PropertyCardProps[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(ACTIVE_LISTINGS_SELECT)
    .eq("status", "active")
    .eq("city", city)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch similar properties:", error.message);
    return [];
  }

  return (data as PropertyRow[] | null)?.map(mapPropertyRowToCardProps) ?? [];
}

export function extractBuilderOptions(properties: ListingProperty[]): string[] {
  return [...new Set(properties.map((property) => property.builderName))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
