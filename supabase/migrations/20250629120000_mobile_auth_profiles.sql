-- Mobile auth: ensure profiles stores phone and supports role-based accounts.
-- Run in Supabase SQL Editor if not already applied.

-- Phone column (10-digit normalized mobile)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- Optional: prevent duplicate registrations on the same mobile
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';

-- Ensure role accepts buyer, seller, builder (adjust if your enum differs)
-- Example if using a check constraint:
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
--   CHECK (role IN ('buyer', 'seller', 'broker', 'builder', 'admin'));

COMMENT ON COLUMN public.profiles.phone IS 'Normalized 10-digit mobile number for login';
COMMENT ON COLUMN public.profiles.email IS 'Internal auth email: {mobile}@areaiq.app';
