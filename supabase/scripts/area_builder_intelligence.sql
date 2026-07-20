-- Paste into Supabase SQL Editor → Run
-- Creates AreaIQ Area + Builder intelligence knowledge tables.

CREATE TABLE IF NOT EXISTS public.area_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locality text NOT NULL,
  city text,
  overview text,
  connectivity text,
  airport_distance text,
  metro text,
  schools text,
  hospitals text,
  malls text,
  future_infrastructure text,
  demand text,
  supply text,
  rental_market text,
  capital_appreciation text,
  builder_activity text,
  risk_level text,
  suitable_for text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS area_intelligence_locality_city_uidx
  ON public.area_intelligence (lower(locality), lower(coalesce(city, '')));

CREATE TABLE IF NOT EXISTS public.builder_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_name text NOT NULL,
  projects text[] DEFAULT '{}',
  completed_projects text[] DEFAULT '{}',
  construction_quality text,
  delivery_record text,
  rera text,
  reputation text,
  customer_reviews text,
  pros text[] DEFAULT '{}',
  cons text[] DEFAULT '{}',
  risk_score numeric,
  areaiq_builder_score numeric,
  future_launches text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS builder_intelligence_name_uidx
  ON public.builder_intelligence (lower(builder_name));

ALTER TABLE public.area_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_intelligence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read area intelligence" ON public.area_intelligence;
CREATE POLICY "Public read area intelligence"
  ON public.area_intelligence FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read builder intelligence" ON public.builder_intelligence;
CREATE POLICY "Public read builder intelligence"
  ON public.builder_intelligence FOR SELECT
  TO anon, authenticated
  USING (true);
