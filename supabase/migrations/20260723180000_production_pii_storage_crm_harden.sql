-- Production hardening: stop public/anon harvesting of seller PII via PostgREST.
-- App layer also omits these columns from public selects; this is defense-in-depth.

-- ---------------------------------------------------------------------------
-- Properties: revoke contact columns from anon (authenticated sellers/admins
-- retain table-level SELECT for their own dashboards via existing grants).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Column-level revoke is ignored if the privilege was never granted at column
  -- granularity; revoke table then re-grant non-contact columns for anon.
  BEGIN
    REVOKE SELECT ON TABLE public.properties FROM anon;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;

  -- Re-grant safe public catalog columns to anon (no contact_*)
  GRANT SELECT (
    id, seller_id, title, description, type, sub_type, price, calculated_price,
    area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos,
    amenities, status, is_featured, created_at, updated_at, views,
    builder_name, furnishing, parking, facing, nearby_places, rera_number,
    possession, featured_image, deleted_at, site_visit_enabled,
    connect_partner_id, assigned_connect_id
  ) ON TABLE public.properties TO anon;
EXCEPTION
  WHEN undefined_column THEN
    -- Live schemas vary; fall back to a minimal safe grant without optional cols
    BEGIN
      GRANT SELECT (
        id, seller_id, title, description, type, sub_type, price,
        area_sqft, bedrooms, bathrooms, location, city, sector, lat, lng, photos,
        amenities, status, is_featured, created_at, updated_at, views
      ) ON TABLE public.properties TO anon;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'properties anon grant fallback skipped: %', SQLERRM;
    END;
  WHEN OTHERS THEN
    RAISE NOTICE 'properties anon contact harden skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Profiles: anon may only read display fields for sellers with active listings.
-- Drop broad public SELECT policy impact by column-level grant.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    REVOKE SELECT ON TABLE public.profiles FROM anon;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;

  GRANT SELECT (id, full_name, avatar_url) ON TABLE public.profiles TO anon;
EXCEPTION
  WHEN undefined_column THEN
    BEGIN
      GRANT SELECT (id, full_name) ON TABLE public.profiles TO anon;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'profiles anon grant fallback skipped: %', SQLERRM;
    END;
  WHEN OTHERS THEN
    RAISE NOTICE 'profiles anon harden skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- CRM: buyers must not spoof pipeline status via broad UPDATE policy.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_crm_leads_buyer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Partners/sellers who have UPDATE policies may change status; buyers may not.
  IF auth.uid() = OLD.buyer_id
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.role IN ('seller', 'builder', 'admin')
     )
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.assigned_connect_id IS DISTINCT FROM OLD.assigned_connect_id
       OR NEW.connect_partner_id IS DISTINCT FROM OLD.connect_partner_id
     ) THEN
    NEW.status := OLD.status;
    NEW.assigned_connect_id := OLD.assigned_connect_id;
    NEW.connect_partner_id := OLD.connect_partner_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_guard_buyer_update ON public.crm_leads;
CREATE TRIGGER crm_leads_guard_buyer_update
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_crm_leads_buyer_update();

-- ---------------------------------------------------------------------------
-- Storage: property-photos — authenticated upload only under own uid prefix
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Buckets / policies may already exist in dashboard; make idempotent.
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('property-photos', 'property-photos', true)
  ON CONFLICT (id) DO NOTHING;

  DROP POLICY IF EXISTS "Public read property photos" ON storage.objects;
  CREATE POLICY "Public read property photos"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'property-photos');

  DROP POLICY IF EXISTS "Users upload own property photos" ON storage.objects;
  CREATE POLICY "Users upload own property photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'property-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "Users update own property photos" ON storage.objects;
  CREATE POLICY "Users update own property photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'property-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  DROP POLICY IF EXISTS "Users delete own property photos" ON storage.objects;
  CREATE POLICY "Users delete own property photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'property-photos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.objects not available — skip storage policies';
  WHEN OTHERS THEN
    RAISE NOTICE 'storage harden skipped: %', SQLERRM;
END $$;
