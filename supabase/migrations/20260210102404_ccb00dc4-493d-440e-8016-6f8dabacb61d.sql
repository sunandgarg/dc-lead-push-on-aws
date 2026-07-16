
-- Add user_id column to upload_batches for per-user tracking
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill existing batches: assign to the first admin user
UPDATE public.upload_batches SET user_id = '8517245a-3df3-4dc6-ac44-f5b97eb65eea' WHERE user_id IS NULL;

-- Make user_id NOT NULL going forward
ALTER TABLE public.upload_batches ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.upload_batches ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop old permissive RLS policies
DROP POLICY IF EXISTS "Auth users can view upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Auth users can insert upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Auth users can update upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Auth users can delete upload_batches" ON public.upload_batches;

-- New RLS: Users see their own batches, admins see all
CREATE POLICY "Users can view own batches" ON public.upload_batches
  FOR SELECT USING (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert own batches" ON public.upload_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batches" ON public.upload_batches
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete own batches" ON public.upload_batches
  FOR DELETE USING (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin')
  );

-- Also add user_id to leads table for per-user filtering
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill existing leads
UPDATE public.leads SET user_id = '8517245a-3df3-4dc6-ac44-f5b97eb65eea' WHERE user_id IS NULL;

ALTER TABLE public.leads ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Update leads RLS
DROP POLICY IF EXISTS "Auth users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users can delete leads" ON public.leads;

CREATE POLICY "Users can view own leads" ON public.leads
  FOR SELECT USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert leads" ON public.leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own leads" ON public.leads
  FOR UPDATE USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete own leads" ON public.leads
  FOR DELETE USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
  );

-- upload_batches was already added to supabase_realtime by the base migration.
