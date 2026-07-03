-- Master → Connect property assignment
-- Adds assigned_connect_id on properties for operating Connect partner routing.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS assigned_connect_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS properties_assigned_connect_idx
  ON public.properties (assigned_connect_id)
  WHERE assigned_connect_id IS NOT NULL;

-- Connect partners can read properties assigned to them
DROP POLICY IF EXISTS "Connect read assigned properties" ON public.properties;
CREATE POLICY "Connect read assigned properties"
  ON public.properties FOR SELECT TO authenticated
  USING (auth.uid() = assigned_connect_id);

-- Connect partners can read inquiries on assigned properties
DROP POLICY IF EXISTS "Connect read assigned property inquiries" ON public.inquiries;
CREATE POLICY "Connect read assigned property inquiries"
  ON public.inquiries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = inquiries.property_id
        AND p.assigned_connect_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Connect partners can read site visits on assigned properties
DROP POLICY IF EXISTS "Connect read assigned property site visits" ON public.site_visits;
CREATE POLICY "Connect read assigned property site visits"
  ON public.site_visits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = site_visits.property_id
        AND p.assigned_connect_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Connect partners can update site visits on assigned properties
DROP POLICY IF EXISTS "Connect manage assigned property site visits" ON public.site_visits;
CREATE POLICY "Connect manage assigned property site visits"
  ON public.site_visits FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = site_visits.property_id
        AND p.assigned_connect_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- Extend notification types for property assignment events
ALTER TABLE public.crm_notifications DROP CONSTRAINT IF EXISTS crm_notifications_type_check;
ALTER TABLE public.crm_notifications
  ADD CONSTRAINT crm_notifications_type_check
  CHECK (type IN (
    'new_inquiry', 'property_saved', 'site_visit_booked', 'site_visit_accepted',
    'site_visit_rejected', 'lead_assigned', 'lead_reassigned', 'new_lead', 'general',
    'property_assigned', 'property_reassigned'
  ));
