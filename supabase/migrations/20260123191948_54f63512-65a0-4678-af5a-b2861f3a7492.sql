-- Ensure profiles row auto-approves + assigns admin role for known admin emails
-- without relying on triggers on auth schema.

-- Create trigger on public.profiles to run auto_assign_admin_role()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_profiles_auto_assign_admin_role'
  ) THEN
    CREATE TRIGGER trg_profiles_auto_assign_admin_role
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_admin_role();
  END IF;
END $$;

-- Also ensure updated_at stays correct on profile updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_profiles_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;