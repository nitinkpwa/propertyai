-- =============================================================================
-- AreaIQ Security Hardening (2026-07-06)
-- =============================================================================
-- Closes verified launch-blocker vulnerabilities WITHOUT changing existing
-- business flows:
--   S1  profiles.role / profiles.connect_partner_id self-escalation
--   S2  crm_leads.assigned_connect_id / connect_partner_id self-assignment
--   S3  crm_notifications spoofing (INSERT WITH CHECK (true))
--   S4  manual-vs-auto Connect assignment precedence (adds source columns)
--   +   properties.connect_partner_id / assigned_connect_id hijack by sellers
--
-- Strategy: column-level guard triggers that run for EVERY caller. Privileged
-- callers (service_role, direct postgres/superuser, and admins via is_admin())
-- are allowed to change protected columns; everyone else has protected columns
-- silently reverted to their previous value (UPDATE) or nulled/clamped (INSERT).
-- This keeps legitimate app flows working (they use the service role or admin
-- session) while making privilege escalation impossible from a client session.
--
-- Fully idempotent. Safe to re-run. No data is destroyed.
-- Reversal notes are documented at the bottom of this file.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: is the current database role a trusted/privileged backend caller?
-- service_role  -> Supabase service key (server-side admin operations)
-- postgres / supabase_admin -> migrations & ops tooling
--
-- IMPORTANT: this function and the guard triggers below are SECURITY INVOKER
-- (the default). They MUST NOT be SECURITY DEFINER, otherwise current_user
-- would resolve to the function owner (postgres) for every caller and the
-- guards would be disabled. is_admin() remains SECURITY DEFINER (it reads
-- profiles via auth.uid(), not current_user), which is correct.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_privileged_db_caller()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_user IN ('service_role', 'supabase_admin', 'postgres', 'supabase_auth_admin')
    OR public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.is_privileged_db_caller() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_privileged_db_caller() TO authenticated;

-- ---------------------------------------------------------------------------
-- S1 — Guard profiles.role and profiles.connect_partner_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profiles_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged_db_caller() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Non-privileged callers may never change these columns on their own row.
    NEW.role := OLD.role;
    NEW.connect_partner_id := OLD.connect_partner_id;
  ELSIF TG_OP = 'INSERT' THEN
    -- Self-registration may only create buyer/seller accounts and may not
    -- pre-assign a Connect partner.
    IF NEW.role IS NULL OR NEW.role NOT IN ('buyer', 'seller') THEN
      NEW.role := 'buyer';
    END IF;
    NEW.connect_partner_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_protected_columns ON public.profiles;
CREATE TRIGGER profiles_guard_protected_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_protected_columns();

-- ---------------------------------------------------------------------------
-- S2 — Guard crm_leads.assigned_connect_id and connect_partner_id
-- (status / primary_property_id / first_login_at remain buyer-editable so the
--  inquiry & activity pipeline continues to advance lead status.)
-- ---------------------------------------------------------------------------
DO $guard$
BEGIN
  IF to_regclass('public.crm_leads') IS NULL THEN
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.guard_crm_leads_assignment_columns()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public
  AS $fn$
  BEGIN
    IF public.is_privileged_db_caller() THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      NEW.assigned_connect_id := OLD.assigned_connect_id;
      NEW.connect_partner_id := OLD.connect_partner_id;
    ELSIF TG_OP = 'INSERT' THEN
      NEW.assigned_connect_id := NULL;
      NEW.connect_partner_id := NULL;
    END IF;

    RETURN NEW;
  END;
  $fn$;

  DROP TRIGGER IF EXISTS crm_leads_guard_assignment_columns ON public.crm_leads;
  CREATE TRIGGER crm_leads_guard_assignment_columns
    BEFORE INSERT OR UPDATE ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_crm_leads_assignment_columns();
END
$guard$;

-- ---------------------------------------------------------------------------
-- Guard properties.connect_partner_id and assigned_connect_id
-- Sellers own their properties (FOR ALL RLS) and could otherwise self-assign a
-- Connect partner to hijack lead routing. Only admin/service may set these.
-- All ordinary seller edits (title, price, status, photos, ...) are untouched.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_properties_connect_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged_db_caller() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.connect_partner_id := OLD.connect_partner_id;
    NEW.assigned_connect_id := OLD.assigned_connect_id;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.connect_partner_id := NULL;
    NEW.assigned_connect_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_guard_connect_columns ON public.properties;
CREATE TRIGGER properties_guard_connect_columns
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_properties_connect_columns();

-- ---------------------------------------------------------------------------
-- S3 — Lock down crm_notifications INSERT (was WITH CHECK (true))
-- Cross-user notifications are now written through the service role only.
-- Authenticated clients may still insert notifications addressed to themselves;
-- admins retain full access; service role bypasses RLS entirely.
-- ---------------------------------------------------------------------------
DO $notif$
BEGIN
  IF to_regclass('public.crm_notifications') IS NULL THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Authenticated insert crm notifications" ON public.crm_notifications;
  CREATE POLICY "Authenticated insert crm notifications"
    ON public.crm_notifications FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
END
$notif$;

-- ---------------------------------------------------------------------------
-- S4 — Manual-vs-auto Connect assignment precedence
-- 'manual' = set by an admin; auto-propagation must never overwrite it.
-- 'auto'   = inherited from property engagement; propagation may update it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS connect_assignment_source text NOT NULL DEFAULT 'auto';

DO $src$
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
  END IF;
END
$src$;

COMMENT ON COLUMN public.profiles.connect_assignment_source IS
  'How connect_partner_id was set: manual (admin) wins over auto (propagation).';

-- The assignment-source column is protected the same way as the assignment
-- itself: only privileged callers may change it. Recreate the profiles guard to
-- also cover it (idempotent — replaces the function body defined above).
CREATE OR REPLACE FUNCTION public.guard_profiles_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged_db_caller() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.role := OLD.role;
    NEW.connect_partner_id := OLD.connect_partner_id;
    NEW.connect_assignment_source := OLD.connect_assignment_source;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role NOT IN ('buyer', 'seller') THEN
      NEW.role := 'buyer';
    END IF;
    NEW.connect_partner_id := NULL;
    NEW.connect_assignment_source := 'auto';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Connect partner property write hardening
-- The Connect partner portal UI is read-only over properties, and all
-- assignment writes happen server-side via the service role. The broad
-- "Connect update assigned properties" policy (20250704120000) would otherwise
-- let a partner mutate a seller-owned listing (incl. contact_phone, which feeds
-- the gated site-visit contact flow). Remove partner UPDATE on properties;
-- SELECT access ("Connect read assigned properties") is retained.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Connect update assigned properties" ON public.properties;

-- ---------------------------------------------------------------------------
-- Connect partner self-record hardening
-- Partners may keep editing their own company profile fields, but must never
-- change control-plane columns (status, profile_id, created_by). Only admins
-- and the service role may change those.
-- ---------------------------------------------------------------------------
DO $cp$
BEGIN
  IF to_regclass('public.connect_partners') IS NULL THEN
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.guard_connect_partners_admin_columns()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public
  AS $fn$
  BEGIN
    IF public.is_privileged_db_caller() THEN
      RETURN NEW;
    END IF;

    -- Non-privileged callers (the partner themselves) cannot self-elevate.
    NEW.status := OLD.status;
    NEW.profile_id := OLD.profile_id;
    NEW.created_by := OLD.created_by;
    RETURN NEW;
  END;
  $fn$;

  DROP TRIGGER IF EXISTS connect_partners_guard_admin_columns ON public.connect_partners;
  CREATE TRIGGER connect_partners_guard_admin_columns
    BEFORE UPDATE ON public.connect_partners
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_connect_partners_admin_columns();
END
$cp$;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- REVERSAL (manual, if ever required):
--   DROP TRIGGER IF EXISTS connect_partners_guard_admin_columns ON public.connect_partners;
--   DROP FUNCTION IF EXISTS public.guard_connect_partners_admin_columns();
--   (and to restore partner property writes, re-create the
--    "Connect update assigned properties" policy from 20250704120000)
--   DROP TRIGGER IF EXISTS profiles_guard_protected_columns ON public.profiles;
--   DROP TRIGGER IF EXISTS crm_leads_guard_assignment_columns ON public.crm_leads;
--   DROP TRIGGER IF EXISTS properties_guard_connect_columns ON public.properties;
--   DROP FUNCTION IF EXISTS public.guard_profiles_protected_columns();
--   DROP FUNCTION IF EXISTS public.guard_crm_leads_assignment_columns();
--   DROP FUNCTION IF EXISTS public.guard_properties_connect_columns();
--   DROP FUNCTION IF EXISTS public.is_privileged_db_caller();
--   -- (source columns can be left in place; they are additive and harmless)
-- =============================================================================
