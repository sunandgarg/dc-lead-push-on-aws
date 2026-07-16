// Marketing Automation Types

export type SequenceStatus = 'draft' | 'active' | 'paused' | 'completed';
export type SequenceTriggerType = 'manual' | 'lead_created' | 'form_submitted' | 'stage_change' | 'score_change' | 'tag_added';
export type StepType = 'email' | 'sms' | 'whatsapp' | 'wait' | 'condition' | 'action' | 'webhook';
export type EnrollmentStatus = 'active' | 'completed' | 'exited' | 'paused';

export interface MarketingSequence {
  id: string;
  name: string;
  description?: string;
  trigger_type: SequenceTriggerType;
  trigger_config: TriggerConfig;
  status: SequenceStatus;
  entry_conditions: ConditionGroup;
  exit_conditions: ConditionGroup;
  goal_config: GoalConfig;
  enrolled_count: number;
  completed_count: number;
  goal_achieved_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  steps?: SequenceStep[];
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  step_type: StepType;
  name: string;
  config: StepConfig;
  delay_amount: number;
  delay_unit: 'minutes' | 'hours' | 'days';
  template_id?: string;
  conditions: ConditionGroup;
  is_active: boolean;
  created_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  current_step_id?: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at?: string;
  exit_reason?: string;
  next_step_at?: string;
  metadata: Record<string, any>;
}

export interface StepExecution {
  id: string;
  enrollment_id: string;
  step_id: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  executed_at?: string;
  result: Record<string, any>;
  error_message?: string;
  created_at: string;
}

// Workflow Types
export type WorkflowStatus = 'draft' | 'active' | 'paused';
export type WorkflowTriggerType = 'lead_created' | 'form_submitted' | 'stage_change' | 'score_change' | 'webhook' | 'schedule' | 'manual';
export type NodeType = 'trigger' | 'email' | 'sms' | 'whatsapp' | 'wait' | 'condition' | 'update_field' | 'assign' | 'add_tag' | 'webhook' | 'end';

export interface MarketingWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  trigger_config: TriggerConfig;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  execution_count: number;
  last_executed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: ConditionGroup;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  contact_id?: string;
  trigger_data: Record<string, any>;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_node?: string;
  execution_log: ExecutionLogEntry[];
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface ExecutionLogEntry {
  node_id: string;
  node_type: NodeType;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  timestamp: string;
  data?: Record<string, any>;
  error?: string;
}

// A/B Testing Types
export interface ABTestResult {
  id: string;
  campaign_id: string;
  variant_id: string;
  variant_name: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  is_winner: boolean;
  created_at: string;
  updated_at: string;
}

// Configuration Types
export interface TriggerConfig {
  form_id?: string;
  stage_id?: string;
  score_threshold?: number;
  tag?: string;
  schedule?: ScheduleConfig;
  webhook_url?: string;
}

export interface ScheduleConfig {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone: string;
  days_of_week?: number[];
  day_of_month?: number;
}

export interface StepConfig {
  template_id?: string;
  subject?: string;
  message?: string;
  wait_duration?: number;
  wait_unit?: 'minutes' | 'hours' | 'days';
  field_name?: string;
  field_value?: any;
  webhook_url?: string;
  webhook_method?: 'GET' | 'POST' | 'PUT';
  assignee_id?: string;
  tags?: string[];
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Condition[];
}

export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface GoalConfig {
  enabled: boolean;
  type: 'stage_reached' | 'tag_added' | 'score_reached' | 'form_submitted';
  target_value?: string | number;
}

// Template for pre-built sequences
export interface SequenceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'nurturing' | 're-engagement' | 'follow-up' | 'promotional';
  steps: Omit<SequenceStep, 'id' | 'sequence_id' | 'created_at'>[];
  trigger_type: SequenceTriggerType;
}

// Pre-built sequence templates
export const SEQUENCE_TEMPLATES: SequenceTemplate[] = [
  {
    id: 'welcome-sequence',
    name: 'Welcome Sequence',
    description: 'Onboard new leads with a 5-day email sequence',
    category: 'onboarding',
    trigger_type: 'lead_created',
    steps: [
      { step_order: 0, step_type: 'email', name: 'Welcome Email', config: { subject: 'Welcome to {{company_name}}!' }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 1, step_type: 'wait', name: 'Wait 2 Days', config: { wait_duration: 2, wait_unit: 'days' }, delay_amount: 2, delay_unit: 'days', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 2, step_type: 'email', name: 'Follow-up Email', config: { subject: 'Getting Started with {{company_name}}' }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 3, step_type: 'wait', name: 'Wait 3 Days', config: { wait_duration: 3, wait_unit: 'days' }, delay_amount: 3, delay_unit: 'days', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 4, step_type: 'email', name: 'Value Proposition', config: { subject: 'Exclusive benefits for you' }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
    ]
  },
  {
    id: 'inquiry-followup',
    name: 'Inquiry Follow-up',
    description: 'Multi-channel follow-up for form submissions',
    category: 'follow-up',
    trigger_type: 'form_submitted',
    steps: [
      { step_order: 0, step_type: 'email', name: 'Thank You Email', config: { subject: 'Thanks for your inquiry!' }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 1, step_type: 'wait', name: 'Wait 1 Hour', config: { wait_duration: 1, wait_unit: 'hours' }, delay_amount: 1, delay_unit: 'hours', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 2, step_type: 'sms', name: 'SMS Follow-up', config: { message: 'Hi {{name}}, thank you for your interest!' }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 3, step_type: 'wait', name: 'Wait 1 Day', config: { wait_duration: 1, wait_unit: 'days' }, delay_amount: 1, delay_unit: 'days', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 4, step_type: 'whatsapp', name: 'WhatsApp Message', config: { message: 'Hi {{name}}, we noticed you were interested...' }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
    ]
  },
  {
    id: 're-engagement',
    name: 'Re-engagement Campaign',
    description: 'Win back cold leads with targeted messaging',
    category: 're-engagement',
    trigger_type: 'manual',
    steps: [
      { step_order: 0, step_type: 'email', name: 'We Miss You', config: { subject: 'We miss you, {{name}}!' }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 1, step_type: 'wait', name: 'Wait 3 Days', config: { wait_duration: 3, wait_unit: 'days' }, delay_amount: 3, delay_unit: 'days', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 2, step_type: 'condition', name: 'Check Email Opened', config: { field_name: 'last_email_opened', field_value: true }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
      { step_order: 3, step_type: 'email', name: 'Special Offer', config: { subject: 'Special offer just for you!' }, delay_amount: 0, delay_unit: 'minutes', conditions: { logic: 'AND', conditions: [] }, is_active: true },
    ]
  }
];

// Node types for workflow builder
export const WORKFLOW_NODE_TYPES = [
  { type: 'trigger' as NodeType, label: 'Trigger', icon: 'Zap', color: 'bg-purple-500' },
  { type: 'email' as NodeType, label: 'Send Email', icon: 'Mail', color: 'bg-blue-500' },
  { type: 'sms' as NodeType, label: 'Send SMS', icon: 'Smartphone', color: 'bg-green-500' },
  { type: 'whatsapp' as NodeType, label: 'Send WhatsApp', icon: 'MessageSquare', color: 'bg-emerald-500' },
  { type: 'wait' as NodeType, label: 'Wait/Delay', icon: 'Clock', color: 'bg-yellow-500' },
  { type: 'condition' as NodeType, label: 'Condition', icon: 'GitBranch', color: 'bg-orange-500' },
  { type: 'update_field' as NodeType, label: 'Update Field', icon: 'Edit', color: 'bg-indigo-500' },
  { type: 'assign' as NodeType, label: 'Assign Lead', icon: 'UserPlus', color: 'bg-pink-500' },
  { type: 'add_tag' as NodeType, label: 'Add Tag', icon: 'Tag', color: 'bg-cyan-500' },
  { type: 'webhook' as NodeType, label: 'Webhook', icon: 'Globe', color: 'bg-gray-500' },
  { type: 'end' as NodeType, label: 'End', icon: 'CircleX', color: 'bg-red-500' },
];
