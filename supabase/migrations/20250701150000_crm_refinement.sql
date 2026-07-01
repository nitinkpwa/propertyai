-- AreaIQ CRM Refinement: buyer profile prefs + site visit approval workflow
-- Idempotent — safe to run on live Supabase even if partial schema exists.

-- ---------------------------------------------------------------------------
-- Buyer preference columns on profiles (fix budget_max / preferred_* errors)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS budget_min integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS budget_max integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_locations text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_property_types text[] DEFAULT '{}';

COMMENT ON COLUMN public.profiles.preferred_locations IS 'Buyer preferred Tricity areas';
COMMENT ON COLUMN public.profiles.preferred_property_types IS 'Buyer preferred property type slugs';

-- ---------------------------------------------------------------------------
-- site_visits — approval workflow + checklist + feedback
-- ---------------------------------------------------------------------------
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS visit_location text;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS feedback jsonb;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Migrate legacy statuses (drop constraint first so new values can be written)
ALTER TABLE public.site_visits DROP CONSTRAINT IF EXISTS site_visits_status_check;

UPDATE public.site_visits SET status = 'pending_approval'
  WHERE status IN ('scheduled') AND accepted_at IS NULL;

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

CREATE INDEX IF NOT EXISTS site_visits_status_idx ON public.site_visits (status);
CREATE INDEX IF NOT EXISTS site_visits_property_status_idx ON public.site_visits (property_id, status);

-- Connect partners: manage visits on assigned buyer leads (via property or assignment)
DROP POLICY IF EXISTS "Connect update assigned buyer visits" ON public.site_visits;
CREATE POLICY "Connect update assigned buyer visits"
  ON public.site_visits FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.buyer_id = site_visits.user_id
        AND l.assigned_connect_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = site_visits.property_id AND p.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Connect read assigned buyer visits" ON public.site_visits;
CREATE POLICY "Connect read assigned buyer visits"
  ON public.site_visits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.buyer_id = site_visits.user_id
        AND l.assigned_connect_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = site_visits.property_id AND p.seller_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Extend CRM activity types for visit workflow
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Extend notification types
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_notifications DROP CONSTRAINT IF EXISTS crm_notifications_type_check;
ALTER TABLE public.crm_notifications
  ADD CONSTRAINT crm_notifications_type_check
  CHECK (type IN (
    'new_inquiry', 'property_saved', 'site_visit_booked', 'site_visit_accepted',
    'site_visit_rejected', 'lead_assigned', 'lead_reassigned', 'new_lead', 'general'
  ));

-- Admin unrestricted CRM read (ensure master never loses visibility)
DROP POLICY IF EXISTS "Admins read all crm leads bypass" ON public.crm_leads;
-- (Admins manage all crm leads policy from foundation migration covers this)

DROP POLICY IF EXISTS "Buyers read own site visit contact fields" ON public.site_visits;
-- Buyers already read own visits; contact revealed in app layer by status
