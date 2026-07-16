-- Add processing control columns to upload_batches
ALTER TABLE public.upload_batches 
ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS processed_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_lead_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message text;

-- Create university_api_keys table for external API access
CREATE TABLE IF NOT EXISTS public.university_api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  api_key text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  name text NOT NULL DEFAULT 'Default API Key',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  request_count integer DEFAULT 0
);

-- Enable RLS on university_api_keys
ALTER TABLE public.university_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for university_api_keys
CREATE POLICY "Allow public read on university_api_keys" ON public.university_api_keys FOR SELECT USING (true);
CREATE POLICY "Allow public insert on university_api_keys" ON public.university_api_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on university_api_keys" ON public.university_api_keys FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on university_api_keys" ON public.university_api_keys FOR DELETE USING (true);

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'admin',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email),
    COALESCE(new.raw_user_meta_data ->> 'role', 'admin')
  );
  RETURN new;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for batches for live progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
