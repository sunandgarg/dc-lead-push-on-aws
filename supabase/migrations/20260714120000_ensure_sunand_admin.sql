-- Ensure sunandgarg@gmail.com is auto-approved and granted admin access.
-- Note: the current application schema does not define a separate "super_admin" role;
-- "admin" is the highest supported role checked by the app.

CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('sunandgarg@gmail.com', 'ceo@dekhocampus.com') THEN
    NEW.is_approved := true;
    NEW.approved_at := COALESCE(NEW.approved_at, now());

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Keep a single trigger for this function. Older migrations created several
-- equivalent triggers while the app was evolving.
DROP TRIGGER IF EXISTS on_profile_created_assign_admin ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_updated_assign_admin ON public.profiles;
DROP TRIGGER IF EXISTS trg_profiles_auto_assign_admin_role ON public.profiles;

CREATE TRIGGER trg_profiles_auto_assign_admin_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_admin_role();

-- If the Auth user was created before the schema was migrated, create the
-- corresponding app profile now so the account is immediately usable.
INSERT INTO public.profiles (id, email, full_name, role, is_approved, approved_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data ->> 'full_name', email),
  'admin',
  true,
  now()
FROM auth.users
WHERE email = 'sunandgarg@gmail.com'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = 'admin',
  is_approved = true,
  approved_at = COALESCE(public.profiles.approved_at, now()),
  updated_at = now();

DO $$
DECLARE
  sunand_user_id uuid;
BEGIN
  SELECT id
  INTO sunand_user_id
  FROM public.profiles
  WHERE email = 'sunandgarg@gmail.com'
  LIMIT 1;

  IF sunand_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      is_approved = true,
      approved_at = COALESCE(approved_at, now()),
      role = 'admin',
      updated_at = now()
    WHERE id = sunand_user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (sunand_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
