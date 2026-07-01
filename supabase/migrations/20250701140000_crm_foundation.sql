-- AreaIQ CRM Foundation (Phase 1)
-- Unified lead per buyer + activity timeline + notifications.
-- Reuses existing: profiles, properties, inquiries, site_visits, conversations.

-- ---------------------------------------------------------------------------
-- crm_leads — one lead record per buyer (never duplicate)
-- Why: inquiries are per-property; CRM needs a single buyer journey anchor.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN (
      'new', 'ai_qualified', 'interested', 'property_suggested', 'property_saved',
      'inquiry_sent', 'visit_scheduled', 'visited', 'negotiation', 'booked',
      'completed', 'lost'
    )),
  assigned_connect_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  primary_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  first_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id)
);

CREATE INDEX IF NOT EXISTS crm_leads_buyer_id_idx ON public.crm_leads (buyer_id);
CREATE INDEX IF NOT EXISTS crm_leads_assigned_connect_idx ON public.crm_leads (assigned_connect_id);
CREATE INDEX IF NOT EXISTS crm_leads_status_idx ON public.crm_leads (status);

-- ---------------------------------------------------------------------------
-- crm_lead_activities — chronological timeline per lead
-- Why: single ordered feed for all buyer touchpoints across the platform.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL
    CHECK (activity_type IN (
      'buyer_registered', 'buyer_first_login', 'ai_chat_started', 'ai_chat_message',
      'property_viewed', 'property_saved', 'property_unsaved', 'contact_requested',
      'inquiry_sent', 'site_visit_booked', 'site_visit_completed', 'site_visit_cancelled',
      'negotiation_started', 'deal_booked', 'deal_closed', 'deal_lost',
      'lead_assigned', 'lead_reassigned', 'status_changed'
    )),
  title text NOT NULL,
  description text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  site_visit_id uuid REFERENCES public.site_visits(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_lead_activities_lead_id_idx
  ON public.crm_lead_activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_lead_activities_property_id_idx
  ON public.crm_lead_activities (property_id);

-- ---------------------------------------------------------------------------
-- crm_notifications — persistent alerts for sellers, connect, admin, buyers
-- Why: foundation for cross-role event delivery (Phase 2: WhatsApp, etc.).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN (
      'new_inquiry', 'property_saved', 'site_visit_booked',
      'lead_assigned', 'lead_reassigned', 'new_lead', 'general'
    )),
  title text NOT NULL,
  message text NOT NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_notifications_user_id_idx
  ON public.crm_notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger for crm_leads
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_crm_leads_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_leads_updated_at ON public.crm_leads;
CREATE TRIGGER crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_crm_leads_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

-- Buyers: own lead
DROP POLICY IF EXISTS "Buyers read own crm lead" ON public.crm_leads;
CREATE POLICY "Buyers read own crm lead"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers insert own crm lead" ON public.crm_leads;
CREATE POLICY "Buyers insert own crm lead"
  ON public.crm_leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers update own crm lead" ON public.crm_leads;
CREATE POLICY "Buyers update own crm lead"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Sellers: leads with activity on their properties
DROP POLICY IF EXISTS "Sellers read related crm leads" ON public.crm_leads;
CREATE POLICY "Sellers read related crm leads"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_lead_activities a
      JOIN public.properties p ON p.id = a.property_id
      WHERE a.lead_id = crm_leads.id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.inquiries i
      WHERE i.from_user_id = crm_leads.buyer_id
        AND i.seller_id = auth.uid()
    )
  );

-- Connect partners: only assigned leads
DROP POLICY IF EXISTS "Connect read assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect read assigned crm leads"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (auth.uid() = assigned_connect_id);

-- Admin: full access
DROP POLICY IF EXISTS "Admins manage all crm leads" ON public.crm_leads;
CREATE POLICY "Admins manage all crm leads"
  ON public.crm_leads FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Activities: buyer reads own lead activities
DROP POLICY IF EXISTS "Buyers read own lead activities" ON public.crm_lead_activities;
CREATE POLICY "Buyers read own lead activities"
  ON public.crm_lead_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.id = crm_lead_activities.lead_id AND l.buyer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Buyers insert own lead activities" ON public.crm_lead_activities;
CREATE POLICY "Buyers insert own lead activities"
  ON public.crm_lead_activities FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.id = crm_lead_activities.lead_id AND l.buyer_id = auth.uid()
    )
  );

-- Sellers read activities on their properties
DROP POLICY IF EXISTS "Sellers read related lead activities" ON public.crm_lead_activities;
CREATE POLICY "Sellers read related lead activities"
  ON public.crm_lead_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = crm_lead_activities.property_id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.crm_leads l
      JOIN public.inquiries i ON i.from_user_id = l.buyer_id
      WHERE l.id = crm_lead_activities.lead_id AND i.seller_id = auth.uid()
    )
  );

-- Connect: assigned lead activities only
DROP POLICY IF EXISTS "Connect read assigned lead activities" ON public.crm_lead_activities;
CREATE POLICY "Connect read assigned lead activities"
  ON public.crm_lead_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.id = crm_lead_activities.lead_id
        AND l.assigned_connect_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage all lead activities" ON public.crm_lead_activities;
CREATE POLICY "Admins manage all lead activities"
  ON public.crm_lead_activities FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Notifications
DROP POLICY IF EXISTS "Users read own crm notifications" ON public.crm_notifications;
CREATE POLICY "Users read own crm notifications"
  ON public.crm_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own crm notifications" ON public.crm_notifications;
CREATE POLICY "Users update own crm notifications"
  ON public.crm_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated insert crm notifications" ON public.crm_notifications;
CREATE POLICY "Authenticated insert crm notifications"
  ON public.crm_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage all crm notifications" ON public.crm_notifications;
CREATE POLICY "Admins manage all crm notifications"
  ON public.crm_notifications FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Sellers update leads they own inquiries for (status only via app logic)
DROP POLICY IF EXISTS "Sellers update related crm leads" ON public.crm_leads;
CREATE POLICY "Sellers update related crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inquiries i
      WHERE i.from_user_id = crm_leads.buyer_id AND i.seller_id = auth.uid()
    )
  );

-- Connect update assigned leads
DROP POLICY IF EXISTS "Connect update assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect update assigned crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_connect_id);
