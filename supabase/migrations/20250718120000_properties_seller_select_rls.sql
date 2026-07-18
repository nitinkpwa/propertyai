-- Fix: sellers could INSERT properties but could not SELECT non-active rows.
-- Live RLS only allowed SELECT where status = 'active' (public) or Connect assignment.
-- Result: Add Property appeared to succeed, then My Properties stayed empty.
--
-- Safe to re-run (idempotent DROP IF EXISTS).

-- Sellers / builders: read their own listings (any status)
DROP POLICY IF EXISTS "Sellers can select own properties" ON public.properties;
CREATE POLICY "Sellers can select own properties"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

-- Admins: full access for moderation (may already exist on some envs)
DROP POLICY IF EXISTS "Admins manage all properties" ON public.properties;
CREATE POLICY "Admins manage all properties"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
