CREATE TABLE IF NOT EXISTS public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  api_key text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  routing_mode text NOT NULL DEFAULT 'universities', -- 'universities' | 'preset'
  university_ids uuid[] NOT NULL DEFAULT '{}',
  preset_id uuid REFERENCES public.multi_push_presets(id) ON DELETE SET NULL,
  default_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  submissions_count integer NOT NULL DEFAULT 0,
  last_submission_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_api_key ON public.landing_pages(api_key);
CREATE INDEX IF NOT EXISTS idx_landing_pages_is_active ON public.landing_pages(is_active);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can manage landing_pages"
ON public.landing_pages
FOR ALL
TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Counter increment helper used by the receive-lead edge function
CREATE OR REPLACE FUNCTION public.increment_landing_page_submission(lp_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.landing_pages
  SET submissions_count = submissions_count + 1,
      last_submission_at = now()
  WHERE id = lp_id;
END;
$$;