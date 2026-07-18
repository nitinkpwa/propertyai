-- Ensure sellers UPDATE policy has WITH CHECK so ownership cannot be reassigned.
-- Idempotent.

DROP POLICY IF EXISTS "Sellers can update own properties" ON public.properties;
CREATE POLICY "Sellers can update own properties"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Keep delete ownership-scoped (explicit TO authenticated)
DROP POLICY IF EXISTS "Sellers can delete own properties" ON public.properties;
CREATE POLICY "Sellers can delete own properties"
  ON public.properties
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);
