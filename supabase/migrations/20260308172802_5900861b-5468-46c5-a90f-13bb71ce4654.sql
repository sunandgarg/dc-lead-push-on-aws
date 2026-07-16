
-- Create team_members table if not exists
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  department TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_leads INTEGER NOT NULL DEFAULT 100,
  current_lead_count INTEGER NOT NULL DEFAULT 0,
  languages TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Authenticated users can manage team_members') THEN
    CREATE POLICY "Authenticated users can manage team_members" ON public.team_members
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END$$;
