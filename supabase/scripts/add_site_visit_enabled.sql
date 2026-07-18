-- AreaIQ — add per-property site visit toggle
-- Paste into Supabase Dashboard → SQL Editor → Run
-- Safe to re-run.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS site_visit_enabled boolean NOT NULL DEFAULT true;

UPDATE public.properties
SET site_visit_enabled = true
WHERE site_visit_enabled IS NULL;

COMMENT ON COLUMN public.properties.site_visit_enabled IS
  'When false, buyers cannot request site visits for this property.';
