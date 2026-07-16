-- Add approval status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Update existing profiles to approved (for existing users)
UPDATE public.profiles SET is_approved = true WHERE is_approved IS NULL;

-- Set the two admin emails as approved
UPDATE public.profiles 
SET is_approved = true 
WHERE email IN ('sunandgarg@gmail.com', 'ceo@dekhocampus.com');

-- Insert admin roles for the specified emails (will be done when users register)
-- Create a function to auto-assign admin role to specific emails
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-approve and set admin role for specific emails
  IF NEW.email IN ('sunandgarg@gmail.com', 'ceo@dekhocampus.com') THEN
    -- Update profile to approved
    UPDATE public.profiles SET is_approved = true WHERE id = NEW.id;
    
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-assign admin on profile creation
DROP TRIGGER IF EXISTS on_profile_created_assign_admin ON public.profiles;
CREATE TRIGGER on_profile_created_assign_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Update RLS policies for profiles to allow admins to see all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Grant admin role to existing admin emails if they exist
DO $$
DECLARE
  admin_email text;
  user_uuid uuid;
BEGIN
  FOR admin_email IN SELECT unnest(ARRAY['sunandgarg@gmail.com', 'ceo@dekhocampus.com'])
  LOOP
    SELECT id INTO user_uuid FROM public.profiles WHERE email = admin_email;
    IF user_uuid IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (user_uuid, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      UPDATE public.profiles SET is_approved = true WHERE id = user_uuid;
    END IF;
  END LOOP;
END $$;