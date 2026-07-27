-- Keep public.profiles in sync with Supabase Auth users.
-- Safe to run more than once: existing profile rows are never overwritten.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_profile_for_new_auth_user ON auth.users;
CREATE TRIGGER create_profile_for_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_auth_user();

-- Repair only missing profiles for users that already exist in this same project.
INSERT INTO public.profiles (id, full_name)
SELECT
  u.id,
  NULLIF(BTRIM(COALESCE(u.raw_user_meta_data ->> 'full_name', '')), '')
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL;

COMMIT;