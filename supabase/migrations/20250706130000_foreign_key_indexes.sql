-- =============================================================================
-- AreaIQ — Missing foreign-key indexes (2026-07-06)
-- =============================================================================
-- Additive, idempotent, non-destructive. Adds covering indexes for foreign-key
-- columns that were previously unindexed, which speeds up joins, cascade
-- checks, and the admin/seller/connect dashboard queries that filter on them.
-- Every statement uses IF NOT EXISTS and is safe to re-run.
-- Reversal: DROP INDEX IF EXISTS <name>; for each index below.
-- =============================================================================

-- Buyer dashboard join tables (filtered/joined by property_id)
CREATE INDEX IF NOT EXISTS saved_properties_property_id_idx
  ON public.saved_properties (property_id);

CREATE INDEX IF NOT EXISTS compared_properties_property_id_idx
  ON public.compared_properties (property_id);

CREATE INDEX IF NOT EXISTS property_views_property_id_idx
  ON public.property_views (property_id);

-- inquiries — joined by property, buyer, and seller across CRM/seller flows
DO $$
BEGIN
  IF to_regclass('public.inquiries') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS inquiries_property_id_idx
      ON public.inquiries (property_id);
    CREATE INDEX IF NOT EXISTS inquiries_from_user_id_idx
      ON public.inquiries (from_user_id);
    CREATE INDEX IF NOT EXISTS inquiries_seller_id_idx
      ON public.inquiries (seller_id);
  END IF;
END $$;

-- crm_lead_activities — secondary FK lookups
DO $$
BEGIN
  IF to_regclass('public.crm_lead_activities') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS crm_lead_activities_inquiry_id_idx
      ON public.crm_lead_activities (inquiry_id)
      WHERE inquiry_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS crm_lead_activities_conversation_id_idx
      ON public.crm_lead_activities (conversation_id)
      WHERE conversation_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS crm_lead_activities_site_visit_id_idx
      ON public.crm_lead_activities (site_visit_id)
      WHERE site_visit_id IS NOT NULL;
  END IF;
END $$;

-- connect_partner_activities.actor_id
DO $$
BEGIN
  IF to_regclass('public.connect_partner_activities') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS connect_partner_activities_actor_idx
      ON public.connect_partner_activities (actor_id)
      WHERE actor_id IS NOT NULL;
  END IF;
END $$;

-- site_visits.accepted_by
DO $$
BEGIN
  IF to_regclass('public.site_visits') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS site_visits_accepted_by_idx
      ON public.site_visits (accepted_by)
      WHERE accepted_by IS NOT NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
