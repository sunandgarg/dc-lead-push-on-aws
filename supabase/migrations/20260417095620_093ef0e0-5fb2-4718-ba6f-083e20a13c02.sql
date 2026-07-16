
-- Multi-Push presets: saved groups of universities (e.g. "Top 5")
CREATE TABLE public.multi_push_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  university_ids UUID[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.multi_push_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can manage multi_push_presets"
  ON public.multi_push_presets FOR ALL
  TO authenticated
  USING (is_user_approved(auth.uid()))
  WITH CHECK (is_user_approved(auth.uid()));

CREATE TRIGGER trg_multi_push_presets_updated
  BEFORE UPDATE ON public.multi_push_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-university default field values for Multi-Push (course, specialization, campus, etc.)
CREATE TABLE public.multi_push_university_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_id UUID NOT NULL UNIQUE,
  defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.multi_push_university_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can manage multi_push_university_defaults"
  ON public.multi_push_university_defaults FOR ALL
  TO authenticated
  USING (is_user_approved(auth.uid()))
  WITH CHECK (is_user_approved(auth.uid()));

CREATE TRIGGER trg_multi_push_uni_defaults_updated
  BEFORE UPDATE ON public.multi_push_university_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mp_uni_defaults_uni ON public.multi_push_university_defaults(university_id);
