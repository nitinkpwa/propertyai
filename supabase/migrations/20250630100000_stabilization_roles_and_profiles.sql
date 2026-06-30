-- AreaIQ stabilization (2025-06-30)
-- DO NOT RUN automatically — apply manually in Supabase SQL Editor after review.
-- Fixes: role validation, is_admin() helper, profiles RLS (without breaking listing joins)

-- ---------------------------------------------------------------------------
-- 1. Normalize roles to buyer | seller | builder | admin
-- ---------------------------------------------------------------------------
UPDATE public.profiles
SET role = 'seller'
WHERE role = 'broker';

UPDATE public.profiles
SET role = 'buyer'
WHERE role IS NULL OR btrim(role) = '';

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'buyer';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('buyer', 'seller', 'builder', 'admin'));

COMMENT ON COLUMN public.profiles.role IS
  'Account role: buyer | seller | builder | admin';

-- ---------------------------------------------------------------------------
-- 2. Admin helper for RLS policies
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

-- ---------------------------------------------------------------------------
-- 3. Profiles RLS (was missing — critical production gap)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Public read seller names on active listings" ON public.profiles;
CREATE POLICY "Public read seller names on active listings"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.seller_id = profiles.id
        AND p.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Sellers read buyer profiles on own leads" ON public.profiles;
CREATE POLICY "Sellers read buyer profiles on own leads"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.inquiries i
      WHERE i.from_user_id = profiles.id
        AND i.seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.site_visits sv
      INNER JOIN public.properties p ON p.id = sv.property_id
      WHERE sv.user_id = profiles.id
        AND p.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
