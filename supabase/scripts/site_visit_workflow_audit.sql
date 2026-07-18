-- Paste into Supabase SQL Editor → Run
-- Adds audit columns and rescheduled status for site visits.

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS rescheduled_from text;

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS rescheduled_to text;

ALTER TABLE public.site_visits DROP CONSTRAINT IF EXISTS site_visits_status_check;

ALTER TABLE public.site_visits
  ADD CONSTRAINT site_visits_status_check
  CHECK (status IN (
    'pending_approval',
    'accepted',
    'scheduled',
    'rescheduled',
    'completed',
    'rejected',
    'cancelled'
  ));
