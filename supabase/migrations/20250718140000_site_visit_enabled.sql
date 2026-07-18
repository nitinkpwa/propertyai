-- Per-property site visit availability toggle.
-- Default TRUE so existing active listings accept bookings immediately.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS site_visit_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.properties.site_visit_enabled IS
  'When false, buyers cannot request site visits for this property.';

-- Backfill any nulls (defensive if column was added without NOT NULL elsewhere).
UPDATE public.properties
SET site_visit_enabled = true
WHERE site_visit_enabled IS NULL;
