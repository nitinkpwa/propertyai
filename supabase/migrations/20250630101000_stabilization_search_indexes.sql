-- AreaIQ stabilization (2025-06-30)
-- DO NOT RUN automatically — apply manually in Supabase SQL Editor after review.
-- Fixes: property search performance (city, price, bedrooms, status, seller_id)

CREATE INDEX IF NOT EXISTS properties_city_status_created_idx
  ON public.properties (city, status, created_at DESC);

CREATE INDEX IF NOT EXISTS properties_active_price_idx
  ON public.properties (price)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS properties_active_bedrooms_idx
  ON public.properties (bedrooms)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS properties_status_updated_idx
  ON public.properties (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS properties_seller_id_updated_idx
  ON public.properties (seller_id, updated_at DESC);
