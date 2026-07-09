import { supabase } from "@/lib/supabase";
import { extractNearbyPlacesList } from "@/lib/properties/nearbyPlacesMeta";
import type { MarketContext, MarketListing, PropertyIntelligenceInput } from "../types";
import { average, matchesLocality, median, pricePerSqft } from "../utils";

/**
 * Verified live Supabase columns (2025-07-01).
 * Excludes calculated intelligence columns (growth_score, rental_yield, etc.).
 */
const PROPERTY_SELECT =
  "id, title, price, area_sqft, bedrooms, type, location, city, sector, created_at, views, contact_name, builder_name, nearby_places, possession, rera_number";

const MARKET_SELECT =
  "id, price, area_sqft, bedrooms, type, location, city, created_at, views, contact_name, builder_name, rera_number";

type PropertyRow = {
  id: string;
  title: string;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  type: "buy" | "rent" | "commercial";
  location: string;
  city: string;
  sector?: string | null;
  created_at: string;
  views?: number | null;
  builder_name?: string | null;
  contact_name?: string | null;
  nearby_places?: unknown;
  possession?: string | null;
  rera_number?: string | null;
};

function mapRow(row: PropertyRow): MarketListing {
  return {
    id: row.id,
    price: row.price ?? 0,
    areaSqft: row.area_sqft ?? 0,
    bedrooms: row.bedrooms ?? null,
    type: row.type,
    location: row.location ?? "",
    city: row.city ?? "",
    createdAt: row.created_at,
    views: row.views ?? 0,
    builderName: row.builder_name ?? row.contact_name ?? null,
    reraNumber: row.rera_number?.trim() || null,
  };
}

function parseNearbyPlaces(raw: unknown): PropertyIntelligenceInput["nearbyPlaces"] {
  return extractNearbyPlacesList(raw).map((item) => ({
    name: item.name,
    distance: item.distance,
    type: item.type,
  }));
}

export async function fetchPropertyIntelligenceInput(
  propertyId: string,
): Promise<PropertyIntelligenceInput | null> {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("id", propertyId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("fetchPropertyIntelligenceInput:", error.message);
    return null;
  }

  if (!data) return null;

  const row = data as PropertyRow;
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
    nearbyPlaces: parseNearbyPlaces(row.nearby_places),
    views: row.views ?? 0,
    createdAt: row.created_at,
  };
}

export async function fetchMarketContext(
  city: string,
  locality: string,
  excludeId?: string,
): Promise<MarketContext> {
  const { data, error } = await supabase
    .from("properties")
    .select(MARKET_SELECT)
    .eq("status", "active")
    .ilike("city", `%${city}%`)
    .limit(250);

  if (error) {
    console.error("fetchMarketContext:", error.message);
    return emptyMarketContext(city, locality);
  }

  let listings = ((data as PropertyRow[]) ?? []).map(mapRow);
  if (excludeId) {
    listings = listings.filter((l) => l.id !== excludeId);
  }

  const localityListings = listings.filter((l) => matchesLocality(l.location, locality));
  const scoped = localityListings.length >= 5 ? localityListings : listings;

  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const recent = scoped.filter(
    (l) => now - new Date(l.createdAt).getTime() <= ninetyDaysMs,
  );
  const older = scoped.filter(
    (l) => now - new Date(l.createdAt).getTime() > ninetyDaysMs,
  );

  const allPpsf = scoped
    .map((l) => pricePerSqft(l.price, l.areaSqft))
    .filter((v): v is number => v !== null);
  const recentPpsf = recent
    .map((l) => pricePerSqft(l.price, l.areaSqft))
    .filter((v): v is number => v !== null);
  const olderPpsf = older
    .map((l) => pricePerSqft(l.price, l.areaSqft))
    .filter((v): v is number => v !== null);

  return {
    city,
    locality,
    listings: scoped,
    totalListings: scoped.length,
    newListings90d: recent.length,
    buyListings: scoped.filter((l) => l.type === "buy").length,
    rentListings: scoped.filter((l) => l.type === "rent").length,
    medianPricePerSqft: median(allPpsf),
    recentMedianPricePerSqft: median(recentPpsf),
    olderMedianPricePerSqft: median(olderPpsf),
    avgViews: average(scoped.map((l) => l.views)),
  };
}

function emptyMarketContext(city: string, locality: string): MarketContext {
  return {
    city,
    locality,
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
}
