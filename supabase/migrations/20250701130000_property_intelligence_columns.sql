-- Optional intelligence columns for stored verified metrics (not generated randomly)

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS growth_score numeric;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rental_yield numeric;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ai_verified boolean DEFAULT false;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rera_verified boolean DEFAULT false;

COMMENT ON COLUMN public.properties.growth_score IS 'Verified growth score (0-100), set manually or by AreaIQ engine — never auto-faked';
COMMENT ON COLUMN public.properties.rental_yield IS 'Verified rental yield percentage, set manually or calculated from rent comps';
