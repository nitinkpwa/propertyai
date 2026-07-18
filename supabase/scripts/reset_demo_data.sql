-- =============================================================================
-- AreaIQ — MVP Zero-Level Testing: reset demo / test data
-- =============================================================================
-- File: supabase/scripts/reset_demo_data.sql
--
-- SAFE TO RE-RUN (idempotent).
-- DOES NOT modify schema, RLS, functions, triggers, roles, or storage buckets.
--
-- Preserves:
--   • Exactly ONE admin profile (+ matching auth.users row)
--   • All tables / constraints / policies / functions / triggers
--   • Storage bucket definitions (objects cleared by npm run db:reset-demo-data)
--
-- Deletes:
--   • All properties (photos/amenities/documents/videos are columns/JSON on row)
--   • All buyers, sellers, connect partners
--   • Leads, inquiries, CRM, site visits, notifications, conversations,
--     saved/compared properties, property views, AI context tables
--   • Extra admin accounts beyond the single preserved admin
--
-- Usage:
--   npm run db:reset-demo-data
--   — or paste into Supabase SQL Editor and Run
-- =============================================================================

BEGIN;

-- Snapshot tables (session-local; dropped on commit)
DROP TABLE IF EXISTS _reset_demo_before;
DROP TABLE IF EXISTS _reset_demo_after;
DROP TABLE IF EXISTS _keep_admin;

CREATE TEMP TABLE _reset_demo_before (
  metric text PRIMARY KEY,
  cnt bigint NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE _reset_demo_after (
  metric text PRIMARY KEY,
  cnt bigint NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE _keep_admin (
  id uuid PRIMARY KEY
) ON COMMIT DROP;

-- ---------------------------------------------------------------------------
-- Count helper (safe when optional tables are missing)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.reset_count(p_sql text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  n bigint := 0;
BEGIN
  EXECUTE p_sql INTO n;
  RETURN COALESCE(n, 0);
EXCEPTION
  WHEN undefined_table OR undefined_column THEN
    RETURN 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- BEFORE snapshot
-- ---------------------------------------------------------------------------
INSERT INTO _reset_demo_before (metric, cnt) VALUES
  ('admins', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.profiles WHERE role = 'admin'$q$)),
  ('buyers', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.profiles WHERE role = 'buyer'$q$)),
  ('sellers', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.profiles WHERE role = 'seller'$q$)),
  ('connect_partners_profiles', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.profiles WHERE role = 'builder'$q$)),
  ('connect_partners', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.connect_partners$q$)),
  ('properties', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.properties$q$)),
  ('leads', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.crm_leads$q$)),
  ('site_visits', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.site_visits$q$)),
  ('conversations', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.conversations$q$)),
  ('notifications', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.crm_notifications$q$)),
  ('saved_properties', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.saved_properties$q$)),
  ('compared_properties', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.compared_properties$q$)),
  ('property_views', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.property_views$q$)),
  ('inquiries', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.inquiries$q$)),
  ('auth_users', pg_temp.reset_count($q$SELECT count(*)::bigint FROM auth.users$q$));

-- ---------------------------------------------------------------------------
-- Preserve exactly one admin (oldest auth.users.created_at)
-- ---------------------------------------------------------------------------
INSERT INTO _keep_admin (id)
SELECT p.id
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin'
ORDER BY u.created_at ASC NULLS LAST, p.id ASC
LIMIT 1;

INSERT INTO _keep_admin (id)
SELECT p.id
FROM public.profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM _keep_admin)
ORDER BY p.id ASC
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _keep_admin) THEN
    RAISE EXCEPTION
      'reset_demo_data aborted: no admin profile found. Create an admin before resetting.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- FK-safe deletes (skip missing tables)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'visit_context',
    'assistant_events',
    'assistant_context',
    'buyer_memory',
    'property_context',
    'conversation_context',
    'knowledge_placeholders',
    'crm_follow_ups',
    'crm_lead_activities',
    'crm_notifications',
    'connect_partner_activities',
    'site_visits',
    'inquiries',
    'conversations',
    'saved_properties',
    'compared_properties',
    'property_views',
    'crm_leads',
    'properties',
    'connect_partners'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- Detach any remaining partner pointers on non-kept profiles (column may be absent)
DO $$
BEGIN
  UPDATE public.profiles
  SET connect_partner_id = NULL
  WHERE id NOT IN (SELECT id FROM _keep_admin)
    AND connect_partner_id IS NOT NULL;
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

-- Delete non-admin profiles (and any extra admins)
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM _keep_admin);

-- Delete auth users except preserved admin
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM _keep_admin);

-- Ensure preserved admin role
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (SELECT id FROM _keep_admin);

-- ---------------------------------------------------------------------------
-- AFTER snapshot
-- ---------------------------------------------------------------------------
INSERT INTO _reset_demo_after (metric, cnt) VALUES
  ('admins', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.profiles WHERE role = 'admin'$q$)),
  ('buyers', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.profiles WHERE role = 'buyer'$q$)),
  ('sellers', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.profiles WHERE role = 'seller'$q$)),
  ('connect_partners_profiles', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.profiles WHERE role = 'builder'$q$)),
  ('connect_partners', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.connect_partners$q$)),
  ('properties', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.properties$q$)),
  ('leads', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.crm_leads$q$)),
  ('site_visits', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.site_visits$q$)),
  ('conversations', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.conversations$q$)),
  ('notifications', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.crm_notifications$q$)),
  ('saved_properties', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.saved_properties$q$)),
  ('compared_properties', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.compared_properties$q$)),
  ('property_views', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.property_views$q$)),
  ('inquiries', pg_temp.reset_count($q$SELECT count(*)::bigint FROM public.inquiries$q$)),
  ('auth_users', pg_temp.reset_count($q$SELECT count(*)::bigint FROM auth.users$q$));

-- ---------------------------------------------------------------------------
-- Verification (rolls back entire reset if any check fails)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_admins bigint;
  v_buyers bigint;
  v_sellers bigint;
  v_builders bigint;
  v_partners bigint;
  v_properties bigint;
  v_leads bigint;
  v_visits bigint;
  v_conversations bigint;
  v_notifications bigint;
  v_saved bigint;
BEGIN
  SELECT cnt INTO v_admins FROM _reset_demo_after WHERE metric = 'admins';
  SELECT cnt INTO v_buyers FROM _reset_demo_after WHERE metric = 'buyers';
  SELECT cnt INTO v_sellers FROM _reset_demo_after WHERE metric = 'sellers';
  SELECT cnt INTO v_builders FROM _reset_demo_after WHERE metric = 'connect_partners_profiles';
  SELECT cnt INTO v_partners FROM _reset_demo_after WHERE metric = 'connect_partners';
  SELECT cnt INTO v_properties FROM _reset_demo_after WHERE metric = 'properties';
  SELECT cnt INTO v_leads FROM _reset_demo_after WHERE metric = 'leads';
  SELECT cnt INTO v_visits FROM _reset_demo_after WHERE metric = 'site_visits';
  SELECT cnt INTO v_conversations FROM _reset_demo_after WHERE metric = 'conversations';
  SELECT cnt INTO v_notifications FROM _reset_demo_after WHERE metric = 'notifications';
  SELECT cnt INTO v_saved FROM _reset_demo_after WHERE metric = 'saved_properties';

  IF v_admins <> 1 THEN
    RAISE EXCEPTION 'Verification failed: expected 1 admin, found %', v_admins;
  END IF;
  IF v_buyers <> 0 THEN
    RAISE EXCEPTION 'Verification failed: expected 0 buyers, found %', v_buyers;
  END IF;
  IF v_sellers <> 0 THEN
    RAISE EXCEPTION 'Verification failed: expected 0 sellers, found %', v_sellers;
  END IF;
  IF v_builders <> 0 OR v_partners <> 0 THEN
    RAISE EXCEPTION
      'Verification failed: expected 0 connect partners, found profiles=% partners=%',
      v_builders, v_partners;
  END IF;
  IF v_properties <> 0 THEN
    RAISE EXCEPTION 'Verification failed: expected 0 properties, found %', v_properties;
  END IF;
  IF v_leads <> 0 THEN
    RAISE EXCEPTION 'Verification failed: expected 0 leads, found %', v_leads;
  END IF;
  IF v_visits <> 0 THEN
    RAISE EXCEPTION 'Verification failed: expected 0 site visits, found %', v_visits;
  END IF;
  IF v_conversations <> 0 THEN
    RAISE EXCEPTION 'Verification failed: expected 0 conversations, found %', v_conversations;
  END IF;
  IF v_notifications <> 0 THEN
    RAISE EXCEPTION 'Verification failed: expected 0 notifications, found %', v_notifications;
  END IF;
  IF v_saved <> 0 THEN
    RAISE EXCEPTION 'Verification failed: expected 0 saved properties, found %', v_saved;
  END IF;
END $$;

-- Cleanup report
SELECT
  b.metric,
  b.cnt AS before_count,
  a.cnt AS after_count,
  (b.cnt - a.cnt) AS deleted
FROM _reset_demo_before b
JOIN _reset_demo_after a USING (metric)
ORDER BY b.metric;

SELECT
  k.id AS preserved_admin_id,
  p.role AS preserved_admin_role,
  u.email AS auth_email,
  u.created_at AS auth_created_at
FROM _keep_admin k
LEFT JOIN public.profiles p ON p.id = k.id
LEFT JOIN auth.users u ON u.id = k.id;

COMMIT;
