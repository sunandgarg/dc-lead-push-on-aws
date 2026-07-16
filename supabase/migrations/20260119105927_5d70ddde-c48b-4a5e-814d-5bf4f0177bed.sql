-- Drop and recreate the auto_assign_admin_role function to ensure both emails are admins
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user email is one of the admin emails
  IF NEW.email IN ('sunandgarg@gmail.com', 'ceo@dekhocampus.com') THEN
    -- Auto-approve the profile
    NEW.is_approved := true;
    NEW.approved_at := now();
    
    -- Insert admin role (ignore if already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_profile_created_assign_admin ON public.profiles;
CREATE TRIGGER on_profile_created_assign_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

-- Also add an update trigger in case profile is updated
DROP TRIGGER IF EXISTS on_profile_updated_assign_admin ON public.profiles;
CREATE TRIGGER on_profile_updated_assign_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();