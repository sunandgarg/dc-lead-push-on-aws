-- Marketing Automation Tables

-- Drip Campaign Sequences
CREATE TABLE IF NOT EXISTS public.marketing_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- manual, lead_created, form_submitted, stage_change, score_change
  trigger_config JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
  entry_conditions JSONB DEFAULT '{}'::jsonb,
  exit_conditions JSONB DEFAULT '{}'::jsonb,
  goal_config JSONB DEFAULT '{}'::jsonb,
  enrolled_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  goal_achieved_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sequence Steps (each step in a drip sequence)
CREATE TABLE IF NOT EXISTS public.marketing_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.marketing_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL, -- email, sms, whatsapp, wait, condition, action
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  delay_amount INTEGER DEFAULT 0, -- delay in minutes before this step
  delay_unit TEXT DEFAULT 'minutes', -- minutes, hours, days
  template_id UUID REFERENCES public.marketing_templates(id),
  conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sequence Enrollments (contacts in sequences)
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.marketing_sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES public.marketing_sequence_steps(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, exited, paused
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  exit_reason TEXT,
  next_step_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(sequence_id, contact_id)
);

-- Sequence Step Executions (tracking each step execution)
CREATE TABLE IF NOT EXISTS public.sequence_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.marketing_sequence_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, skipped
  executed_at TIMESTAMPTZ,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Automations (visual workflow builder)
CREATE TABLE IF NOT EXISTS public.marketing_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- lead_created, form_submitted, stage_change, score_change, webhook, schedule
  trigger_config JSONB DEFAULT '{}'::jsonb,
  nodes JSONB DEFAULT '[]'::jsonb, -- workflow nodes
  edges JSONB DEFAULT '[]'::jsonb, -- connections between nodes
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.marketing_workflows(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id),
  trigger_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
  current_node TEXT,
  execution_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- A/B Test Results
CREATE TABLE IF NOT EXISTS public.ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  click_rate NUMERIC(5,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Auth users can manage marketing_sequences" ON public.marketing_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage marketing_sequence_steps" ON public.marketing_sequence_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage sequence_enrollments" ON public.sequence_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage sequence_step_executions" ON public.sequence_step_executions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage marketing_workflows" ON public.marketing_workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage workflow_executions" ON public.workflow_executions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage ab_test_results" ON public.ab_test_results FOR ALL USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_marketing_sequences_updated_at BEFORE UPDATE ON public.marketing_sequences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_workflows_updated_at BEFORE UPDATE ON public.marketing_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ab_test_results_updated_at BEFORE UPDATE ON public.ab_test_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();