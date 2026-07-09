-- AreaIQ CRM Workflow Integration
-- Lead intelligence, follow-ups, visit context, AI-ready architecture tables.
-- Idempotent — safe to run on live Supabase.

-- ---------------------------------------------------------------------------
-- crm_leads — intelligence & follow-up columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS lead_temperature text DEFAULT 'cold'
  CHECK (lead_temperature IN ('cold', 'warm', 'hot'));
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS visit_score integer DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS interest_score integer DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS budget_match_score integer DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS conversion_probability integer DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS follow_up_date timestamptz;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS follow_up_priority text DEFAULT 'normal'
  CHECK (follow_up_priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS last_call_at timestamptz;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS last_whatsapp_at timestamptz;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS last_email_at timestamptz;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS crm_leads_follow_up_date_idx
  ON public.crm_leads (follow_up_date)
  WHERE follow_up_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- crm_follow_ups — scheduled partner follow-up tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.connect_partners(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_follow_ups_lead_id_idx ON public.crm_follow_ups (lead_id);
CREATE INDEX IF NOT EXISTS crm_follow_ups_due_at_idx ON public.crm_follow_ups (due_at, status);

ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connect partners manage own follow ups" ON public.crm_follow_ups;
CREATE POLICY "Connect partners manage own follow ups"
  ON public.crm_follow_ups FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l
      JOIN public.connect_partners cp ON cp.id = l.connect_partner_id
      WHERE l.id = crm_follow_ups.lead_id AND cp.profile_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crm_leads l
      JOIN public.connect_partners cp ON cp.id = l.connect_partner_id
      WHERE l.id = crm_follow_ups.lead_id AND cp.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Buyers read follow ups on own leads" ON public.crm_follow_ups;
CREATE POLICY "Buyers read follow ups on own leads"
  ON public.crm_follow_ups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.id = crm_follow_ups.lead_id AND l.buyer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- site_visits — visit assistant context (before / during / after)
-- ---------------------------------------------------------------------------
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS visit_context jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.site_visits ADD COLUMN IF NOT EXISTS during_visit_notes jsonb DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Extend CRM activity types
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_lead_activities DROP CONSTRAINT IF EXISTS crm_lead_activities_activity_type_check;
ALTER TABLE public.crm_lead_activities
  ADD CONSTRAINT crm_lead_activities_activity_type_check
  CHECK (activity_type IN (
    'buyer_registered', 'buyer_first_login', 'ai_chat_started', 'ai_chat_message',
    'property_viewed', 'property_saved', 'property_unsaved', 'property_compared',
    'contact_requested', 'inquiry_sent', 'visit_requested', 'site_visit_booked',
    'site_visit_accepted', 'site_visit_rejected', 'site_visit_rescheduled',
    'site_visit_completed', 'site_visit_cancelled', 'visit_checklist_generated',
    'visit_feedback_submitted', 'visit_notes_saved', 'negotiation_started',
    'deal_booked', 'deal_closed', 'deal_lost', 'lead_assigned', 'lead_reassigned',
    'status_changed', 'partner_call', 'partner_whatsapp', 'partner_email',
    'follow_up_scheduled', 'follow_up_completed', 'document_uploaded', 'reminder_sent'
  ));

-- ---------------------------------------------------------------------------
-- Extend notification types
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_notifications DROP CONSTRAINT IF EXISTS crm_notifications_type_check;
ALTER TABLE public.crm_notifications
  ADD CONSTRAINT crm_notifications_type_check
  CHECK (type IN (
    'new_inquiry', 'property_saved', 'property_compared', 'site_visit_booked',
    'site_visit_accepted', 'site_visit_rejected', 'site_visit_completed',
    'visit_feedback_submitted', 'lead_assigned', 'lead_reassigned', 'new_lead',
    'general', 'status_changed', 'follow_up_due', 'negotiation_started',
    'booking_completed', 'property_updated', 'reminder'
  ));

-- ---------------------------------------------------------------------------
-- AI-ready architecture tables (placeholders for future LLM integration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  connect_partner_id uuid REFERENCES public.connect_partners(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  intent text,
  handler text,
  tokens_used integer,
  latency_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_events_user_id_idx ON public.assistant_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_events_conversation_id_idx ON public.assistant_events (conversation_id);

CREATE TABLE IF NOT EXISTS public.assistant_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  context_type text NOT NULL DEFAULT 'session',
  context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, context_type)
);

CREATE TABLE IF NOT EXISTS public.visit_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_visit_id uuid NOT NULL REFERENCES public.site_visits(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  phase text NOT NULL CHECK (phase IN ('before', 'during', 'after')),
  context_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_visit_id, phase)
);

CREATE TABLE IF NOT EXISTS public.buyer_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  memory_key text NOT NULL,
  memory_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, memory_key)
);

CREATE TABLE IF NOT EXISTS public.property_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  context_key text NOT NULL,
  context_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, context_key)
);

CREATE TABLE IF NOT EXISTS public.conversation_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  context_key text NOT NULL,
  context_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, context_key)
);

CREATE TABLE IF NOT EXISTS public.knowledge_placeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  topic text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Stamp connect_partner_id on assistant_events from property
CREATE OR REPLACE FUNCTION public.stamp_assistant_event_partner()
RETURNS trigger AS $$
BEGIN
  IF NEW.property_id IS NOT NULL AND NEW.connect_partner_id IS NULL THEN
    SELECT connect_partner_id INTO NEW.connect_partner_id
    FROM public.properties WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assistant_events_stamp_partner ON public.assistant_events;
CREATE TRIGGER assistant_events_stamp_partner
  BEFORE INSERT ON public.assistant_events
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_assistant_event_partner();

-- RLS for AI tables (admin + own user)
ALTER TABLE public.assistant_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_placeholders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own assistant events" ON public.assistant_events;
CREATE POLICY "Users read own assistant events"
  ON public.assistant_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own assistant context" ON public.assistant_context;
CREATE POLICY "Users manage own assistant context"
  ON public.assistant_context FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Buyers manage own visit context" ON public.visit_context;
CREATE POLICY "Buyers manage own visit context"
  ON public.visit_context FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_visits sv
      WHERE sv.id = visit_context.site_visit_id AND sv.user_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_visits sv
      WHERE sv.id = visit_context.site_visit_id AND sv.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Buyers manage own memory" ON public.buyer_memory;
CREATE POLICY "Buyers manage own memory"
  ON public.buyer_memory FOR ALL TO authenticated
  USING (buyer_id = auth.uid() OR public.is_admin())
  WITH CHECK (buyer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated read property context" ON public.property_context;
CREATE POLICY "Authenticated read property context"
  ON public.property_context FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage property context" ON public.property_context;
CREATE POLICY "Admins manage property context"
  ON public.property_context FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read own conversation context" ON public.conversation_context;
CREATE POLICY "Users read own conversation context"
  ON public.conversation_context FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_context.conversation_id AND c.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins read knowledge placeholders" ON public.knowledge_placeholders;
CREATE POLICY "Admins read knowledge placeholders"
  ON public.knowledge_placeholders FOR SELECT TO authenticated
  USING (public.is_admin());
