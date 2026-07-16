-- Confirm and approve the primary admin account on the linked Supabase project.
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
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = sunand_user_id;

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
