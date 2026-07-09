-- Connect partner ownership propagation: site_visits column, RLS alignment, historical backfill

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS connect_partner_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'site_visits_connect_partner_id_fkey'
  ) THEN
    ALTER TABLE public.site_visits
      ADD CONSTRAINT site_visits_connect_partner_id_fkey
      FOREIGN KEY (connect_partner_id)
      REFERENCES public.connect_partners(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS site_visits_connect_partner_idx
  ON public.site_visits (connect_partner_id)
  WHERE connect_partner_id IS NOT NULL;

-- Align CRM lead visibility with connect_partner_id (in addition to assigned_connect_id)
DROP POLICY IF EXISTS "Connect read assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect read assigned crm leads"
  ON public.crm_leads FOR SELECT TO authenticated
  USING (
    auth.uid() = assigned_connect_id
    OR connect_partner_id = public.get_user_connect_partner_id()
  );

DROP POLICY IF EXISTS "Connect update assigned crm leads" ON public.crm_leads;
CREATE POLICY "Connect update assigned crm leads"
  ON public.crm_leads FOR UPDATE TO authenticated
  USING (
    auth.uid() = assigned_connect_id
    OR connect_partner_id = public.get_user_connect_partner_id()
  )
  WITH CHECK (
    auth.uid() = assigned_connect_id
    OR connect_partner_id = public.get_user_connect_partner_id()
  );

-- Site visits: connect partner can read/update assigned visits
DROP POLICY IF EXISTS "Connect read assigned site visits" ON public.site_visits;
CREATE POLICY "Connect read assigned site visits"
  ON public.site_visits FOR SELECT TO authenticated
  USING (
    connect_partner_id = public.get_user_connect_partner_id()
    OR EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.id = site_visits.lead_id
        AND (
          l.assigned_connect_id = auth.uid()
          OR l.connect_partner_id = public.get_user_connect_partner_id()
        )
    )
  );

DROP POLICY IF EXISTS "Connect update assigned site visits" ON public.site_visits;
CREATE POLICY "Connect update assigned site visits"
  ON public.site_visits FOR UPDATE TO authenticated
  USING (
    connect_partner_id = public.get_user_connect_partner_id()
    OR EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.id = site_visits.lead_id
        AND (
          l.assigned_connect_id = auth.uid()
          OR l.connect_partner_id = public.get_user_connect_partner_id()
        )
    )
  )
  WITH CHECK (
    connect_partner_id = public.get_user_connect_partner_id()
    OR EXISTS (
      SELECT 1 FROM public.crm_leads l
      WHERE l.id = site_visits.lead_id
        AND (
          l.assigned_connect_id = auth.uid()
          OR l.connect_partner_id = public.get_user_connect_partner_id()
        )
    )
  );

-- Backfill buyer ownership from property enquiries
UPDATE public.profiles buyer
SET connect_partner_id = p.connect_partner_id
FROM public.inquiries i
JOIN public.properties p ON p.id = i.property_id
WHERE buyer.id = i.from_user_id
  AND buyer.role = 'buyer'
  AND p.connect_partner_id IS NOT NULL
  AND (buyer.connect_partner_id IS NULL OR buyer.connect_partner_id <> p.connect_partner_id);

UPDATE public.crm_leads l
SET
  connect_partner_id = p.connect_partner_id,
  assigned_connect_id = COALESCE(l.assigned_connect_id, p.assigned_connect_id, cp.profile_id),
  primary_property_id = COALESCE(l.primary_property_id, i.property_id)
FROM public.inquiries i
JOIN public.properties p ON p.id = i.property_id
LEFT JOIN public.connect_partners cp ON cp.id = p.connect_partner_id
WHERE l.buyer_id = i.from_user_id
  AND p.connect_partner_id IS NOT NULL
  AND (l.connect_partner_id IS NULL OR l.connect_partner_id <> p.connect_partner_id);

UPDATE public.site_visits sv
SET connect_partner_id = p.connect_partner_id
FROM public.properties p
WHERE sv.property_id = p.id
  AND p.connect_partner_id IS NOT NULL
  AND sv.connect_partner_id IS NULL;
