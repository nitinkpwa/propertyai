-- Link site visits to CRM leads and inquiries; extend activity types and seller RLS.

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL;

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS site_visits_lead_id_idx ON public.site_visits (lead_id);
CREATE INDEX IF NOT EXISTS site_visits_inquiry_id_idx ON public.site_visits (inquiry_id);

-- visit_requested = primary activity when buyer books a site visit
ALTER TABLE public.crm_lead_activities DROP CONSTRAINT IF EXISTS crm_lead_activities_activity_type_check;
ALTER TABLE public.crm_lead_activities
  ADD CONSTRAINT crm_lead_activities_activity_type_check
  CHECK (activity_type IN (
    'buyer_registered', 'buyer_first_login', 'ai_chat_started', 'ai_chat_message',
    'property_viewed', 'property_saved', 'property_unsaved', 'contact_requested',
    'inquiry_sent', 'visit_requested', 'site_visit_booked', 'site_visit_accepted',
    'site_visit_rejected', 'site_visit_rescheduled', 'site_visit_completed', 'site_visit_cancelled',
    'visit_checklist_generated', 'visit_feedback_submitted',
    'negotiation_started', 'deal_booked', 'deal_closed', 'deal_lost',
    'lead_assigned', 'lead_reassigned', 'status_changed'
  ));

-- Sellers can read CRM leads tied to site visits on their properties (not only inquiries)
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
    OR EXISTS (
      SELECT 1 FROM public.site_visits sv
      JOIN public.properties p ON p.id = sv.property_id
      WHERE sv.user_id = crm_leads.buyer_id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Sellers update related crm leads" ON public.crm_leads;
CREATE POLICY "Sellers update related crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inquiries i
      WHERE i.from_user_id = crm_leads.buyer_id AND i.seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.site_visits sv
      JOIN public.properties p ON p.id = sv.property_id
      WHERE sv.user_id = crm_leads.buyer_id
        AND p.seller_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );
