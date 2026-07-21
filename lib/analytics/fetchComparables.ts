import "server-only";

import { formatPropertyPrice } from "@/lib/properties/pricingDisplay";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { haversineKm } from "./math";
import type { ComparableListing, EngagementSignals, SubjectPropertyInput } from "./types";

const CANDIDATE_SELECT =
  "id, title, price, calculated_price, area_sqft, bedrooms, type, sub_type, location, city, sector, lat, lng, created_at, views, builder_name, rera_number, amenities, nearby_places, possession, status, deleted_at";

type PropertyRow = {
  id: string;
  title: string;
  price: number | null;
  calculated_price?: number | null;
  area_sqft: number | null;
  bedrooms: number | null;
  type: "buy" | "rent" | "commercial";
  sub_type?: string | null;
  location: string;
  city: string;
  sector?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
  views?: number | null;
  builder_name?: string | null;
  rera_number?: string | null;
  amenities?: string[] | null;
  nearby_places?: unknown;
  possession?: string | null;
};

function mapCandidate(
  row: PropertyRow,
  subject: SubjectPropertyInput | null,
): ComparableListing | null {
  const priced = formatPropertyPrice({
    price: row.price,
    calculated_price: row.calculated_price,
    area_sqft: row.area_sqft,
    sub_type: row.sub_type,
    nearby_places: row.nearby_places,
  });

  if (priced.numericPrice <= 0) return null;

  const area = priced.area ?? row.area_sqft ?? 0;
  let psf = priced.pricePerSqft;
  if ((psf == null || psf <= 0) && area > 0) {
    psf = priced.numericPrice / area;
  }
  // Reject unit-rate masquerading as totals / absurd PSF
  if (psf == null || psf <= 0 || psf > 100_000) return null;
  if (priced.numericPrice < 100_000 && (row.sub_type ?? "").toLowerCase() !== "plot") {
    // Likely unit rate stored as price for flats
    return null;
  }

  let distanceKm: number | null = null;
  if (
    subject?.lat != null &&
    subject?.lng != null &&
    row.lat != null &&
    row.lng != null
  ) {
    distanceKm = haversineKm(subject.lat, subject.lng, row.lat, row.lng);
  }

  return {
    id: row.id,
    title: row.title,
    city: row.city ?? "",
    location: row.location ?? "",
    sector: row.sector ?? null,
    subType: row.sub_type ?? null,
    listingType: row.type,
    bedrooms: row.bedrooms,
    totalPrice: priced.numericPrice,
    areaSqft: area,
    pricePerSqft: Math.round(psf),
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    builderName: row.builder_name?.trim() || null,
    reraNumber: row.rera_number?.trim() || null,
    amenitiesCount: Array.isArray(row.amenities) ? row.amenities.length : 0,
    views: row.views ?? 0,
    createdAt: row.created_at,
    distanceKm,
  };
}

export async function fetchSubjectProperty(
  propertyId: string,
): Promise<(SubjectPropertyInput & { rawNearby: unknown }) | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select(CANDIDATE_SELECT)
    .eq("id", propertyId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchSubjectProperty:", error.message);
    return null;
  }

  const row = data as PropertyRow;
  const priced = formatPropertyPrice({
    price: row.price,
    calculated_price: row.calculated_price,
    area_sqft: row.area_sqft,
    sub_type: row.sub_type,
    nearby_places: row.nearby_places,
  });

  const area = priced.area ?? row.area_sqft ?? 0;
  let psf = priced.pricePerSqft;
  if ((psf == null || psf <= 0) && area > 0 && priced.numericPrice > 0) {
    psf = priced.numericPrice / area;
  }

  return {
    id: row.id,
    title: row.title,
    city: row.city ?? "",
    location: row.location ?? "",
    sector: row.sector ?? null,
    subType: row.sub_type ?? null,
    listingType: row.type,
    bedrooms: row.bedrooms,
    totalPrice: priced.numericPrice,
    areaSqft: area,
    pricePerSqft: psf != null && psf > 0 ? Math.round(psf) : null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    builderName: row.builder_name?.trim() || null,
    reraNumber: row.rera_number?.trim() || null,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    views: row.views ?? 0,
    createdAt: row.created_at,
    possession: row.possession ?? null,
    nearbyPlaces: [],
    rawNearby: row.nearby_places,
  };
}

export async function fetchCandidateListings(
  subject: SubjectPropertyInput,
): Promise<ComparableListing[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select(CANDIDATE_SELECT)
    .eq("status", "active")
    .is("deleted_at", null)
    .eq("type", subject.listingType)
    .ilike("city", `%${subject.city}%`)
    .limit(300);

  if (error) {
    console.error("fetchCandidateListings:", error.message);
    return [];
  }

  return ((data as PropertyRow[]) ?? [])
    .map((row) => mapCandidate(row, subject))
    .filter((c): c is ComparableListing => c != null);
}

export async function fetchEngagementSignals(
  propertyId: string,
  listingViews: number,
): Promise<EngagementSignals> {
  const supabase = await createSupabaseServerClient();

  const [saves, visits, viewEvents] = await Promise.all([
    supabase
      .from("saved_properties")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId),
    supabase
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId),
    supabase
      .from("property_views")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId),
  ]);

  return {
    savedCount: saves.error ? null : saves.count ?? 0,
    visitRequestCount: visits.error ? null : visits.count ?? 0,
    viewEvents: viewEvents.error ? null : viewEvents.count ?? 0,
    listingViews,
  };
}

export async function fetchBuilderIntelligence(builderName: string | null) {
  if (!builderName?.trim()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("builder_intelligence")
    .select("*")
    .ilike("builder_name", builderName.trim())
    .maybeSingle();

  if (error || !data) {
    // Table or row may not exist — never invent
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    projectsDelivered:
      num(row.projects_delivered) ?? num(row.projectsDelivered) ?? num(row.delivered_projects),
    delayPercent: num(row.delay_percent) ?? num(row.delayPercent),
    averageDelayMonths:
      num(row.average_delay_months) ?? num(row.avg_delay_months) ?? num(row.averageDelayMonths),
    customerRating: num(row.customer_rating) ?? num(row.rating),
    reraComplaints: num(row.rera_complaints) ?? num(row.reraComplaints),
    yearsInBusiness: num(row.years_in_business) ?? num(row.yearsInBusiness),
    areaiqScore:
      num(row.areaiq_builder_score) ?? num(row.builder_score) ?? num(row.score),
  };
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}
