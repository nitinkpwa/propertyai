-- Seller dashboard: extended property fields, profile fields, RLS for seller data access

-- ---------------------------------------------------------------------------
-- Property columns
-- ---------------------------------------------------------------------------
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
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.properties.deleted_at IS 'Soft delete timestamp; null = active row';

-- ---------------------------------------------------------------------------
-- Seller profile columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rera_number text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gst text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_url text;

-- ---------------------------------------------------------------------------
-- Inquiries: extended lead statuses
-- ---------------------------------------------------------------------------
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check;
ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_status_check
  CHECK (status IN (
    'new', 'read', 'replied',
    'contacted', 'interested', 'closed'
  ));

-- ---------------------------------------------------------------------------
-- Site visits: allow sellers to manage visits on their properties
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Sellers read visits on own properties" ON public.site_visits;
CREATE POLICY "Sellers read visits on own properties"
  ON public.site_visits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = site_visits.property_id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Sellers update visits on own properties" ON public.site_visits;
CREATE POLICY "Sellers update visits on own properties"
  ON public.site_visits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = site_visits.property_id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = site_visits.property_id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- property_views: sellers read views on their listings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Sellers read views on own properties" ON public.property_views;
CREATE POLICY "Sellers read views on own properties"
  ON public.property_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_views.property_id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- saved_properties: sellers read saves on their listings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Sellers read saves on own properties" ON public.saved_properties;
CREATE POLICY "Sellers read saves on own properties"
  ON public.saved_properties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = saved_properties.property_id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- properties: sellers manage only their own (exclude soft-deleted from buyer reads elsewhere)
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers manage own properties" ON public.properties;
CREATE POLICY "Sellers manage own properties"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Public read active properties" ON public.properties;
CREATE POLICY "Public read active properties"
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND deleted_at IS NULL
  );

-- ---------------------------------------------------------------------------
-- inquiries: sellers read/update own leads
-- ---------------------------------------------------------------------------
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers read own inquiries" ON public.inquiries;
CREATE POLICY "Sellers read own inquiries"
  ON public.inquiries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers update own inquiries" ON public.inquiries;
CREATE POLICY "Sellers update own inquiries"
  ON public.inquiries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers insert inquiries" ON public.inquiries;
CREATE POLICY "Buyers insert inquiries"
  ON public.inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

-- Auto-update updated_at on properties
CREATE OR REPLACE FUNCTION public.set_properties_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS properties_updated_at ON public.properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_properties_updated_at();
