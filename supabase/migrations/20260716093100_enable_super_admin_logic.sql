-- Use the super_admin enum value after it has been committed by the previous migration.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin'::public.app_role AND role = 'super_admin'::public.app_role)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'sunandgarg@gmail.com' THEN
    NEW.role := 'super_admin';
    NEW.is_approved := true;
    NEW.approved_at := COALESCE(NEW.approved_at, now());

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF lower(NEW.email) = 'ceo@dekhocampus.com' THEN
    NEW.role := 'admin';
    NEW.is_approved := true;
    NEW.approved_at := COALESCE(NEW.approved_at, now());

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  sunand_user_id uuid;
BEGIN
  SELECT id
  INTO sunand_user_id
  FROM auth.users
  WHERE lower(email) = 'sunandgarg@gmail.com'
  LIMIT 1;

  IF sunand_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, is_approved, approved_at)
    VALUES (sunand_user_id, 'sunandgarg@gmail.com', 'sunandgarg@gmail.com', 'super_admin', true, now())
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      role = 'super_admin',
      is_approved = true,
      approved_at = COALESCE(public.profiles.approved_at, now()),
      updated_at = now();

    INSERT INTO public.user_roles (user_id, role)
    VALUES (sunand_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
