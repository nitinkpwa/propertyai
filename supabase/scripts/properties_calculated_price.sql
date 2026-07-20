-- Manual apply: calculated_price for AreaIQ listings
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS calculated_price numeric;

COMMENT ON COLUMN public.properties.calculated_price IS
  'Auto-calculated total (price, or price_per_sqft×area, or price_per_sqyard×min_plot). Used for filters when raw price is 0.';

CREATE INDEX IF NOT EXISTS properties_calculated_price_idx
  ON public.properties (calculated_price)
  WHERE deleted_at IS NULL AND status = 'active';

UPDATE public.properties
SET calculated_price = price
WHERE calculated_price IS NULL
  AND price IS NOT NULL
  AND price > 0;
