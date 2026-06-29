-- Buyer dashboard: compare list, property views, site visits, profile preferences

-- ---------------------------------------------------------------------------
-- compared_properties
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compared_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS compared_properties_user_id_idx
  ON public.compared_properties (user_id);

ALTER TABLE public.compared_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own compared properties" ON public.compared_properties;
CREATE POLICY "Users manage own compared properties"
  ON public.compared_properties
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- property_views (recent viewed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_views_user_viewed_idx
  ON public.property_views (user_id, viewed_at DESC);

ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own property views" ON public.property_views;
CREATE POLICY "Users manage own property views"
  ON public.property_views
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- site_visits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  visit_time time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  builder_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_visits_user_id_idx
  ON public.site_visits (user_id, visit_date DESC);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own site visits" ON public.site_visits;
CREATE POLICY "Users read own site visits"
  ON public.site_visits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own site visits" ON public.site_visits;
CREATE POLICY "Users insert own site visits"
  ON public.site_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Buyer preferences on profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS budget_min integer;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS budget_max integer;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_locations text[] DEFAULT '{}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_property_types text[] DEFAULT '{}';

COMMENT ON COLUMN public.profiles.preferred_locations IS 'Buyer preferred Tricity areas';
COMMENT ON COLUMN public.profiles.preferred_property_types IS 'Buyer preferred property type slugs';

-- ---------------------------------------------------------------------------
-- saved_properties RLS (if table exists without policies)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saved_properties'
  ) THEN
    ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users manage own saved properties" ON public.saved_properties;
    CREATE POLICY "Users manage own saved properties"
      ON public.saved_properties
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
