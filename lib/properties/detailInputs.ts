import "server-only";

import { extractNearbyPlacesList } from "@/lib/properties/nearbyPlacesMeta";
import { formatPropertyPrice } from "@/lib/properties/pricingDisplay";
import type { PropertyIntelligenceInput } from "@/lib/intelligence/types";
import type { SubjectPropertyInput } from "@/lib/analytics/types";

/** Minimal property row fields needed to build intel/analytics subjects. */
export type DetailSourceRow = {
  id: string;
  title: string;
  price?: number | null;
  calculated_price?: number | null;
  area_sqft?: number | null;
  bedrooms?: number | null;
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
  contact_name?: string | null;
  nearby_places?: unknown;
  possession?: string | null;
  rera_number?: string | null;
  amenities?: string[] | null;
};

/** Reuse the already-fetched detail row — avoids a second properties.select. */
export function rowToIntelligenceInput(row: DetailSourceRow): PropertyIntelligenceInput {
  return {
    id: row.id,
    title: row.title,
    price: row.price ?? 0,
    areaSqft: row.area_sqft ?? 0,
    bedrooms: row.bedrooms ?? null,
    type: row.type,
    location: row.location ?? "",
    city: row.city ?? "",
    sector: row.sector ?? null,
    builderName: row.builder_name?.trim() || row.contact_name?.trim() || null,
    reraNumber: row.rera_number?.trim() || null,
    possession: row.possession ?? null,
    nearbyPlaces: extractNearbyPlacesList(row.nearby_places).map((item) => ({
      name: item.name,
      distance: item.distance,
      type: item.type,
    })),
    views: row.views ?? 0,
    createdAt: row.created_at,
  };
}

/** Reuse the already-fetched detail row — avoids fetchSubjectProperty. */
export function rowToAnalyticsSubject(
  row: DetailSourceRow,
): SubjectPropertyInput & { rawNearby: unknown } {
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

  const nearby = extractNearbyPlacesList(row.nearby_places);

  return {
    id: row.id,
    title: row.title,
    city: row.city ?? "",
    location: row.location ?? "",
    sector: row.sector ?? null,
    subType: row.sub_type ?? null,
    listingType: row.type,
    bedrooms: row.bedrooms ?? null,
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
    nearbyPlaces: nearby,
    rawNearby: row.nearby_places,
  };
}
