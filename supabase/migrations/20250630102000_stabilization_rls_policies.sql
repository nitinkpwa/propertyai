-- AreaIQ stabilization (2025-06-30)
-- DO NOT RUN automatically — apply manually in Supabase SQL Editor after review.
-- Fixes: admin + buyer RLS gaps on existing MVP tables only.
-- Requires: 20250630100000_stabilization_roles_and_profiles.sql (is_admin)

-- ---------------------------------------------------------------------------
-- properties — admin moderation (sellers/builders already covered by seller_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage all properties" ON public.properties;
CREATE POLICY "Admins manage all properties"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- inquiries — buyers read own; admin full access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Buyers read own inquiries" ON public.inquiries;
CREATE POLICY "Buyers read own inquiries"
  ON public.inquiries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Admins manage all inquiries" ON public.inquiries;
CREATE POLICY "Admins manage all inquiries"
  ON public.inquiries
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- saved_properties
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage all saved properties" ON public.saved_properties;
CREATE POLICY "Admins manage all saved properties"
  ON public.saved_properties
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- property_views
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage all property views" ON public.property_views;
CREATE POLICY "Admins manage all property views"
  ON public.property_views
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- site_visits — buyers can update/cancel own bookings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users update own site visits" ON public.site_visits;
CREATE POLICY "Users update own site visits"
  ON public.site_visits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all site visits" ON public.site_visits;
CREATE POLICY "Admins manage all site visits"
  ON public.site_visits
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- compared_properties
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage all compared properties" ON public.compared_properties;
CREATE POLICY "Admins manage all compared properties"
  ON public.compared_properties
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
