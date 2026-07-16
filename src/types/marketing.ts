// Marketing Module Types

export type TemplateType = 'email' | 'sms' | 'whatsapp' | 'landing_page' | 'push';
export type ChannelType = 'email' | 'sms' | 'whatsapp';
export type TemplateStatus = 'draft' | 'active' | 'archived';
export type DLTApprovalStatus = 'pending' | 'approved' | 'rejected';
export type IntegrationStatus = 'connected' | 'disconnected' | 'expired' | 'error';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'completed' | 'cancelled' | 'failed';
export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'read';

export interface MarketingTemplate {
  id: string;
  name: string;
  type: TemplateType;
  channel: ChannelType;
  content: EmailContent | SMSContent | WhatsAppContent;
  subject_line?: string;
  variables: string[];
  status: TemplateStatus;
  is_dlt_approved?: boolean;
  dlt_template_id?: string;
  dlt_approval_status?: DLTApprovalStatus;
  dlt_rejection_reason?: string;
  dlt_submitted_at?: string;
  dlt_approved_at?: string;
  preview_html?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailContent {
  blocks: EmailBlock[];
  styles?: {
    backgroundColor?: string;
    fontFamily?: string;
    padding?: string;
  };
}

export interface EmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'header' | 'footer' | 'social' | 'video' | 'coupon' | 'product';
  content: Record<string, any>;
  styles?: Record<string, string>;
}

export interface SMSContent {
  message: string;
  unicode?: boolean;
}

export interface WhatsAppContent {
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'template';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    content: string;
  };
  body: string;
  footer?: string;
  buttons?: WhatsAppButton[];
}

export interface WhatsAppButton {
  type: 'url' | 'phone' | 'quick_reply';
  text: string;
  value: string;
}

export interface MarketingIntegration {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'dlt';
  provider: string;
  name: string;
  configuration: IntegrationConfig;
  status: IntegrationStatus;
  api_key_expires_at?: string;
  last_synced?: string;
  last_error?: string;
  webhook_url?: string;
  is_primary: boolean;
  fallback_integration_id?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConfig {
  api_key?: string;
  api_secret?: string;
  account_sid?: string;
  sender_id?: string;
  from_email?: string;
  from_name?: string;
  business_phone_id?: string;
  access_token?: string;
  entity_id?: string;
  [key: string]: any;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  description?: string;
  channels: ChannelType[];
  template_id?: string;
  template?: MarketingTemplate;
  integration_id?: string;
  integration?: MarketingIntegration;
  recipient_count: number;
  status: CampaignStatus;
  send_at?: string;
  timezone: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
  ab_test_config?: ABTestConfig;
  recipient_filter?: RecipientFilter;
  sent_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ABTestConfig {
  enabled: boolean;
  variants: {
    id: string;
    name: string;
    template_id: string;
    weight: number;
  }[];
  winner_criteria: 'open_rate' | 'click_rate' | 'conversion_rate';
  test_duration_hours: number;
}

export interface RecipientFilter {
  type: 'all' | 'segment' | 'csv' | 'query';
  segment_id?: string;
  query?: Record<string, any>;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  email?: string;
  mobile?: string;
  name?: string;
  variables: Record<string, any>;
  status: RecipientStatus;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
  provider_message_id?: string;
  created_at: string;
}

export interface CampaignKPI {
  id: string;
  campaign_id: string;
  channel: ChannelType;
  metric_type: string;
  metric_value: number;
  vendor_id?: string;
  recorded_at: string;
}

export interface DLTEntity {
  id: string;
  platform: string;
  entity_id: string;
  entity_name: string;
  sender_ids: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  registered_at?: string;
  expires_at?: string;
  documents: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Provider configurations
export const EMAIL_PROVIDERS = [
  { id: 'sendgrid', name: 'SendGrid', logo: '📧' },
  { id: 'mailgun', name: 'Mailgun', logo: '📨' },
  { id: 'aws_ses', name: 'AWS SES', logo: '☁️' },
  { id: 'brevo', name: 'Brevo (Sendinblue)', logo: '📫' },
  { id: 'mailersend', name: 'MailerSend', logo: '✉️' },
  { id: 'resend', name: 'Resend', logo: '📬' },
  { id: 'smtp', name: 'Custom SMTP', logo: '⚙️' },
] as const;

export const SMS_PROVIDERS = [
  { id: 'twilio', name: 'Twilio', logo: '📱' },
  { id: 'aws_sns', name: 'AWS SNS', logo: '☁️' },
  { id: 'plivo', name: 'Plivo', logo: '📲' },
  { id: 'smsgatewayhub', name: 'SMSGatewayHub', logo: '🔌' },
  { id: 'exotel', name: 'Exotel', logo: '📞' },
  { id: 'netcore', name: 'Netcore', logo: '🌐' },
] as const;

export const WHATSAPP_PROVIDERS = [
  { id: 'meta', name: 'Meta (Official)', logo: '💬' },
  { id: 'twilio_wa', name: 'Twilio for WhatsApp', logo: '📱' },
  { id: 'plivo_wa', name: 'Plivo for WhatsApp', logo: '📲' },
  { id: 'smsgatewayhub_wa', name: 'SMSGatewayHub WhatsApp', logo: '🔌' },
  { id: 'netcore_wa', name: 'Netcore WhatsApp', logo: '🌐' },
] as const;

export const DLT_PLATFORMS = [
  { id: 'jio', name: 'Telemarketer Jio DLT', url: 'https://trueconnect.jio.com/' },
  { id: 'airtel', name: 'Airtel DLT', url: 'https://dltconnect.airtel.in/' },
  { id: 'bsnl', name: 'BSNL DLT', url: 'https://www.ucc-bsnl.co.in/' },
  { id: 'vi', name: 'Vi DLT', url: 'https://www.vilpower.in/' },
] as const;

export interface KPIDashboardData {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  channelBreakdown: {
    channel: ChannelType;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }[];
  dailyTrends: {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }[];
}
