-- Resolve login identifier → Supabase Auth email (phone@areaiq.app).
-- Also maps optional profiles.contact_email back to the phone-based auth mailbox.
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
  v_email text;
BEGIN
  v_email := lower(btrim(p_identifier));

  -- Synthetic AreaIQ auth mailbox — use as-is
  IF v_email ~ '^[6-9][0-9]{9}@areaiq\.app$' THEN
    RETURN v_email;
  END IF;

  -- Optional buyer contact email → auth mailbox via phone
  IF position('@' in v_email) > 0 THEN
    SELECT phone INTO v_phone
    FROM public.profiles
    WHERE lower(btrim(contact_email)) = v_email
    LIMIT 1;

    IF v_phone IS NOT NULL AND btrim(v_phone) <> '' THEN
      RETURN public.normalize_indian_phone(v_phone) || '@areaiq.app';
    END IF;

    -- Unknown personal email — do not treat as Auth email
    RETURN NULL;
  END IF;

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
