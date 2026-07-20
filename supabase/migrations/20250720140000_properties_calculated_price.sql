-- Persist auto-calculated listing totals for search / sort / filter.
-- Source of truth for display still goes through calculateDisplayPrice().

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS calculated_price numeric;

COMMENT ON COLUMN public.properties.calculated_price IS
  'Auto-calculated total (price, or price_per_sqft×area, or price_per_sqyard×min_plot). Used for filters when raw price is 0.';

CREATE INDEX IF NOT EXISTS properties_calculated_price_idx
  ON public.properties (calculated_price)
  WHERE deleted_at IS NULL AND status = 'active';

-- Backfill from existing positive price so filters stay consistent
UPDATE public.properties
SET calculated_price = price
WHERE calculated_price IS NULL
  AND price IS NOT NULL
  AND price > 0;
