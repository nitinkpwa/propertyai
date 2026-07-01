-- =============================================================================
-- Fix: infinite recursion in CRM RLS policies
-- =============================================================================
-- Root cause (cycle):
--   crm_leads "Sellers read related"  → queries crm_lead_activities
--   crm_lead_activities "Buyers/Connect read" → queries crm_leads
--   PostgreSQL RLS re-evaluates policies → infinite recursion
--
-- Fix: move cross-table ownership checks into SECURITY DEFINER functions.
-- Policies only call functions or reference auth.uid() / single foreign tables.
--
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers (bypass RLS for internal ownership checks)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crm_lead_owned_by_buyer(p_lead_id uuid, p_buyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_leads l
    WHERE l.id = p_lead_id
      AND l.buyer_id = p_buyer_id
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
    SELECT 1
    FROM public.crm_leads l
    WHERE l.id = p_lead_id
      AND l.assigned_connect_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_connect_assigned_to_buyer(p_buyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_leads l
    WHERE l.buyer_id = p_buyer_id
      AND l.assigned_connect_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_property_owner(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = p_property_id
      AND p.seller_id = auth.uid()
      AND p.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.seller_can_view_crm_lead(p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_leads l
    WHERE l.id = p_lead_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.inquiries i
          WHERE i.from_user_id = l.buyer_id
            AND i.seller_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.crm_lead_activities a
          INNER JOIN public.properties p ON p.id = a.property_id
          WHERE a.lead_id = l.id
            AND p.seller_id = auth.uid()
            AND p.deleted_at IS NULL
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.seller_can_update_crm_lead(p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_leads l
    INNER JOIN public.inquiries i ON i.from_user_id = l.buyer_id
    WHERE l.id = p_lead_id
      AND i.seller_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_crm_lead(p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR public.crm_lead_owned_by_buyer(p_lead_id, auth.uid())
    OR public.is_connect_assigned_to_lead(p_lead_id)
    OR public.seller_can_view_crm_lead(p_lead_id);
$$;

REVOKE ALL ON FUNCTION public.crm_lead_owned_by_buyer(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_connect_assigned_to_lead(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_connect_assigned_to_buyer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_property_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seller_can_view_crm_lead(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seller_can_update_crm_lead(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_crm_lead(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.crm_lead_owned_by_buyer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_connect_assigned_to_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_connect_assigned_to_buyer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_property_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_can_view_crm_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_can_update_crm_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_crm_lead(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- crm_leads — no self-references, no crm_lead_activities in policy expressions
-- ---------------------------------------------------------------------------

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

DROP POLICY IF EXISTS "Sellers update related crm leads" ON public.crm_leads;
CREATE POLICY "Sellers update related crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (public.seller_can_update_crm_lead(id));

DROP POLICY IF EXISTS "Connect update assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect update assigned crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_connect_id);

DROP POLICY IF EXISTS "Admins manage all crm leads" ON public.crm_leads;
CREATE POLICY "Admins manage all crm leads"
  ON public.crm_leads FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- crm_lead_activities — never query crm_leads inside policy (use functions)
-- ---------------------------------------------------------------------------

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
-- crm_notifications — no cross-table CRM recursion (unchanged logic)
-- ---------------------------------------------------------------------------

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
-- site_visits — replace crm_leads subqueries with SECURITY DEFINER function
-- (buyer / seller policies unchanged — they only use auth.uid() or properties)
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
