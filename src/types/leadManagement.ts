// Lead Scoring Types
export interface LeadScoringRule {
  id: string;
  name: string;
  description: string | null;
  category: 'engagement' | 'behavior' | 'demographic' | 'fit';
  condition_type: string;
  condition_config: Record<string, any>;
  score_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadScoreHistory {
  id: string;
  contact_id: string;
  rule_id: string | null;
  previous_score: number;
  new_score: number;
  score_change: number;
  reason: string | null;
  triggered_by: 'auto' | 'manual';
  created_at: string;
}

// Lead Segment Types
export interface LeadSegment {
  id: string;
  name: string;
  description: string | null;
  segment_type: 'dynamic' | 'static';
  filter_config: SegmentFilter;
  lead_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentFilter {
  conditions: SegmentCondition[];
  logic: 'AND' | 'OR';
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
}

// Lead Assignment Types
export interface LeadAssignmentRule {
  id: string;
  name: string;
  description: string | null;
  assignment_type: 'round_robin' | 'load_balanced' | 'manual' | 'criteria_based';
  criteria_config: AssignmentCriteria;
  assignee_config: AssigneeConfig;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssignmentCriteria {
  conditions?: SegmentCondition[];
  segment_id?: string;
}

export interface AssigneeConfig {
  assignees: Assignee[];
  current_index?: number;
}

export interface Assignee {
  user_id: string;
  name: string;
  email: string;
  capacity: number;
  current_load: number;
}

// Lead Capture Form Types
export interface LeadCaptureForm {
  id: string;
  name: string;
  description: string | null;
  form_config: FormConfig;
  style_config: FormStyleConfig;
  university_id: string | null;
  redirect_url: string | null;
  thank_you_message: string;
  auto_assign_rule_id: string | null;
  default_stage_id: string | null;
  is_active: boolean;
  submissions_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormConfig {
  fields: FormField[];
  validation_rules?: ValidationRule[];
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'file' | 'hidden';
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  validation?: FieldValidation;
  order: number;
}

export interface FieldValidation {
  pattern?: string;
  min_length?: number;
  max_length?: number;
  custom_message?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

export interface FormStyleConfig {
  theme: 'light' | 'dark' | 'auto';
  primary_color: string;
  border_radius: number;
  font_family: string;
  submit_button_text: string;
}

// Form Submission Types
export interface FormSubmission {
  id: string;
  form_id: string;
  contact_id: string | null;
  submission_data: Record<string, any>;
  source_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
}

// Lead Event Types
export interface LeadEvent {
  id: string;
  contact_id: string;
  event_type: string;
  event_data: Record<string, any>;
  source: 'email' | 'website' | 'whatsapp' | 'sms' | 'call';
  created_at: string;
}

// Lead Preferences Types
export interface LeadPreferences {
  id: string;
  contact_id: string;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  whatsapp_opt_in: boolean;
  call_opt_in: boolean;
  preferred_contact_time: 'morning' | 'afternoon' | 'evening' | null;
  preferred_language: string;
  do_not_contact: boolean;
  do_not_contact_reason: string | null;
  updated_at: string;
}

// Extended Contact with scoring
export interface ScoredContact {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  city: string | null;
  state: string | null;
  course: string | null;
  specialization: string | null;
  source: string | null;
  stage_id: string | null;
  priority: string | null;
  tags: string[] | null;
  notes: string | null;
  university_id: string | null;
  lead_score: number;
  lead_quality: 'hot' | 'warm' | 'cold' | 'unscored';
  lead_score_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Dashboard Stats
export interface LeadStats {
  total_leads: number;
  new_leads_today: number;
  new_leads_week: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  unscored_leads: number;
  conversion_rate: number;
  avg_response_time: number;
}
