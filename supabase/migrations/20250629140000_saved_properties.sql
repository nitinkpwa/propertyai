-- saved_properties: buyer wishlist / favorites

CREATE TABLE IF NOT EXISTS public.saved_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS saved_properties_user_id_idx
  ON public.saved_properties (user_id);

CREATE INDEX IF NOT EXISTS saved_properties_user_created_idx
  ON public.saved_properties (user_id, created_at DESC);

ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saved properties" ON public.saved_properties;
CREATE POLICY "Users manage own saved properties"
  ON public.saved_properties
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
