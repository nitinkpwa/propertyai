-- Site visit booking hardening (idempotent)
-- Ensures status values, activity types, and buyer DELETE for rollback safety.

-- 1) Status constraint includes pending_approval + workflow statuses
ALTER TABLE public.site_visits DROP CONSTRAINT IF EXISTS site_visits_status_check;
ALTER TABLE public.site_visits
  ADD CONSTRAINT site_visits_status_check
  CHECK (status IN (
    'pending_approval',
    'accepted',
    'scheduled',
    'confirmed',
    'rescheduled',
    'completed',
    'rejected',
    'cancelled'
  ));

-- 2) Optional CRM columns (safe if already present)
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS inquiry_id uuid;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS connect_partner_id uuid;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS builder_name text;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3) Activity types used by booking
ALTER TABLE public.crm_lead_activities DROP CONSTRAINT IF EXISTS crm_lead_activities_activity_type_check;
ALTER TABLE public.crm_lead_activities
  ADD CONSTRAINT crm_lead_activities_activity_type_check
  CHECK (activity_type IN (
    'buyer_registered', 'buyer_first_login', 'ai_chat_started', 'ai_chat_message',
    'property_viewed', 'property_saved', 'property_unsaved', 'property_compared',
    'contact_requested', 'inquiry_sent',
    'visit_requested', 'site_visit_booked', 'site_visit_accepted', 'site_visit_rejected',
    'site_visit_rescheduled', 'site_visit_completed', 'site_visit_cancelled',
    'visit_checklist_generated', 'visit_feedback_submitted', 'visit_notes_saved',
    'follow_up_scheduled',
    'negotiation_started', 'deal_booked', 'deal_closed', 'deal_lost',
    'lead_assigned', 'lead_reassigned', 'status_changed'
  ));

-- 4) Buyer can delete own visits (needed if a failed secondary step rolls back)
DROP POLICY IF EXISTS "Users delete own site visits" ON public.site_visits;
CREATE POLICY "Users delete own site visits"
  ON public.site_visits
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5) Ensure site_visit_enabled exists with safe default
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS site_visit_enabled boolean DEFAULT true;

COMMENT ON CONSTRAINT site_visits_status_check ON public.site_visits IS
  'AreaIQ visit workflow statuses — pending_approval is the buyer booking default';
