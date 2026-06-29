-- Add seller dashboard property columns missing from live Supabase.
-- Verified live columns (2025-06-29): id, seller_id, title, description, type, sub_type,
-- price, area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos,
-- amenities, status, is_featured, contact_name, contact_phone, created_at, updated_at, views
--
-- Run in Supabase SQL Editor, then update PROPERTY_SELECT in lib/seller/queries.ts
-- to include PROPERTIES_EXTENDED_SELECT from lib/seller/propertySchema.ts.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS builder_name text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS furnishing text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS parking text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS facing text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS nearby_places jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rera_number text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS possession text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS featured_image text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.properties.builder_name IS 'Builder / developer name for the listing';
COMMENT ON COLUMN public.properties.deleted_at IS 'Soft delete timestamp; null = active row';

-- Optional: restore soft-delete filtering after this migration is applied
-- CREATE INDEX IF NOT EXISTS properties_seller_active_idx
--   ON public.properties (seller_id, updated_at DESC)
--   WHERE deleted_at IS NULL;
