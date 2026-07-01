-- Fix: buyers cannot read seller profiles during site-visit booking
-- Root cause: profiles RLS blocks authenticated buyers from SELECT on seller rows.
-- Listing pages still work because they only read properties.* (contact_name fallback).
--
-- Run in Supabase SQL Editor. Safe to re-run.

-- Option A: Allow reading profiles of users who own active listings (recommended)
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
        AND (p.deleted_at IS NULL OR p.deleted_at IS NOT DISTINCT FROM NULL)
    )
  );

-- Option B: SECURITY DEFINER helper for booking API (works even if Option A is insufficient)
CREATE OR REPLACE FUNCTION public.get_listing_owner_profile(owner_id uuid)
RETURNS TABLE(id uuid, role text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.role, p.full_name
  FROM public.profiles p
  WHERE p.id = owner_id;
$$;

REVOKE ALL ON FUNCTION public.get_listing_owner_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_owner_profile(uuid) TO authenticated;
