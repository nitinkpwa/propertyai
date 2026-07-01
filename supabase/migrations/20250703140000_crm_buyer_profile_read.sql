-- Extend buyer profile read access for CRM embeds (seller leads, connect assignments)

DROP POLICY IF EXISTS "Sellers read buyer profiles on own leads" ON public.profiles;

CREATE POLICY "Sellers read buyer profiles on own leads"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.inquiries i
      WHERE i.from_user_id = profiles.id
        AND i.seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.site_visits sv
      INNER JOIN public.properties p ON p.id = sv.property_id
      WHERE sv.user_id = profiles.id
        AND p.seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.crm_leads l
      INNER JOIN public.crm_lead_activities a ON a.lead_id = l.id
      INNER JOIN public.properties p ON p.id = a.property_id
      WHERE l.buyer_id = profiles.id
        AND p.seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.crm_leads l
      WHERE l.buyer_id = profiles.id
        AND l.assigned_connect_id = auth.uid()
    )
  );
