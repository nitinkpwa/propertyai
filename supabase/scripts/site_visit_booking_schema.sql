-- =============================================================================
-- AreaIQ — Site Visit + CRM Schema (complete, idempotent)
-- =============================================================================
-- Target project : hydrtiwdtptwoxoywavd  (from NEXT_PUBLIC_SUPABASE_URL)
-- Paste into     : Supabase Dashboard → SQL Editor → Run
-- Safe to re-run : uses CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
--                  DROP POLICY IF EXISTS throughout
--
-- Source migrations merged:
--   20250629130000_buyer_dashboard_tables.sql   (site_visits base)
--   20250629150000_seller_dashboard.sql       (seller site_visits RLS)
--   20250630100000_stabilization_roles_and_profiles.sql (is_admin helper)
--   20250630102000_stabilization_rls_policies.sql (admin + buyer update RLS)
--   20250701140000_crm_foundation.sql           (crm_leads, activities, notifications)
--   20250701150000_crm_refinement.sql           (approval workflow, extended enums)
--
-- Prerequisites (must already exist in your project):
--   auth.users, public.profiles, public.properties,
--   public.inquiries, public.conversations
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Prerequisites — ensure helper + columns used by RLS policies exist
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS budget_min integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS budget_max integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_locations text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_property_types text[] DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 1. site_visits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  visit_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending_approval',
  builder_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS visit_location text;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS feedback jsonb;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL;

ALTER TABLE public.site_visits DROP CONSTRAINT IF EXISTS site_visits_status_check;

UPDATE public.site_visits SET status = 'pending_approval'
  WHERE status IN ('scheduled', 'confirmed') AND accepted_at IS NULL;

UPDATE public.site_visits SET status = 'scheduled'
  WHERE status IN ('confirmed', 'accepted');

UPDATE public.site_visits SET status = 'pending_approval'
  WHERE status NOT IN (
    'pending_approval', 'accepted', 'scheduled', 'completed', 'rejected', 'cancelled'
  );

ALTER TABLE public.site_visits
  ADD CONSTRAINT site_visits_status_check
  CHECK (status IN (
    'pending_approval', 'accepted', 'scheduled', 'completed', 'rejected', 'cancelled'
  ));

CREATE INDEX IF NOT EXISTS site_visits_user_id_idx
  ON public.site_visits (user_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS site_visits_status_idx
  ON public.site_visits (status);
CREATE INDEX IF NOT EXISTS site_visits_property_status_idx
  ON public.site_visits (property_id, status);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own site visits" ON public.site_visits;
CREATE POLICY "Users read own site visits"
  ON public.site_visits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own site visits" ON public.site_visits;
CREATE POLICY "Users insert own site visits"
  ON public.site_visits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own site visits" ON public.site_visits;
CREATE POLICY "Users update own site visits"
  ON public.site_visits FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers read visits on own properties" ON public.site_visits;
CREATE POLICY "Sellers read visits on own properties"
  ON public.site_visits FOR SELECT TO authenticated
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
  ON public.site_visits FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Admins manage all site visits" ON public.site_visits;
CREATE POLICY "Admins manage all site visits"
  ON public.site_visits FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. crm_leads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN (
      'new', 'ai_qualified', 'interested', 'property_suggested', 'property_saved',
      'inquiry_sent', 'visit_scheduled', 'visited', 'negotiation', 'booked',
      'completed', 'lost'
    )),
  assigned_connect_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  primary_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  first_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id)
);

CREATE INDEX IF NOT EXISTS crm_leads_buyer_id_idx ON public.crm_leads (buyer_id);
CREATE INDEX IF NOT EXISTS crm_leads_assigned_connect_idx ON public.crm_leads (assigned_connect_id);
CREATE INDEX IF NOT EXISTS crm_leads_status_idx ON public.crm_leads (status);

CREATE OR REPLACE FUNCTION public.set_crm_leads_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_leads_updated_at ON public.crm_leads;
CREATE TRIGGER crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_crm_leads_updated_at();

-- ---------------------------------------------------------------------------
-- 3. crm_lead_activities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  site_visit_id uuid REFERENCES public.site_visits(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_lead_activities DROP CONSTRAINT IF EXISTS crm_lead_activities_activity_type_check;
ALTER TABLE public.crm_lead_activities
  ADD CONSTRAINT crm_lead_activities_activity_type_check
  CHECK (activity_type IN (
    'buyer_registered', 'buyer_first_login', 'ai_chat_started', 'ai_chat_message',
    'property_viewed', 'property_saved', 'property_unsaved', 'contact_requested',
    'inquiry_sent', 'site_visit_booked', 'site_visit_accepted', 'site_visit_rejected',
    'site_visit_rescheduled', 'site_visit_completed', 'site_visit_cancelled',
    'visit_checklist_generated', 'visit_feedback_submitted',
    'negotiation_started', 'deal_booked', 'deal_closed', 'deal_lost',
    'lead_assigned', 'lead_reassigned', 'status_changed'
  ));

CREATE INDEX IF NOT EXISTS crm_lead_activities_lead_id_idx
  ON public.crm_lead_activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_lead_activities_property_id_idx
  ON public.crm_lead_activities (property_id);

-- ---------------------------------------------------------------------------
-- 4. crm_notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_notifications DROP CONSTRAINT IF EXISTS crm_notifications_type_check;
ALTER TABLE public.crm_notifications
  ADD CONSTRAINT crm_notifications_type_check
  CHECK (type IN (
    'new_inquiry', 'property_saved', 'site_visit_booked', 'site_visit_accepted',
    'site_visit_rejected', 'lead_assigned', 'lead_reassigned', 'new_lead', 'general'
  ));

CREATE INDEX IF NOT EXISTS crm_notifications_user_id_idx
  ON public.crm_notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. RLS — crm_leads (non-recursive — see fix_crm_rls_recursion.sql)
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.crm_lead_owned_by_buyer(p_lead_id uuid, p_buyer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = p_lead_id AND l.buyer_id = p_buyer_id);
$$;

CREATE OR REPLACE FUNCTION public.is_connect_assigned_to_lead(p_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = p_lead_id AND l.assigned_connect_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_connect_assigned_to_buyer(p_buyer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.buyer_id = p_buyer_id AND l.assigned_connect_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_property_owner(p_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = p_property_id AND p.seller_id = auth.uid() AND p.deleted_at IS NULL);
$$;

CREATE OR REPLACE FUNCTION public.seller_can_view_crm_lead(p_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_leads l WHERE l.id = p_lead_id AND (
      EXISTS (SELECT 1 FROM public.inquiries i WHERE i.from_user_id = l.buyer_id AND i.seller_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.crm_lead_activities a
        INNER JOIN public.properties p ON p.id = a.property_id
        WHERE a.lead_id = l.id AND p.seller_id = auth.uid() AND p.deleted_at IS NULL
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.seller_can_update_crm_lead(p_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_leads l
    INNER JOIN public.inquiries i ON i.from_user_id = l.buyer_id
    WHERE l.id = p_lead_id AND i.seller_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.crm_lead_owned_by_buyer(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_connect_assigned_to_lead(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_connect_assigned_to_buyer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_property_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seller_can_view_crm_lead(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seller_can_update_crm_lead(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_lead_owned_by_buyer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_connect_assigned_to_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_connect_assigned_to_buyer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_property_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_can_view_crm_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_can_update_crm_lead(uuid) TO authenticated;

DROP POLICY IF EXISTS "Buyers read own crm lead" ON public.crm_leads;
CREATE POLICY "Buyers read own crm lead"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers insert own crm lead" ON public.crm_leads;
CREATE POLICY "Buyers insert own crm lead"
  ON public.crm_leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers update own crm lead" ON public.crm_leads;
CREATE POLICY "Buyers update own crm lead"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers read related crm leads" ON public.crm_leads;
CREATE POLICY "Sellers read related crm leads"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (public.seller_can_view_crm_lead(id));

DROP POLICY IF EXISTS "Connect read assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect read assigned crm leads"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (auth.uid() = assigned_connect_id);

DROP POLICY IF EXISTS "Admins manage all crm leads" ON public.crm_leads;
CREATE POLICY "Admins manage all crm leads"
  ON public.crm_leads FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Sellers update related crm leads" ON public.crm_leads;
CREATE POLICY "Sellers update related crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (public.seller_can_update_crm_lead(id));

DROP POLICY IF EXISTS "Connect update assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect update assigned crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_connect_id);

-- ---------------------------------------------------------------------------
-- 6. RLS — crm_lead_activities
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers read own lead activities" ON public.crm_lead_activities;
CREATE POLICY "Buyers read own lead activities"
  ON public.crm_lead_activities FOR SELECT TO authenticated
  USING (public.crm_lead_owned_by_buyer(lead_id, auth.uid()));

DROP POLICY IF EXISTS "Buyers insert own lead activities" ON public.crm_lead_activities;
CREATE POLICY "Buyers insert own lead activities"
  ON public.crm_lead_activities FOR INSERT TO authenticated
  WITH CHECK (public.crm_lead_owned_by_buyer(lead_id, auth.uid()));

DROP POLICY IF EXISTS "Sellers read related lead activities" ON public.crm_lead_activities;
CREATE POLICY "Sellers read related lead activities"
  ON public.crm_lead_activities FOR SELECT TO authenticated
  USING (
    (property_id IS NOT NULL AND public.is_property_owner(property_id))
    OR public.seller_can_view_crm_lead(lead_id)
  );

DROP POLICY IF EXISTS "Connect read assigned lead activities" ON public.crm_lead_activities;
CREATE POLICY "Connect read assigned lead activities"
  ON public.crm_lead_activities FOR SELECT TO authenticated
  USING (public.is_connect_assigned_to_lead(lead_id));

DROP POLICY IF EXISTS "Admins manage all lead activities" ON public.crm_lead_activities;
CREATE POLICY "Admins manage all lead activities"
  ON public.crm_lead_activities FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. RLS — crm_notifications
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own crm notifications" ON public.crm_notifications;
CREATE POLICY "Users read own crm notifications"
  ON public.crm_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own crm notifications" ON public.crm_notifications;
CREATE POLICY "Users update own crm notifications"
  ON public.crm_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated insert crm notifications" ON public.crm_notifications;
CREATE POLICY "Authenticated insert crm notifications"
  ON public.crm_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage all crm notifications" ON public.crm_notifications;
CREATE POLICY "Admins manage all crm notifications"
  ON public.crm_notifications FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. Connect partner site_visits policies (requires crm_leads)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Connect update assigned buyer visits" ON public.site_visits;
CREATE POLICY "Connect update assigned buyer visits"
  ON public.site_visits FOR UPDATE TO authenticated
  USING (
    public.is_connect_assigned_to_buyer(user_id)
    OR public.is_property_owner(property_id)
  );

DROP POLICY IF EXISTS "Connect read assigned buyer visits" ON public.site_visits;
CREATE POLICY "Connect read assigned buyer visits"
  ON public.site_visits FOR SELECT TO authenticated
  USING (
    public.is_connect_assigned_to_buyer(user_id)
    OR public.is_property_owner(property_id)
  );

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-run verification (optional — run separately to confirm)
-- ---------------------------------------------------------------------------
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('site_visits','crm_leads','crm_lead_activities','crm_notifications');
