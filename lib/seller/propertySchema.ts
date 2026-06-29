/**
 * Verified against live Supabase `properties` table (2025-06-29).
 * Do not add columns here without confirming they exist in the database.
 */
export const PROPERTIES_BASE_SELECT =
  "id, seller_id, title, description, type, sub_type, price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos, amenities, status, is_featured, contact_name, contact_phone, created_at, updated_at, views";

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
