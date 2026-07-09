-- =============================================================================
-- AreaIQ Connect Partner System — Complete idempotent migration
-- =============================================================================
-- Generated from production schema inspection (hydrtiwdtptwoxoywavd, 2026-07-04)
--
-- Production baseline verified before generation:
--   EXISTS : profiles, properties, crm_leads, inquiries, site_visits, is_admin()
--   MISSING: connect_partners, connect_partner_activities,
--            profiles.connect_partner_id, profiles.company,
--            properties.assigned_connect_id, properties.connect_partner_id,
--            crm_leads.connect_partner_id,
--            get_user_connect_partner_id(), is_connect_partner_user()
--   EXISTS : crm_leads.assigned_connect_id
--
-- Safe to re-run. Backfills only INSERT missing rows or UPDATE NULL columns.
-- Does not overwrite existing business data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1 — Create connect_partners table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connect_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  manager_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text,
  city text,
  gst text,
  rera text,
  logo text,
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT connect_partners_status_check
    CHECK (status IN ('pending', 'active', 'suspended', 'archived')),
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.connect_partners IS
  'AreaIQ Connect partner companies — admin-created only';

-- ---------------------------------------------------------------------------
-- STEP 2 — Create connect_partner_activities table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connect_partner_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL
    CONSTRAINT connect_partner_activities_type_check
    CHECK (type IN (
      'partner_created', 'buyer_assigned', 'buyer_removed',
      'property_assigned', 'property_updated', 'property_approved',
      'property_rejected', 'site_visit', 'login', 'logout',
      'notes_added', 'lead_updated'
    )),
  actor_id uuid,
  partner_id uuid,
  buyer_id uuid,
  property_id uuid,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.connect_partner_activities IS
  'Audit timeline for Connect partner CRM events';

-- Activity table foreign keys (tables above must exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'connect_partner_activities_actor_id_fkey'
  ) THEN
    ALTER TABLE public.connect_partner_activities
      ADD CONSTRAINT connect_partner_activities_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'connect_partner_activities_partner_id_fkey'
  ) THEN
    ALTER TABLE public.connect_partner_activities
      ADD CONSTRAINT connect_partner_activities_partner_id_fkey
      FOREIGN KEY (partner_id) REFERENCES public.connect_partners(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'connect_partner_activities_buyer_id_fkey'
  ) THEN
    ALTER TABLE public.connect_partner_activities
      ADD CONSTRAINT connect_partner_activities_buyer_id_fkey
      FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'connect_partner_activities_property_id_fkey'
  ) THEN
    ALTER TABLE public.connect_partner_activities
      ADD CONSTRAINT connect_partner_activities_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 3 — properties.assigned_connect_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS assigned_connect_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_assigned_connect_id_fkey'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_assigned_connect_id_fkey
      FOREIGN KEY (assigned_connect_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 4 — crm_leads.assigned_connect_id
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    ALTER TABLE public.crm_leads
      ADD COLUMN IF NOT EXISTS assigned_connect_id uuid;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_assigned_connect_id_fkey'
    ) THEN
      ALTER TABLE public.crm_leads
        ADD CONSTRAINT crm_leads_assigned_connect_id_fkey
        FOREIGN KEY (assigned_connect_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- connect_partner_id columns (required by app; absent on production)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS connect_partner_id uuid;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS connect_partner_id uuid;

DO $$
BEGIN
  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    ALTER TABLE public.crm_leads
      ADD COLUMN IF NOT EXISTS connect_partner_id uuid;
  END IF;
END $$;

-- connect_partner_id foreign keys (connect_partners must exist from step 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_connect_partner_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_connect_partner_id_fkey
      FOREIGN KEY (connect_partner_id)
      REFERENCES public.connect_partners(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_connect_partner_id_fkey'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_connect_partner_id_fkey
      FOREIGN KEY (connect_partner_id)
      REFERENCES public.connect_partners(id)
      ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.crm_leads') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_connect_partner_id_fkey'
     ) THEN
    ALTER TABLE public.crm_leads
      ADD CONSTRAINT crm_leads_connect_partner_id_fkey
      FOREIGN KEY (connect_partner_id)
      REFERENCES public.connect_partners(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 5 — Create indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS connect_partners_status_idx
  ON public.connect_partners (status);

CREATE INDEX IF NOT EXISTS connect_partners_profile_idx
  ON public.connect_partners (profile_id)
  WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS connect_partners_email_idx
  ON public.connect_partners (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS connect_partners_phone_idx
  ON public.connect_partners (phone);

CREATE INDEX IF NOT EXISTS profiles_connect_partner_idx
  ON public.profiles (connect_partner_id)
  WHERE connect_partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS properties_connect_partner_idx
  ON public.properties (connect_partner_id)
  WHERE connect_partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS properties_assigned_connect_idx
  ON public.properties (assigned_connect_id)
  WHERE assigned_connect_id IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS crm_leads_connect_partner_idx
      ON public.crm_leads (connect_partner_id)
      WHERE connect_partner_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS crm_leads_assigned_connect_idx
      ON public.crm_leads (assigned_connect_id)
      WHERE assigned_connect_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS connect_partner_activities_partner_idx
  ON public.connect_partner_activities (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS connect_partner_activities_buyer_idx
  ON public.connect_partner_activities (buyer_id)
  WHERE buyer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS connect_partner_activities_created_idx
  ON public.connect_partner_activities (created_at DESC);

-- ---------------------------------------------------------------------------
-- STEP 6 — Backfill connect partners (insert only; no overwrites)
-- ---------------------------------------------------------------------------
INSERT INTO public.connect_partners (
  profile_id, company_name, manager_name, email, phone,
  address, city, gst, rera, logo, status
)
SELECT
  p.id,
  COALESCE(NULLIF(trim(p.full_name), ''), 'Partner'),
  COALESCE(NULLIF(trim(p.full_name), ''), 'Manager'),
  COALESCE(NULLIF(trim(p.email), ''), p.id::text || '@areaiq.app'),
  COALESCE(NULLIF(trim(p.phone), ''), '0000000000'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'active'
FROM public.profiles p
WHERE p.role = 'builder'
  AND NOT EXISTS (
    SELECT 1 FROM public.connect_partners cp WHERE cp.profile_id = p.id
  );

UPDATE public.profiles p
SET connect_partner_id = cp.id
FROM public.connect_partners cp
WHERE cp.profile_id = p.id
  AND p.connect_partner_id IS NULL;

-- ---------------------------------------------------------------------------
-- STEP 7 — Backfill property assignments (NULL columns only)
-- ---------------------------------------------------------------------------
UPDATE public.properties prop
SET connect_partner_id = cp.id
FROM public.connect_partners cp
WHERE prop.assigned_connect_id = cp.profile_id
  AND prop.connect_partner_id IS NULL
  AND prop.assigned_connect_id IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    UPDATE public.crm_leads l
    SET connect_partner_id = cp.id
    FROM public.connect_partners cp
    WHERE l.assigned_connect_id = cp.profile_id
      AND l.connect_partner_id IS NULL
      AND l.assigned_connect_id IS NOT NULL;

    UPDATE public.profiles buyer
    SET connect_partner_id = l.connect_partner_id
    FROM public.crm_leads l
    WHERE l.buyer_id = buyer.id
      AND buyer.role = 'buyer'
      AND buyer.connect_partner_id IS NULL
      AND l.connect_partner_id IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 8 — Create helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_connect_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT connect_partner_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_connect_partner_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'builder'
      AND connect_partner_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.set_connect_partners_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_connect_partner_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_connect_partner_id() TO authenticated;

REVOKE ALL ON FUNCTION public.is_connect_partner_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_connect_partner_user() TO authenticated;

-- ---------------------------------------------------------------------------
-- STEP 9 — Create RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.connect_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access connect_partners" ON public.connect_partners;
CREATE POLICY "Admin full access connect_partners"
  ON public.connect_partners FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Connect partner read own record" ON public.connect_partners;
CREATE POLICY "Connect partner read own record"
  ON public.connect_partners FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Connect partner update own record" ON public.connect_partners;
CREATE POLICY "Connect partner update own record"
  ON public.connect_partners FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

ALTER TABLE public.connect_partner_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access connect_partner_activities" ON public.connect_partner_activities;
CREATE POLICY "Admin full access connect_partner_activities"
  ON public.connect_partner_activities FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Connect partner read own activities" ON public.connect_partner_activities;
CREATE POLICY "Connect partner read own activities"
  ON public.connect_partner_activities FOR SELECT TO authenticated
  USING (partner_id = public.get_user_connect_partner_id());

DROP POLICY IF EXISTS "Connect partner insert own activities" ON public.connect_partner_activities;
CREATE POLICY "Connect partner insert own activities"
  ON public.connect_partner_activities FOR INSERT TO authenticated
  WITH CHECK (partner_id = public.get_user_connect_partner_id());

DROP POLICY IF EXISTS "Connect read assigned properties" ON public.properties;
CREATE POLICY "Connect read assigned properties"
  ON public.properties FOR SELECT TO authenticated
  USING (
    connect_partner_id = public.get_user_connect_partner_id()
    OR (
      assigned_connect_id IS NOT NULL
      AND auth.uid() = assigned_connect_id
    )
  );

DROP POLICY IF EXISTS "Connect update assigned properties" ON public.properties;
CREATE POLICY "Connect update assigned properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (connect_partner_id = public.get_user_connect_partner_id())
  WITH CHECK (connect_partner_id = public.get_user_connect_partner_id());

DROP POLICY IF EXISTS "Connect read assigned buyers" ON public.profiles;
CREATE POLICY "Connect read assigned buyers"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    role = 'buyer'
    AND connect_partner_id = public.get_user_connect_partner_id()
  );

-- ---------------------------------------------------------------------------
-- STEP 10 — Create triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS connect_partners_updated_at ON public.connect_partners;
CREATE TRIGGER connect_partners_updated_at
  BEFORE UPDATE ON public.connect_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_connect_partners_updated_at();

-- ---------------------------------------------------------------------------
-- STEP 11 — Grant permissions
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_partners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_partners TO service_role;

GRANT SELECT, INSERT ON public.connect_partner_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_partner_activities TO service_role;

NOTIFY pgrst, 'reload schema';
