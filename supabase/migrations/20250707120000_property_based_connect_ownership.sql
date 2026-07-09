-- =============================================================================
-- Property-based Connect Partner ownership (2026-07-07)
-- =============================================================================
-- Root-cause fix: ownership was Buyer → Connect Partner (profiles.connect_partner_id
-- plus ONE crm_leads row per buyer). A buyer who enquired on properties of two
-- different partners overwrote the previous partner (last-write-wins) and each
-- partner could see the buyer's entire journey.
--
-- New model: Property → Connect Partner → transaction.
--   * properties.connect_partner_id is the single source of truth.
--   * Every transaction row (inquiries, site_visits, crm_lead_activities) is
--     stamped with the property's partner at INSERT time via triggers.
--   * crm_leads become partner-scoped: one lead per (buyer, partner) plus at
--     most one "general" lead per buyer (connect_partner_id IS NULL) for
--     journey events not tied to a partner property (registration, AI chat).
--   * profiles.connect_partner_id is no longer used for buyers (it remains the
--     login → partner-record mapping for role='builder' partner accounts).
--
-- Safe to re-run (idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 0 — Prerequisites (present in repo migrations but possibly missing in
-- production): manual-vs-auto assignment source columns.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS connect_assignment_source text NOT NULL DEFAULT 'auto';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_connect_assignment_source_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_connect_assignment_source_check
      CHECK (connect_assignment_source IN ('auto', 'manual'));
  END IF;

  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    ALTER TABLE public.crm_leads
      ADD COLUMN IF NOT EXISTS connect_assignment_source text NOT NULL DEFAULT 'auto';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_connect_assignment_source_check'
    ) THEN
      ALTER TABLE public.crm_leads
        ADD CONSTRAINT crm_leads_connect_assignment_source_check
        CHECK (connect_assignment_source IN ('auto', 'manual'));
    END IF;

    ALTER TABLE public.crm_leads
      ADD COLUMN IF NOT EXISTS primary_property_id uuid;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 1 — Transaction columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS connect_partner_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_connect_partner_id_fkey'
  ) THEN
    ALTER TABLE public.inquiries
      ADD CONSTRAINT inquiries_connect_partner_id_fkey
      FOREIGN KEY (connect_partner_id)
      REFERENCES public.connect_partners(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS inquiries_connect_partner_idx
  ON public.inquiries (connect_partner_id)
  WHERE connect_partner_id IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.crm_lead_activities') IS NOT NULL THEN
    ALTER TABLE public.crm_lead_activities
      ADD COLUMN IF NOT EXISTS connect_partner_id uuid;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'crm_lead_activities_connect_partner_id_fkey'
    ) THEN
      ALTER TABLE public.crm_lead_activities
        ADD CONSTRAINT crm_lead_activities_connect_partner_id_fkey
        FOREIGN KEY (connect_partner_id)
        REFERENCES public.connect_partners(id)
        ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS crm_lead_activities_connect_partner_idx
      ON public.crm_lead_activities (connect_partner_id)
      WHERE connect_partner_id IS NOT NULL;
  END IF;
END $$;

-- site_visits.connect_partner_id already exists (20250704140000).

-- ---------------------------------------------------------------------------
-- STEP 2 — Stamp triggers: property is ALWAYS the source of truth at insert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_connect_partner_from_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    SELECT p.connect_partner_id INTO NEW.connect_partner_id
    FROM public.properties p
    WHERE p.id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inquiries_stamp_connect_partner ON public.inquiries;
CREATE TRIGGER inquiries_stamp_connect_partner
  BEFORE INSERT ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_connect_partner_from_property();

DROP TRIGGER IF EXISTS site_visits_stamp_connect_partner ON public.site_visits;
CREATE TRIGGER site_visits_stamp_connect_partner
  BEFORE INSERT ON public.site_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_connect_partner_from_property();

DO $$
BEGIN
  IF to_regclass('public.crm_lead_activities') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS crm_lead_activities_stamp_connect_partner ON public.crm_lead_activities;
    CREATE TRIGGER crm_lead_activities_stamp_connect_partner
      BEFORE INSERT ON public.crm_lead_activities
      FOR EACH ROW
      EXECUTE FUNCTION public.stamp_connect_partner_from_property();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 3 — Partner-scoped CRM leads: one lead per (buyer, partner)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  uniq_name text;
BEGIN
  -- Drop the one-lead-per-buyer UNIQUE constraint (name varies by environment).
  SELECT conname INTO uniq_name
  FROM pg_constraint
  WHERE conrelid = 'public.crm_leads'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'public.crm_leads'::regclass AND attname = 'buyer_id'
    );

  IF uniq_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.crm_leads DROP CONSTRAINT %I', uniq_name);
  END IF;
END $$;

-- At most one general (partner-less) lead per buyer …
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_buyer_general_uniq
  ON public.crm_leads (buyer_id)
  WHERE connect_partner_id IS NULL;

-- … and one lead per buyer per partner.
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_buyer_partner_uniq
  ON public.crm_leads (buyer_id, connect_partner_id)
  WHERE connect_partner_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- STEP 4 — Backfill transaction stamps from properties (source of truth)
-- ---------------------------------------------------------------------------
UPDATE public.inquiries i
SET connect_partner_id = p.connect_partner_id
FROM public.properties p
WHERE p.id = i.property_id
  AND i.connect_partner_id IS DISTINCT FROM p.connect_partner_id;

UPDATE public.site_visits sv
SET connect_partner_id = p.connect_partner_id
FROM public.properties p
WHERE p.id = sv.property_id
  AND sv.connect_partner_id IS DISTINCT FROM p.connect_partner_id;

DO $$
BEGIN
  IF to_regclass('public.crm_lead_activities') IS NOT NULL THEN
    UPDATE public.crm_lead_activities a
    SET connect_partner_id = p.connect_partner_id
    FROM public.properties p
    WHERE p.id = a.property_id
      AND a.connect_partner_id IS DISTINCT FROM p.connect_partner_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 5 — Backfill partner-scoped leads from historical transactions
-- ---------------------------------------------------------------------------
-- One lead per (buyer, partner) seen in inquiries or site visits.
INSERT INTO public.crm_leads (buyer_id, status, connect_partner_id, assigned_connect_id, connect_assignment_source, primary_property_id)
SELECT DISTINCT ON (t.buyer_id, t.partner_id)
  t.buyer_id,
  'new',
  t.partner_id,
  cp.profile_id,
  'auto',
  t.property_id
FROM (
  SELECT i.from_user_id AS buyer_id, i.connect_partner_id AS partner_id, i.property_id, i.created_at
  FROM public.inquiries i
  WHERE i.connect_partner_id IS NOT NULL
  UNION ALL
  SELECT sv.user_id, sv.connect_partner_id, sv.property_id, sv.created_at
  FROM public.site_visits sv
  WHERE sv.connect_partner_id IS NOT NULL
) t
JOIN public.profiles b ON b.id = t.buyer_id AND b.role = 'buyer'
LEFT JOIN public.connect_partners cp ON cp.id = t.partner_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_leads l
  WHERE l.buyer_id = t.buyer_id AND l.connect_partner_id = t.partner_id
)
ORDER BY t.buyer_id, t.partner_id, t.created_at ASC
ON CONFLICT DO NOTHING;

-- Preserve manual admin buyer→partner assignments as manual partner-scoped leads.
INSERT INTO public.crm_leads (buyer_id, status, connect_partner_id, assigned_connect_id, connect_assignment_source)
SELECT b.id, 'new', b.connect_partner_id, cp.profile_id, 'manual'
FROM public.profiles b
LEFT JOIN public.connect_partners cp ON cp.id = b.connect_partner_id
WHERE b.role = 'buyer'
  AND b.connect_partner_id IS NOT NULL
  AND b.connect_assignment_source = 'manual'
  AND NOT EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.buyer_id = b.id AND l.connect_partner_id = b.connect_partner_id
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- STEP 6 — Re-home historical activities & visits to the correct partner lead
-- ---------------------------------------------------------------------------
-- 6a. Activities on a partner property move to that (buyer, partner) lead.
DO $$
BEGIN
  IF to_regclass('public.crm_lead_activities') IS NOT NULL THEN
    UPDATE public.crm_lead_activities a
    SET lead_id = correct.id
    FROM public.crm_leads cur, public.crm_leads correct
    WHERE cur.id = a.lead_id
      AND a.connect_partner_id IS NOT NULL
      AND correct.buyer_id = cur.buyer_id
      AND correct.connect_partner_id = a.connect_partner_id
      AND cur.id <> correct.id;
  END IF;
END $$;

-- 6b. Buyers whose only lead is partner-scoped but who have general
--     (non-partner) activities get a general lead so partners never see
--     journey events outside their own properties.
DO $$
BEGIN
  IF to_regclass('public.crm_lead_activities') IS NOT NULL THEN
    INSERT INTO public.crm_leads (buyer_id, status, connect_partner_id, connect_assignment_source)
    SELECT DISTINCT l.buyer_id, 'new', NULL::uuid, 'auto'
    FROM public.crm_lead_activities a
    JOIN public.crm_leads l ON l.id = a.lead_id
    WHERE l.connect_partner_id IS NOT NULL
      AND a.connect_partner_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.crm_leads g
        WHERE g.buyer_id = l.buyer_id AND g.connect_partner_id IS NULL
      )
    ON CONFLICT DO NOTHING;

    UPDATE public.crm_lead_activities a
    SET lead_id = general.id
    FROM public.crm_leads cur, public.crm_leads general
    WHERE cur.id = a.lead_id
      AND cur.connect_partner_id IS NOT NULL
      AND a.connect_partner_id IS NULL
      AND general.buyer_id = cur.buyer_id
      AND general.connect_partner_id IS NULL
      AND cur.id <> general.id;
  END IF;
END $$;

-- 6c. Site visits link to the (buyer, partner) lead of their property.
UPDATE public.site_visits sv
SET lead_id = correct.id
FROM public.crm_leads correct
WHERE sv.connect_partner_id IS NOT NULL
  AND correct.buyer_id = sv.user_id
  AND correct.connect_partner_id = sv.connect_partner_id
  AND (sv.lead_id IS NULL OR sv.lead_id <> correct.id);

-- ---------------------------------------------------------------------------
-- STEP 7 — Buyers are no longer owned by a partner at the profile level
-- ---------------------------------------------------------------------------
UPDATE public.profiles
SET connect_partner_id = NULL,
    connect_assignment_source = 'auto'
WHERE role = 'buyer'
  AND connect_partner_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- STEP 8 — RLS: filter by property/transaction ownership, never buyer profile
-- ---------------------------------------------------------------------------
-- Partner can read a buyer profile only when the buyer has engaged with one of
-- the partner's properties (partner-scoped lead exists) or the lead was
-- manually routed to them by the master admin.
CREATE OR REPLACE FUNCTION public.is_connect_assigned_to_buyer(p_buyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.buyer_id = p_buyer_id
      AND (
        l.assigned_connect_id = auth.uid()
        OR (
          l.connect_partner_id IS NOT NULL
          AND l.connect_partner_id = public.get_user_connect_partner_id()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_connect_assigned_to_lead(p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_leads l
    WHERE l.id = p_lead_id
      AND (
        l.assigned_connect_id = auth.uid()
        OR (
          l.connect_partner_id IS NOT NULL
          AND l.connect_partner_id = public.get_user_connect_partner_id()
        )
      )
  );
$$;

-- Replace buyer-profile-ownership read with engagement-based read.
DROP POLICY IF EXISTS "Connect read assigned buyers" ON public.profiles;
CREATE POLICY "Connect read assigned buyers"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    role = 'buyer'
    AND public.is_connect_assigned_to_buyer(id)
  );

-- Inquiries: partner reads only enquiries stamped with their partner id.
DROP POLICY IF EXISTS "Connect read partner inquiries" ON public.inquiries;
CREATE POLICY "Connect read partner inquiries"
  ON public.inquiries FOR SELECT TO authenticated
  USING (
    connect_partner_id IS NOT NULL
    AND connect_partner_id = public.get_user_connect_partner_id()
  );

-- Site visits: strictly transaction-stamped. The old lead-based fallback let a
-- partner see ALL of a buyer's visits (including other partners' properties).
DROP POLICY IF EXISTS "Connect read assigned site visits" ON public.site_visits;
CREATE POLICY "Connect read assigned site visits"
  ON public.site_visits FOR SELECT TO authenticated
  USING (
    connect_partner_id IS NOT NULL
    AND connect_partner_id = public.get_user_connect_partner_id()
  );

DROP POLICY IF EXISTS "Connect update assigned site visits" ON public.site_visits;
CREATE POLICY "Connect update assigned site visits"
  ON public.site_visits FOR UPDATE TO authenticated
  USING (
    connect_partner_id IS NOT NULL
    AND connect_partner_id = public.get_user_connect_partner_id()
  )
  WITH CHECK (
    connect_partner_id IS NOT NULL
    AND connect_partner_id = public.get_user_connect_partner_id()
  );

-- CRM leads: partner-scoped rows only (their leads are the only ones carrying
-- their partner id now, so the existing expressions become correct).
DROP POLICY IF EXISTS "Connect read assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect read assigned crm leads"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (
    auth.uid() = assigned_connect_id
    OR (
      connect_partner_id IS NOT NULL
      AND connect_partner_id = public.get_user_connect_partner_id()
    )
  );

DROP POLICY IF EXISTS "Connect update assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect update assigned crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (
    auth.uid() = assigned_connect_id
    OR (
      connect_partner_id IS NOT NULL
      AND connect_partner_id = public.get_user_connect_partner_id()
    )
  )
  WITH CHECK (
    auth.uid() = assigned_connect_id
    OR (
      connect_partner_id IS NOT NULL
      AND connect_partner_id = public.get_user_connect_partner_id()
    )
  );

-- Lead activities: is_connect_assigned_to_lead (redefined above) now resolves
-- through partner-scoped leads, so the existing policy expression is correct.
-- Recreate it defensively in case an environment is missing it.
DO $$
BEGIN
  IF to_regclass('public.crm_lead_activities') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Connect read assigned lead activities" ON public.crm_lead_activities;
    CREATE POLICY "Connect read assigned lead activities"
      ON public.crm_lead_activities FOR SELECT TO authenticated
      USING (public.is_connect_assigned_to_lead(lead_id));
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.is_connect_assigned_to_buyer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_connect_assigned_to_lead(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
