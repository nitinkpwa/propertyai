/**
 * Verified against live Supabase `properties` table.
 * Do not add columns here without confirming they exist in the database.
 *
 * `calculated_price` is optional — use PROPERTIES_CARD_SELECT_CORE when the
 * column may be absent, or go through getLiveProperties() which falls back.
 */
export const PROPERTIES_BASE_SELECT_CORE =
  "id, seller_id, title, description, type, sub_type, price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, contact_name, contact_phone, created_at, updated_at, views";

export const PROPERTIES_BASE_SELECT =
  "id, seller_id, title, description, type, sub_type, price, calculated_price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, contact_name, contact_phone, created_at, updated_at, views";

/**
 * Buyer-facing card select — base public columns MINUS seller contact fields,
 * PLUS extended listing fields present on live Supabase.
 *
 * Do NOT include growth_score / rental_yield / ai_verified / rera_verified here:
 * those columns are not on the live `properties` table and cause PostgREST
 * selects to fail with zero results (empty /properties catalog).
 *
 * Seller contact is only ever exposed through the gated site-visit contact
 * endpoint after a visit is accepted.
 */
export const PROPERTIES_CARD_SELECT_CORE =
  "id, seller_id, title, description, type, sub_type, price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, created_at, updated_at, views, builder_name, furnishing, parking, facing, nearby_places, rera_number, possession, featured_image, deleted_at";

export const PROPERTIES_CARD_SELECT =
  "id, seller_id, title, description, type, sub_type, price, calculated_price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, created_at, updated_at, views, builder_name, furnishing, parking, facing, nearby_places, rera_number, possession, featured_image, deleted_at";

/** Optional score columns — only use after confirming they exist in the DB. */
export const PROPERTIES_SCORE_SELECT =
  "growth_score, rental_yield, ai_verified, rera_verified";

/** Extended columns present on live Supabase (seller form + edit prefill). */
export const PROPERTIES_EXTENDED_SELECT =
  "builder_name, furnishing, parking, facing, nearby_places, rera_number, possession, featured_image, deleted_at, site_visit_enabled";

export const PROPERTIES_EXTENDED_COLUMN_NAMES = [
  "builder_name",
  "furnishing",
  "parking",
  "facing",
  "nearby_places",
  "rera_number",
  "possession",
  "featured_image",
  "deleted_at",
  "site_visit_enabled",
] as const;

/** Full seller dashboard select — base + extended for edit/prefill. */
export const PROPERTIES_SELLER_SELECT = `${PROPERTIES_BASE_SELECT}, ${PROPERTIES_EXTENDED_SELECT}`;
