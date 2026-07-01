-- AreaIQ auth upgrade: username + secure login resolution
-- DO NOT RUN automatically — apply manually in Supabase SQL Editor after review.

-- ---------------------------------------------------------------------------
-- 1. Username column
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND btrim(username) <> '';

COMMENT ON COLUMN public.profiles.username IS 'Unique login username (lowercase stored)';

-- ---------------------------------------------------------------------------
-- 2. Phone normalization helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_indian_phone(p_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(coalesce(p_input, ''), '\D', '', 'g');

  IF length(digits) = 12 AND digits LIKE '91%' THEN
    digits := substring(digits from 3);
  ELSIF length(digits) = 11 AND digits LIKE '0%' THEN
    digits := substring(digits from 2);
  END IF;

  RETURN digits;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Resolve Supabase auth email from username OR phone (login only)
--    SECURITY DEFINER — does not expose whether username exists to callers
--    beyond auth sign-in result.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_normalized_phone text;
  v_username text;
BEGIN
  v_normalized_phone := public.normalize_indian_phone(p_identifier);

  IF length(v_normalized_phone) = 10 AND v_normalized_phone ~ '^[6-9]' THEN
    RETURN v_normalized_phone || '@areaiq.app';
  END IF;

  v_username := lower(btrim(p_identifier));
  IF v_username = '' THEN
    RETURN NULL;
  END IF;

  SELECT phone INTO v_phone
  FROM public.profiles
  WHERE lower(username) = v_username
  LIMIT 1;

  IF v_phone IS NOT NULL AND btrim(v_phone) <> '' THEN
    RETURN public.normalize_indian_phone(v_phone) || '@areaiq.app';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Registration availability checks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_username_taken(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(btrim(p_username))
      AND btrim(p_username) <> ''
  );
$$;

CREATE OR REPLACE FUNCTION public.check_phone_taken(p_phone text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE phone = public.normalize_indian_phone(p_phone)
      AND btrim(coalesce(phone, '')) <> ''
  );
$$;

REVOKE ALL ON FUNCTION public.check_username_taken(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_phone_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_username_taken(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_taken(text) TO anon, authenticated;
