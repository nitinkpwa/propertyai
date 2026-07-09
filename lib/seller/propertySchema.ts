/**
 * Verified against live Supabase `properties` table (2025-06-29).
 * Do not add columns here without confirming they exist in the database.
 */
export const PROPERTIES_BASE_SELECT =
  "id, seller_id, title, description, type, sub_type, price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, contact_name, contact_phone, created_at, updated_at, views";

/**
 * Buyer-facing card select — same as the base columns MINUS the seller's
 * private contact fields (`contact_name`, `contact_phone`), plus the safe
 * intelligence columns used to render score badges. Use this for any query
 * whose results are sent to a buyer/anonymous client (saved, compared, recently
 * viewed, recommendations). Seller contact is only ever exposed through the
 * gated site-visit contact endpoint after a visit is accepted.
 */
export const PROPERTIES_CARD_SELECT =
  "id, seller_id, title, description, type, sub_type, price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, created_at, updated_at, views, growth_score, rental_yield, ai_verified, rera_verified";

/** Present in repo migrations but not yet applied to live Supabase. */
export const PROPERTIES_EXTENDED_SELECT =
  "builder_name, furnishing, parking, facing, nearby_places, rera_number, possession, featured_image, deleted_at";

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
] as const;
