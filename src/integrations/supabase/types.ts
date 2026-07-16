export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ab_test_results: {
        Row: {
          campaign_id: string
          click_rate: number | null
          clicked_count: number | null
          conversion_rate: number | null
          converted_count: number | null
          created_at: string | null
          delivered_count: number | null
          id: string
          is_winner: boolean | null
          open_rate: number | null
          opened_count: number | null
          sent_count: number | null
          updated_at: string | null
          variant_id: string
          variant_name: string
        }
        Insert: {
          campaign_id: string
          click_rate?: number | null
          clicked_count?: number | null
          conversion_rate?: number | null
          converted_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          is_winner?: boolean | null
          open_rate?: number | null
          opened_count?: number | null
          sent_count?: number | null
          updated_at?: string | null
          variant_id: string
          variant_name: string
        }
        Update: {
          campaign_id?: string
          click_rate?: number | null
          clicked_count?: number | null
          conversion_rate?: number | null
          converted_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          is_winner?: boolean | null
          open_rate?: number | null
          opened_count?: number | null
          sent_count?: number | null
          updated_at?: string | null
          variant_id?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      api_logs: {
        Row: {
          application_no: string | null
          batch_id: string | null
          campaign: string | null
          created_at: string
          data_push_type: string | null
          email: string | null
          form: string | null
          id: string
          lead_data: Json | null
          lead_id: string | null
          medium: string | null
          mobile: string | null
          response: string | null
          source: string | null
          source_label: string | null
          status: string
          trigger_point: string | null
          university_id: string
          user_id: string | null
          webhook_id: string | null
        }
        Insert: {
          application_no?: string | null
          batch_id?: string | null
          campaign?: string | null
          created_at?: string
          data_push_type?: string | null
          email?: string | null
          form?: string | null
          id?: string
          lead_data?: Json | null
          lead_id?: string | null
          medium?: string | null
          mobile?: string | null
          response?: string | null
          source?: string | null
          source_label?: string | null
          status: string
          trigger_point?: string | null
          university_id: string
          user_id?: string | null
          webhook_id?: string | null
        }
        Update: {
          application_no?: string | null
          batch_id?: string | null
          campaign?: string | null
          created_at?: string
          data_push_type?: string | null
          email?: string | null
          form?: string | null
          id?: string
          lead_data?: Json | null
          lead_id?: string | null
          medium?: string | null
          mobile?: string | null
          response?: string | null
          source?: string | null
          source_label?: string | null
          status?: string
          trigger_point?: string | null
          university_id?: string
          user_id?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          created_at: string | null
          fail_reason: string | null
          id: string
          lead_data: Json | null
          lead_name: string | null
          result: string | null
          retry_count: number | null
          rule_id: string | null
          rule_name: string | null
          university_name: string | null
        }
        Insert: {
          created_at?: string | null
          fail_reason?: string | null
          id?: string
          lead_data?: Json | null
          lead_name?: string | null
          result?: string | null
          retry_count?: number | null
          rule_id?: string | null
          rule_name?: string | null
          university_name?: string | null
        }
        Update: {
          created_at?: string | null
          fail_reason?: string | null
          id?: string
          lead_data?: Json | null
          lead_name?: string | null
          result?: string | null
          retry_count?: number | null
          rule_id?: string | null
          rule_name?: string | null
          university_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          fail_count: number | null
          id: string
          last_triggered_at: string | null
          max_retries: number | null
          name: string
          priority: number | null
          retry_after: string | null
          retry_enabled: boolean | null
          status: string | null
          success_count: number | null
          triggered_count: number | null
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          fail_count?: number | null
          id?: string
          last_triggered_at?: string | null
          max_retries?: number | null
          name: string
          priority?: number | null
          retry_after?: string | null
          retry_enabled?: boolean | null
          status?: string | null
          success_count?: number | null
          triggered_count?: number | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          fail_count?: number | null
          id?: string
          last_triggered_at?: string | null
          max_retries?: number | null
          name?: string
          priority?: number | null
          retry_after?: string | null
          retry_enabled?: boolean | null
          status?: string | null
          success_count?: number | null
          triggered_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_kpis: {
        Row: {
          campaign_id: string
          channel: string
          id: string
          metric_type: string
          metric_value: number
          recorded_at: string
          vendor_id: string | null
        }
        Insert: {
          campaign_id: string
          channel: string
          id?: string
          metric_type: string
          metric_value?: number
          recorded_at?: string
          vendor_id?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          id?: string
          metric_type?: string
          metric_value?: number
          recorded_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_kpis_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_kpis_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "marketing_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          email: string | null
          error_message: string | null
          id: string
          mobile: string | null
          name: string | null
          opened_at: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          variables: Json | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          mobile?: string | null
          name?: string | null
          opened_at?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          variables?: Json | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          mobile?: string | null
          name?: string | null
          opened_at?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          automation_id: string | null
          campaign_name: string | null
          campaign_type: string | null
          channel: string
          communication_start_date: string | null
          created_at: string
          created_by: string | null
          delivered_to: number | null
          id: string
          job_id: string | null
          list_id: string | null
          preview: string | null
          segment_id: string | null
          status: string
          tags: string[] | null
          targeted_audience: number | null
          template_name: string | null
          updated_at: string
        }
        Insert: {
          automation_id?: string | null
          campaign_name?: string | null
          campaign_type?: string | null
          channel: string
          communication_start_date?: string | null
          created_at?: string
          created_by?: string | null
          delivered_to?: number | null
          id?: string
          job_id?: string | null
          list_id?: string | null
          preview?: string | null
          segment_id?: string | null
          status?: string
          tags?: string[] | null
          targeted_audience?: number | null
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          automation_id?: string | null
          campaign_name?: string | null
          campaign_type?: string | null
          channel?: string
          communication_start_date?: string | null
          created_at?: string
          created_by?: string | null
          delivered_to?: number | null
          id?: string
          job_id?: string | null
          list_id?: string | null
          preview?: string | null
          segment_id?: string | null
          status?: string
          tags?: string[] | null
          targeted_audience?: number | null
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "marketing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "lead_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_specializations: {
        Row: {
          course: string
          created_at: string
          id: string
          specialization: string | null
          university_id: string
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          specialization?: string | null
          university_id: string
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          specialization?: string | null
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_specializations_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          metadata: Json | null
          outcome: string | null
          scheduled_at: string | null
          title: string
          type: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          outcome?: string | null
          scheduled_at?: string | null
          title: string
          type: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          outcome?: string | null
          scheduled_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          alternate_mobile: string | null
          assigned_to: string | null
          city: string | null
          course: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          expected_enrollment_date: string | null
          id: string
          last_contacted_at: string | null
          lead_id: string | null
          lead_quality: string | null
          lead_score: number | null
          lead_score_updated_at: string | null
          mobile: string
          name: string
          next_follow_up: string | null
          notes: string | null
          priority: string | null
          source: string | null
          specialization: string | null
          stage_id: string | null
          state: string | null
          tags: string[] | null
          university_id: string | null
          updated_at: string
        }
        Insert: {
          alternate_mobile?: string | null
          assigned_to?: string | null
          city?: string | null
          course?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          expected_enrollment_date?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_id?: string | null
          lead_quality?: string | null
          lead_score?: number | null
          lead_score_updated_at?: string | null
          mobile: string
          name: string
          next_follow_up?: string | null
          notes?: string | null
          priority?: string | null
          source?: string | null
          specialization?: string | null
          stage_id?: string | null
          state?: string | null
          tags?: string[] | null
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          alternate_mobile?: string | null
          assigned_to?: string | null
          city?: string | null
          course?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          expected_enrollment_date?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_id?: string | null
          lead_quality?: string | null
          lead_score?: number | null
          lead_score_updated_at?: string | null
          mobile?: string
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          priority?: string | null
          source?: string | null
          specialization?: string | null
          stage_id?: string | null
          state?: string | null
          tags?: string[] | null
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          reminder_at: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          reminder_at?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          reminder_at?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_column_values: {
        Row: {
          column_id: string
          created_at: string
          id: string
          parent_column_id: string | null
          parent_value_id: string | null
          university_id: string
          value: string
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          parent_column_id?: string | null
          parent_value_id?: string | null
          university_id: string
          value: string
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          parent_column_id?: string | null
          parent_value_id?: string | null
          university_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_column_values_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "custom_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_column_values_parent_column_id_fkey"
            columns: ["parent_column_id"]
            isOneToOne: false
            referencedRelation: "custom_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_column_values_parent_value_id_fkey"
            columns: ["parent_value_id"]
            isOneToOne: false
            referencedRelation: "custom_column_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_column_values_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_columns: {
        Row: {
          column_key: string
          column_name: string
          created_at: string
          id: string
          is_required: boolean | null
          sort_order: number | null
          university_id: string
        }
        Insert: {
          column_key: string
          column_name: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          university_id: string
        }
        Update: {
          column_key?: string
          column_name?: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_columns_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          created_at: string
          dns_config: Json | null
          domain: string
          id: string
          ssl_status: string | null
          status: string
          updated_at: string
          user_id: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dns_config?: Json | null
          domain: string
          id?: string
          ssl_status?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dns_config?: Json | null
          domain?: string
          id?: string
          ssl_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      dlt_entities: {
        Row: {
          created_at: string
          documents: Json | null
          entity_id: string
          entity_name: string
          expires_at: string | null
          id: string
          platform: string
          registered_at: string | null
          sender_ids: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documents?: Json | null
          entity_id: string
          entity_name: string
          expires_at?: string | null
          id?: string
          platform: string
          registered_at?: string | null
          sender_ids?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documents?: Json | null
          entity_id?: string
          entity_name?: string
          expires_at?: string | null
          id?: string
          platform?: string
          registered_at?: string | null
          sender_ids?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_api_settings: {
        Row: {
          api_key: string | null
          created_at: string
          default_from_email: string | null
          default_from_name: string | null
          id: string
          sender_domain: string | null
          updated_at: string
          webhook_events: Json | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          default_from_email?: string | null
          default_from_name?: string | null
          id?: string
          sender_domain?: string | null
          updated_at?: string
          webhook_events?: Json | null
        }
        Update: {
          api_key?: string | null
          created_at?: string
          default_from_email?: string | null
          default_from_name?: string | null
          id?: string
          sender_domain?: string | null
          updated_at?: string
          webhook_events?: Json | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          audience_filters: Json | null
          audience_type: string | null
          automation_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          from_email: string | null
          from_name: string | null
          id: string
          name: string
          provider_campaign_id: string | null
          provider_message_id: string | null
          provider_status: string | null
          reply_to: string | null
          schedule_type: string
          scheduled_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          total_count: number | null
          unique_audience_count: number | null
          updated_at: string
        }
        Insert: {
          audience_filters?: Json | null
          audience_type?: string | null
          automation_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          name: string
          provider_campaign_id?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          reply_to?: string | null
          schedule_type?: string
          scheduled_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          total_count?: number | null
          unique_audience_count?: number | null
          updated_at?: string
        }
        Update: {
          audience_filters?: Json | null
          audience_type?: string | null
          automation_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          name?: string
          provider_campaign_id?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          reply_to?: string | null
          schedule_type?: string
          scheduled_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          total_count?: number | null
          unique_audience_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          provider_message_id: string | null
          received_at: string
          recipient_email: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          provider_message_id?: string | null
          received_at?: string
          recipient_email?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          provider_message_id?: string | null
          received_at?: string
          recipient_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          error_message: string | null
          id: string
          sent_at: string | null
          smtp_config_id: string | null
          status: string | null
          subject: string
          template_id: string | null
          to_email: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          sent_at?: string | null
          smtp_config_id?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          to_email: string
        }
        Update: {
          error_message?: string | null
          id?: string
          sent_at?: string | null
          smtp_config_id?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_smtp_config_id_fkey"
            columns: ["smtp_config_id"]
            isOneToOne: false
            referencedRelation: "smtp_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_recipients: {
        Row: {
          campaign_id: string | null
          created_at: string
          custom_fields: Json | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          provider_message_id: string | null
          send_status: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          provider_message_id?: string | null
          send_status?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          provider_message_id?: string | null
          send_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feature_toggles: {
        Row: {
          feature_key: string
          id: string
          is_enabled: boolean
          label: string
          parent_key: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          feature_key: string
          id?: string
          is_enabled?: boolean
          label: string
          parent_key?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          feature_key?: string
          id?: string
          is_enabled?: boolean
          label?: string
          parent_key?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          contact_id: string | null
          created_at: string
          form_id: string
          id: string
          ip_address: string | null
          referrer: string | null
          source_url: string | null
          submission_data: Json
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          form_id: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          source_url?: string | null
          submission_data?: Json
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          form_id?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          source_url?: string | null
          submission_data?: Json
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_capture_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_campaign_contacts: {
        Row: {
          campaign_id: string
          created_at: string
          email: string | null
          email_bounced: boolean | null
          email_clicked_at: string | null
          email_delivered_at: string | null
          email_opened_at: string | null
          email_sent_at: string | null
          engagement_type: string | null
          extra_data: Json | null
          followup_channel: string | null
          followup_delivered_at: string | null
          followup_response: string | null
          followup_sent_at: string | null
          id: string
          mobile: string | null
          name: string | null
          push_response: string | null
          push_status: string | null
          pushed_at: string | null
          status: string | null
          university_lead_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email?: string | null
          email_bounced?: boolean | null
          email_clicked_at?: string | null
          email_delivered_at?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          engagement_type?: string | null
          extra_data?: Json | null
          followup_channel?: string | null
          followup_delivered_at?: string | null
          followup_response?: string | null
          followup_sent_at?: string | null
          id?: string
          mobile?: string | null
          name?: string | null
          push_response?: string | null
          push_status?: string | null
          pushed_at?: string | null
          status?: string | null
          university_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string | null
          email_bounced?: boolean | null
          email_clicked_at?: string | null
          email_delivered_at?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          engagement_type?: string | null
          extra_data?: Json | null
          followup_channel?: string | null
          followup_delivered_at?: string | null
          followup_response?: string | null
          followup_sent_at?: string | null
          id?: string
          mobile?: string | null
          name?: string | null
          push_response?: string | null
          push_status?: string | null
          pushed_at?: string | null
          status?: string | null
          university_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "funnel_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_campaigns: {
        Row: {
          clicked_count: number | null
          created_at: string
          created_by: string | null
          current_step: string | null
          delivered_count: number | null
          description: string | null
          email_content: string | null
          email_subject: string | null
          email_template_id: string | null
          engagement_rules: Json | null
          from_email: string | null
          from_name: string | null
          id: string
          list_id: string | null
          name: string
          opened_count: number | null
          push_mode: string | null
          pushed_to_university: number | null
          retry_email_sent: number | null
          sent_count: number | null
          sms_sent: number | null
          status: string | null
          total_contacts: number | null
          university_id: string | null
          updated_at: string
          whatsapp_sent: number | null
        }
        Insert: {
          clicked_count?: number | null
          created_at?: string
          created_by?: string | null
          current_step?: string | null
          delivered_count?: number | null
          description?: string | null
          email_content?: string | null
          email_subject?: string | null
          email_template_id?: string | null
          engagement_rules?: Json | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          list_id?: string | null
          name: string
          opened_count?: number | null
          push_mode?: string | null
          pushed_to_university?: number | null
          retry_email_sent?: number | null
          sent_count?: number | null
          sms_sent?: number | null
          status?: string | null
          total_contacts?: number | null
          university_id?: string | null
          updated_at?: string
          whatsapp_sent?: number | null
        }
        Update: {
          clicked_count?: number | null
          created_at?: string
          created_by?: string | null
          current_step?: string | null
          delivered_count?: number | null
          description?: string | null
          email_content?: string | null
          email_subject?: string | null
          email_template_id?: string | null
          engagement_rules?: Json | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          list_id?: string | null
          name?: string
          opened_count?: number | null
          push_mode?: string | null
          pushed_to_university?: number | null
          retry_email_sent?: number | null
          sent_count?: number | null
          sms_sent?: number | null
          status?: string | null
          total_contacts?: number | null
          university_id?: string | null
          updated_at?: string
          whatsapp_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_campaigns_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "smtp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_campaigns_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          default_values: Json
          description: string | null
          id: string
          is_active: boolean
          last_submission_at: string | null
          name: string
          preset_id: string | null
          routing_mode: string
          submissions_count: number
          university_ids: string[]
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          default_values?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          last_submission_at?: string | null
          name: string
          preset_id?: string | null
          routing_mode?: string
          submissions_count?: number
          university_ids?: string[]
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          default_values?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          last_submission_at?: string | null
          name?: string
          preset_id?: string | null
          routing_mode?: string
          submissions_count?: number
          university_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "multi_push_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_history: {
        Row: {
          assigned_from: string | null
          assigned_to: string
          contact_id: string
          created_at: string
          id: string
          reason: string | null
          rule_id: string | null
        }
        Insert: {
          assigned_from?: string | null
          assigned_to: string
          contact_id: string
          created_at?: string
          id?: string
          reason?: string | null
          rule_id?: string | null
        }
        Update: {
          assigned_from?: string | null
          assigned_to?: string
          contact_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "lead_assignment_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_rules: {
        Row: {
          assignee_config: Json | null
          assignment_type: string
          created_at: string
          criteria_config: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          updated_at: string
        }
        Insert: {
          assignee_config?: Json | null
          assignment_type?: string
          created_at?: string
          criteria_config?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string
        }
        Update: {
          assignee_config?: Json | null
          assignment_type?: string
          created_at?: string
          criteria_config?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_capture_forms: {
        Row: {
          auto_assign_rule_id: string | null
          created_at: string
          created_by: string | null
          default_stage_id: string | null
          description: string | null
          form_config: Json
          id: string
          is_active: boolean | null
          name: string
          redirect_url: string | null
          style_config: Json | null
          submissions_count: number | null
          thank_you_message: string | null
          university_id: string | null
          updated_at: string
        }
        Insert: {
          auto_assign_rule_id?: string | null
          created_at?: string
          created_by?: string | null
          default_stage_id?: string | null
          description?: string | null
          form_config?: Json
          id?: string
          is_active?: boolean | null
          name: string
          redirect_url?: string | null
          style_config?: Json | null
          submissions_count?: number | null
          thank_you_message?: string | null
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_assign_rule_id?: string | null
          created_at?: string
          created_by?: string | null
          default_stage_id?: string | null
          description?: string | null
          form_config?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          redirect_url?: string | null
          style_config?: Json | null
          submissions_count?: number | null
          thank_you_message?: string | null
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_capture_forms_auto_assign_rule_id_fkey"
            columns: ["auto_assign_rule_id"]
            isOneToOne: false
            referencedRelation: "lead_assignment_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_capture_forms_default_stage_id_fkey"
            columns: ["default_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_capture_forms_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          contact_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          source: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          source?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_preferences: {
        Row: {
          call_opt_in: boolean | null
          contact_id: string
          do_not_contact: boolean | null
          do_not_contact_reason: string | null
          email_opt_in: boolean | null
          id: string
          preferred_contact_time: string | null
          preferred_language: string | null
          sms_opt_in: boolean | null
          updated_at: string
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          call_opt_in?: boolean | null
          contact_id: string
          do_not_contact?: boolean | null
          do_not_contact_reason?: string | null
          email_opt_in?: boolean | null
          id?: string
          preferred_contact_time?: string | null
          preferred_language?: string | null
          sms_opt_in?: boolean | null
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          call_opt_in?: boolean | null
          contact_id?: string
          do_not_contact?: boolean | null
          do_not_contact_reason?: string | null
          email_opt_in?: boolean | null
          id?: string
          preferred_contact_time?: string | null
          preferred_language?: string | null
          sms_opt_in?: boolean | null
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_preferences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_push_cumulative_stats: {
        Row: {
          first_pushed_at: string | null
          id: string
          last_pushed_at: string | null
          source_label: string
          total_dll_blocked: number
          total_duplicate: number
          total_failed: number
          total_other_error: number
          total_pushed: number
          total_success: number
          university_id: string
          updated_at: string
        }
        Insert: {
          first_pushed_at?: string | null
          id?: string
          last_pushed_at?: string | null
          source_label?: string
          total_dll_blocked?: number
          total_duplicate?: number
          total_failed?: number
          total_other_error?: number
          total_pushed?: number
          total_success?: number
          university_id: string
          updated_at?: string
        }
        Update: {
          first_pushed_at?: string | null
          id?: string
          last_pushed_at?: string | null
          source_label?: string
          total_dll_blocked?: number
          total_duplicate?: number
          total_failed?: number
          total_other_error?: number
          total_pushed?: number
          total_success?: number
          university_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_push_daily_stats: {
        Row: {
          created_at: string
          dll_blocked: number
          duplicate: number
          failed: number
          id: string
          other_error: number
          pushed: number
          source_label: string
          stat_date: string
          success: number
          university_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dll_blocked?: number
          duplicate?: number
          failed?: number
          id?: string
          other_error?: number
          pushed?: number
          source_label?: string
          stat_date?: string
          success?: number
          university_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dll_blocked?: number
          duplicate?: number
          failed?: number
          id?: string
          other_error?: number
          pushed?: number
          source_label?: string
          stat_date?: string
          success?: number
          university_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_score_history: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          new_score: number
          previous_score: number
          reason: string | null
          rule_id: string | null
          score_change: number
          triggered_by: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          new_score?: number
          previous_score?: number
          reason?: string | null
          rule_id?: string | null
          score_change?: number
          triggered_by?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          new_score?: number
          previous_score?: number
          reason?: string | null
          rule_id?: string | null
          score_change?: number
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_score_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_score_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "lead_scoring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_rules: {
        Row: {
          category: string
          condition_config: Json
          condition_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          score_value: number
          updated_at: string
        }
        Insert: {
          category: string
          condition_config?: Json
          condition_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          score_value?: number
          updated_at?: string
        }
        Update: {
          category?: string
          condition_config?: Json
          condition_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          score_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_segment_members: {
        Row: {
          added_at: string
          contact_id: string
          id: string
          segment_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          id?: string
          segment_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_segment_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "lead_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_segments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          filter_config: Json
          id: string
          is_active: boolean | null
          lead_count: number | null
          name: string
          segment_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filter_config?: Json
          id?: string
          is_active?: boolean | null
          lead_count?: number | null
          name: string
          segment_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filter_config?: Json
          id?: string
          is_active?: boolean | null
          lead_count?: number | null
          name?: string
          segment_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          api_response: string | null
          batch_id: string
          city: string | null
          course: string | null
          created_at: string
          email: string
          extra_data: Json | null
          id: string
          lead_campaign: string | null
          lead_medium: string | null
          lead_source: string | null
          mobile: string
          name: string
          processed_at: string | null
          retry_count: number | null
          specialization: string | null
          state: string | null
          status: string | null
          university_id: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          api_response?: string | null
          batch_id: string
          city?: string | null
          course?: string | null
          created_at?: string
          email: string
          extra_data?: Json | null
          id?: string
          lead_campaign?: string | null
          lead_medium?: string | null
          lead_source?: string | null
          mobile: string
          name: string
          processed_at?: string | null
          retry_count?: number | null
          specialization?: string | null
          state?: string | null
          status?: string | null
          university_id: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          api_response?: string | null
          batch_id?: string
          city?: string | null
          course?: string | null
          created_at?: string
          email?: string
          extra_data?: Json | null
          id?: string
          lead_campaign?: string | null
          lead_medium?: string | null
          lead_source?: string | null
          mobile?: string
          name?: string
          processed_at?: string | null
          retry_count?: number | null
          specialization?: string | null
          state?: string | null
          status?: string | null
          university_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          ab_test_config: Json | null
          channels: string[]
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          integration_id: string | null
          name: string
          recipient_count: number | null
          recipient_filter: Json | null
          recurrence: string | null
          send_at: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          ab_test_config?: Json | null
          channels?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          integration_id?: string | null
          name: string
          recipient_count?: number | null
          recipient_filter?: Json | null
          recurrence?: string | null
          send_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          ab_test_config?: Json | null
          channels?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          integration_id?: string | null
          name?: string
          recipient_count?: number | null
          recipient_filter?: Json | null
          recurrence?: string | null
          send_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "marketing_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_custom_integrations: {
        Row: {
          auth_config: Json | null
          auth_type: string | null
          base_url: string
          channel: string
          created_at: string
          headers: Json | null
          id: string
          is_active: boolean | null
          method: string
          name: string
          request_body_template: Json | null
          response_message_path: string | null
          response_success_path: string | null
          test_payload: Json | null
          updated_at: string
        }
        Insert: {
          auth_config?: Json | null
          auth_type?: string | null
          base_url: string
          channel: string
          created_at?: string
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          method?: string
          name: string
          request_body_template?: Json | null
          response_message_path?: string | null
          response_success_path?: string | null
          test_payload?: Json | null
          updated_at?: string
        }
        Update: {
          auth_config?: Json | null
          auth_type?: string | null
          base_url?: string
          channel?: string
          created_at?: string
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          method?: string
          name?: string
          request_body_template?: Json | null
          response_message_path?: string | null
          response_success_path?: string | null
          test_payload?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_integrations: {
        Row: {
          api_key_expires_at: string | null
          configuration: Json
          created_at: string
          fallback_integration_id: string | null
          id: string
          is_primary: boolean | null
          last_error: string | null
          last_synced: string | null
          name: string
          provider: string
          status: string
          type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key_expires_at?: string | null
          configuration?: Json
          created_at?: string
          fallback_integration_id?: string | null
          id?: string
          is_primary?: boolean | null
          last_error?: string | null
          last_synced?: string | null
          name: string
          provider: string
          status?: string
          type: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key_expires_at?: string | null
          configuration?: Json
          created_at?: string
          fallback_integration_id?: string | null
          id?: string
          is_primary?: boolean | null
          last_error?: string | null
          last_synced?: string | null
          name?: string
          provider?: string
          status?: string
          type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_integrations_fallback_integration_id_fkey"
            columns: ["fallback_integration_id"]
            isOneToOne: false
            referencedRelation: "marketing_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_leads: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string | null
          id: string
          mobile: string | null
          name: string | null
          push_response: string | null
          pushed_at: string | null
          pushed_to_university_id: string | null
          source_type: string
          status: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string | null
          push_response?: string | null
          pushed_at?: string | null
          pushed_to_university_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string | null
          push_response?: string | null
          pushed_at?: string | null
          pushed_to_university_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_pushed_to_university_id_fkey"
            columns: ["pushed_to_university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_list_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          imported_by: string | null
          lead_status_email: string | null
          lead_status_mobile: string | null
          list_id: string
          mobile: string | null
          name: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          imported_by?: string | null
          lead_status_email?: string | null
          lead_status_mobile?: string | null
          list_id: string
          mobile?: string | null
          name?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          imported_by?: string | null
          lead_status_email?: string | null
          lead_status_mobile?: string | null
          list_id?: string
          mobile?: string | null
          name?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_list_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "marketing_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_lists: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          origin: string
          owner: string | null
          tags: string[] | null
          total_leads: number | null
          unique_emails: number | null
          unique_mobiles: number | null
          university_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          origin?: string
          owner?: string | null
          tags?: string[] | null
          total_leads?: number | null
          unique_emails?: number | null
          unique_mobiles?: number | null
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          origin?: string
          owner?: string | null
          tags?: string[] | null
          total_leads?: number | null
          unique_emails?: number | null
          unique_mobiles?: number | null
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_lists_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_sequence_steps: {
        Row: {
          conditions: Json | null
          config: Json
          created_at: string | null
          delay_amount: number | null
          delay_unit: string | null
          id: string
          is_active: boolean | null
          name: string
          sequence_id: string
          step_order: number
          step_type: string
          template_id: string | null
        }
        Insert: {
          conditions?: Json | null
          config?: Json
          created_at?: string | null
          delay_amount?: number | null
          delay_unit?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sequence_id: string
          step_order?: number
          step_type: string
          template_id?: string | null
        }
        Update: {
          conditions?: Json | null
          config?: Json
          created_at?: string | null
          delay_amount?: number | null
          delay_unit?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sequence_id?: string
          step_order?: number
          step_type?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "marketing_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sequence_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_sequences: {
        Row: {
          completed_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          enrolled_count: number | null
          entry_conditions: Json | null
          exit_conditions: Json | null
          goal_achieved_count: number | null
          goal_config: Json | null
          id: string
          name: string
          status: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          completed_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enrolled_count?: number | null
          entry_conditions?: Json | null
          exit_conditions?: Json | null
          goal_achieved_count?: number | null
          goal_config?: Json | null
          id?: string
          name: string
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Update: {
          completed_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enrolled_count?: number | null
          entry_conditions?: Json | null
          exit_conditions?: Json | null
          goal_achieved_count?: number | null
          goal_config?: Json | null
          id?: string
          name?: string
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_templates: {
        Row: {
          channel: string
          content: Json
          created_at: string
          created_by: string | null
          dlt_approval_status: string | null
          dlt_approved_at: string | null
          dlt_rejection_reason: string | null
          dlt_submitted_at: string | null
          dlt_template_id: string | null
          id: string
          is_dlt_approved: boolean | null
          name: string
          preview_html: string | null
          status: string
          subject_line: string | null
          type: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          channel: string
          content?: Json
          created_at?: string
          created_by?: string | null
          dlt_approval_status?: string | null
          dlt_approved_at?: string | null
          dlt_rejection_reason?: string | null
          dlt_submitted_at?: string | null
          dlt_template_id?: string | null
          id?: string
          is_dlt_approved?: boolean | null
          name: string
          preview_html?: string | null
          status?: string
          subject_line?: string | null
          type: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          channel?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          dlt_approval_status?: string | null
          dlt_approved_at?: string | null
          dlt_rejection_reason?: string | null
          dlt_submitted_at?: string | null
          dlt_template_id?: string | null
          id?: string
          is_dlt_approved?: boolean | null
          name?: string
          preview_html?: string | null
          status?: string
          subject_line?: string | null
          type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      marketing_unsubscribes: {
        Row: {
          channel: string
          email: string | null
          id: string
          mobile: string | null
          reason: string | null
          unsubscribed_at: string
        }
        Insert: {
          channel: string
          email?: string | null
          id?: string
          mobile?: string | null
          reason?: string | null
          unsubscribed_at?: string
        }
        Update: {
          channel?: string
          email?: string | null
          id?: string
          mobile?: string | null
          reason?: string | null
          unsubscribed_at?: string
        }
        Relationships: []
      }
      marketing_workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          edges: Json | null
          execution_count: number | null
          id: string
          last_executed_at: string | null
          name: string
          nodes: Json | null
          status: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json | null
          execution_count?: number | null
          id?: string
          last_executed_at?: string | null
          name: string
          nodes?: Json | null
          status?: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          edges?: Json | null
          execution_count?: number | null
          id?: string
          last_executed_at?: string | null
          name?: string
          nodes?: Json | null
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      multi_push_presets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          university_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          university_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          university_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      multi_push_university_defaults: {
        Row: {
          created_at: string
          defaults: Json
          id: string
          university_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          defaults?: Json
          id?: string
          university_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          defaults?: Json
          id?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_approved: boolean | null
          last_sign_in_at: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          last_sign_in_at?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          last_sign_in_at?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          id: string
          name: string
          university_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          university_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string
          current_step_id: string | null
          enrolled_at: string | null
          exit_reason: string | null
          id: string
          metadata: Json | null
          next_step_at: string | null
          sequence_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          current_step_id?: string | null
          enrolled_at?: string | null
          exit_reason?: string | null
          id?: string
          metadata?: Json | null
          next_step_at?: string | null
          sequence_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          current_step_id?: string | null
          enrolled_at?: string | null
          exit_reason?: string | null
          id?: string
          metadata?: Json | null
          next_step_at?: string | null
          sequence_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "marketing_sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "marketing_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_step_executions: {
        Row: {
          created_at: string | null
          enrollment_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          result: Json | null
          status: string
          step_id: string
        }
        Insert: {
          created_at?: string | null
          enrollment_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          status?: string
          step_id: string
        }
        Update: {
          created_at?: string | null
          enrollment_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_step_executions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_step_executions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "marketing_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_campaigns: {
        Row: {
          ab_test_config: Json | null
          ab_test_enabled: boolean | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          from_domain_id: string | null
          html_body: string
          id: string
          list_id: string | null
          name: string
          reply_to: string | null
          segment_id: string | null
          send_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          text_body: string | null
          total_recipients: number | null
          tracking_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          ab_test_config?: Json | null
          ab_test_enabled?: boolean | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_domain_id?: string | null
          html_body: string
          id?: string
          list_id?: string | null
          name: string
          reply_to?: string | null
          segment_id?: string | null
          send_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          text_body?: string | null
          total_recipients?: number | null
          tracking_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          ab_test_config?: Json | null
          ab_test_enabled?: boolean | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_domain_id?: string | null
          html_body?: string
          id?: string
          list_id?: string | null
          name?: string
          reply_to?: string | null
          segment_id?: string | null
          send_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          text_body?: string | null
          total_recipients?: number | null
          tracking_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smtp_campaigns_from_domain_id_fkey"
            columns: ["from_domain_id"]
            isOneToOne: false
            referencedRelation: "smtp_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smtp_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "marketing_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smtp_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "lead_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_config: {
        Row: {
          auth_enabled: boolean | null
          created_at: string | null
          encryption: string | null
          from_email: string
          from_name: string | null
          host: string
          id: string
          password: string
          port: number | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          auth_enabled?: boolean | null
          created_at?: string | null
          encryption?: string | null
          from_email: string
          from_name?: string | null
          host: string
          id?: string
          password: string
          port?: number | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          auth_enabled?: boolean | null
          created_at?: string | null
          encryption?: string | null
          from_email?: string
          from_name?: string | null
          host?: string
          id?: string
          password?: string
          port?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      smtp_domains: {
        Row: {
          created_at: string
          daily_limit: number | null
          display_name: string | null
          dkim_private_key: string | null
          dkim_public_key: string | null
          dkim_selector: string | null
          dmarc_record: string | null
          domain: string
          emails_sent_this_hour: number | null
          emails_sent_today: number | null
          from_email: string
          from_name: string | null
          hourly_limit: number | null
          id: string
          is_active: boolean | null
          last_reset_at: string | null
          reputation_score: number | null
          spf_record: string | null
          updated_at: string
          verification_status: string | null
          verified_at: string | null
          warmup_day: number | null
          warmup_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          display_name?: string | null
          dkim_private_key?: string | null
          dkim_public_key?: string | null
          dkim_selector?: string | null
          dmarc_record?: string | null
          domain: string
          emails_sent_this_hour?: number | null
          emails_sent_today?: number | null
          from_email: string
          from_name?: string | null
          hourly_limit?: number | null
          id?: string
          is_active?: boolean | null
          last_reset_at?: string | null
          reputation_score?: number | null
          spf_record?: string | null
          updated_at?: string
          verification_status?: string | null
          verified_at?: string | null
          warmup_day?: number | null
          warmup_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          display_name?: string | null
          dkim_private_key?: string | null
          dkim_public_key?: string | null
          dkim_selector?: string | null
          dmarc_record?: string | null
          domain?: string
          emails_sent_this_hour?: number | null
          emails_sent_today?: number | null
          from_email?: string
          from_name?: string | null
          hourly_limit?: number | null
          id?: string
          is_active?: boolean | null
          last_reset_at?: string | null
          reputation_score?: number | null
          spf_record?: string | null
          updated_at?: string
          verification_status?: string | null
          verified_at?: string | null
          warmup_day?: number | null
          warmup_enabled?: boolean | null
        }
        Relationships: []
      }
      smtp_email_logs: {
        Row: {
          bounce_code: string | null
          bounce_reason: string | null
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          domain_id: string | null
          error_message: string | null
          failed_at: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          id: string
          last_opened_at: string | null
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          spam_reported_at: string | null
          status: string | null
          total_clicks: number | null
          total_opens: number | null
          tracking_pixel_id: string | null
          unsubscribed_at: string | null
          variables: Json | null
        }
        Insert: {
          bounce_code?: string | null
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          domain_id?: string | null
          error_message?: string | null
          failed_at?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_opened_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          spam_reported_at?: string | null
          status?: string | null
          total_clicks?: number | null
          total_opens?: number | null
          tracking_pixel_id?: string | null
          unsubscribed_at?: string | null
          variables?: Json | null
        }
        Update: {
          bounce_code?: string | null
          bounce_reason?: string | null
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          domain_id?: string | null
          error_message?: string | null
          failed_at?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_opened_at?: string | null
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          spam_reported_at?: string | null
          status?: string | null
          total_clicks?: number | null
          total_opens?: number | null
          tracking_pixel_id?: string | null
          unsubscribed_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "smtp_email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "smtp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smtp_email_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smtp_email_logs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "smtp_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_link_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          device_type: string | null
          email_log_id: string | null
          id: string
          ip_address: string | null
          link_id: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          email_log_id?: string | null
          id?: string
          ip_address?: string | null
          link_id?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          email_log_id?: string | null
          id?: string
          ip_address?: string | null
          link_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smtp_link_clicks_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "smtp_email_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smtp_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "smtp_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_links: {
        Row: {
          campaign_id: string | null
          click_count: number | null
          created_at: string
          id: string
          original_url: string
          tracking_code: string
          tracking_url: string
          unique_clicks: number | null
        }
        Insert: {
          campaign_id?: string | null
          click_count?: number | null
          created_at?: string
          id?: string
          original_url: string
          tracking_code: string
          tracking_url: string
          unique_clicks?: number | null
        }
        Update: {
          campaign_id?: string | null
          click_count?: number | null
          created_at?: string
          id?: string
          original_url?: string
          tracking_code?: string
          tracking_url?: string
          unique_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "smtp_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "smtp_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_suppression_list: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
          reason: string
          source_campaign_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          reason: string
          source_campaign_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          reason?: string
          source_campaign_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smtp_suppression_list_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "smtp_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_system: boolean | null
          name: string
          subject_line: string | null
          text_content: string | null
          thumbnail_url: string | null
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_system?: boolean | null
          name: string
          subject_line?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_system?: boolean | null
          name?: string
          subject_line?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      smtp_tracking_events: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          email_client: string | null
          email_log_id: string | null
          event_type: string
          id: string
          ip_address: string | null
          link_id: string | null
          link_url: string | null
          metadata: Json | null
          os: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          email_client?: string | null
          email_log_id?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          link_id?: string | null
          link_url?: string | null
          metadata?: Json | null
          os?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          email_client?: string | null
          email_log_id?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          link_id?: string | null
          link_url?: string | null
          metadata?: Json | null
          os?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smtp_tracking_events_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "smtp_email_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      state_cities: {
        Row: {
          city: string
          created_at: string
          id: string
          state: string
          university_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          state: string
          university_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          state?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "state_cities_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          created_by: string | null
          current_lead_count: number | null
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          languages: string[] | null
          max_leads: number | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          specializations: string[] | null
          updated_at: string
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_lead_count?: number | null
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          max_leads?: number | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specializations?: string[] | null
          updated_at?: string
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_lead_count?: number | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          max_leads?: number | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specializations?: string[] | null
          updated_at?: string
          user_id?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      template_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          subject_line: string | null
          template_id: string
          version_number: number
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          subject_line?: string | null
          template_id: string
          version_number: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          subject_line?: string | null
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ui_drafts: {
        Row: {
          draft_data: Json
          form_key: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          draft_data?: Json
          form_key: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          draft_data?: Json
          form_key?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      universities: {
        Row: {
          admission_commitment: number | null
          api_type: string | null
          api_url: string
          auth_header_key: string | null
          auth_header_value: string | null
          auth_type: string | null
          auto_retry_delay_minutes: number | null
          auto_retry_enabled: boolean | null
          auto_retry_max_attempts: number | null
          campaign: string | null
          city: string | null
          college_id: string
          column_mapping: Json | null
          contact_person_email: string | null
          contact_person_mobile: string | null
          contact_person_name: string | null
          created_at: string
          custom_headers: Json | null
          daily_count_reset_at: string
          daily_lead_limit: number | null
          daily_limit: number | null
          daily_pushed_count: number
          deal_price: number | null
          default_values: Json | null
          gst_inclusive: boolean | null
          id: string
          leads_per_minute: number | null
          medium: string | null
          name: string
          payload_wrapper: string | null
          publisher_id: string | null
          publisher_panel_url: string | null
          sample_csv_content: string | null
          secret_key: string
          source: string | null
          state: string | null
          status: string
          updated_at: string
          utm_link: string | null
          whatsapp_group_link: string | null
        }
        Insert: {
          admission_commitment?: number | null
          api_type?: string | null
          api_url: string
          auth_header_key?: string | null
          auth_header_value?: string | null
          auth_type?: string | null
          auto_retry_delay_minutes?: number | null
          auto_retry_enabled?: boolean | null
          auto_retry_max_attempts?: number | null
          campaign?: string | null
          city?: string | null
          college_id: string
          column_mapping?: Json | null
          contact_person_email?: string | null
          contact_person_mobile?: string | null
          contact_person_name?: string | null
          created_at?: string
          custom_headers?: Json | null
          daily_count_reset_at?: string
          daily_lead_limit?: number | null
          daily_limit?: number | null
          daily_pushed_count?: number
          deal_price?: number | null
          default_values?: Json | null
          gst_inclusive?: boolean | null
          id?: string
          leads_per_minute?: number | null
          medium?: string | null
          name: string
          payload_wrapper?: string | null
          publisher_id?: string | null
          publisher_panel_url?: string | null
          sample_csv_content?: string | null
          secret_key: string
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          utm_link?: string | null
          whatsapp_group_link?: string | null
        }
        Update: {
          admission_commitment?: number | null
          api_type?: string | null
          api_url?: string
          auth_header_key?: string | null
          auth_header_value?: string | null
          auth_type?: string | null
          auto_retry_delay_minutes?: number | null
          auto_retry_enabled?: boolean | null
          auto_retry_max_attempts?: number | null
          campaign?: string | null
          city?: string | null
          college_id?: string
          column_mapping?: Json | null
          contact_person_email?: string | null
          contact_person_mobile?: string | null
          contact_person_name?: string | null
          created_at?: string
          custom_headers?: Json | null
          daily_count_reset_at?: string
          daily_lead_limit?: number | null
          daily_limit?: number | null
          daily_pushed_count?: number
          deal_price?: number | null
          default_values?: Json | null
          gst_inclusive?: boolean | null
          id?: string
          leads_per_minute?: number | null
          medium?: string | null
          name?: string
          payload_wrapper?: string | null
          publisher_id?: string | null
          publisher_panel_url?: string | null
          sample_csv_content?: string | null
          secret_key?: string
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          utm_link?: string | null
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      university_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          request_count: number | null
          university_id: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          request_count?: number | null
          university_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          request_count?: number | null
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "university_api_keys_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_batches: {
        Row: {
          api_config: Json | null
          completed_at: string | null
          created_at: string
          csv_data: string | null
          current_lead_index: number | null
          duplicate_count: number
          error_message: string | null
          fail_count: number
          file_name: string
          id: string
          is_cancelled: boolean | null
          is_paused: boolean | null
          leads_per_minute: number | null
          processed_count: number | null
          scheduled_at: string | null
          source_label: string | null
          status: string | null
          success_count: number
          total_leads: number
          university_id: string
          user_id: string
        }
        Insert: {
          api_config?: Json | null
          completed_at?: string | null
          created_at?: string
          csv_data?: string | null
          current_lead_index?: number | null
          duplicate_count?: number
          error_message?: string | null
          fail_count?: number
          file_name: string
          id?: string
          is_cancelled?: boolean | null
          is_paused?: boolean | null
          leads_per_minute?: number | null
          processed_count?: number | null
          scheduled_at?: string | null
          source_label?: string | null
          status?: string | null
          success_count?: number
          total_leads?: number
          university_id: string
          user_id?: string
        }
        Update: {
          api_config?: Json | null
          completed_at?: string | null
          created_at?: string
          csv_data?: string | null
          current_lead_index?: number | null
          duplicate_count?: number
          error_message?: string | null
          fail_count?: number
          file_name?: string
          id?: string
          is_cancelled?: boolean | null
          is_paused?: boolean | null
          leads_per_minute?: number | null
          processed_count?: number | null
          scheduled_at?: string | null
          source_label?: string | null
          status?: string | null
          success_count?: number
          total_leads?: number
          university_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_batches_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      url_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[] | null
          rate_limit: number
          requests_today: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[] | null
          rate_limit?: number
          requests_today?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[] | null
          rate_limit?: number
          requests_today?: number
          user_id?: string
        }
        Relationships: []
      }
      url_bulk_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          error_count: number
          error_report: Json | null
          file_name: string
          id: string
          status: string
          success_count: number
          total_urls: number
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          error_report?: Json | null
          file_name: string
          id?: string
          status?: string
          success_count?: number
          total_urls?: number
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          error_report?: Json | null
          file_name?: string
          id?: string
          status?: string
          success_count?: number
          total_urls?: number
          user_id?: string | null
        }
        Relationships: []
      }
      url_clicks: {
        Row: {
          browser: string | null
          city: string | null
          clicked_at: string
          country: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          os: string | null
          referrer: string | null
          url_id: string
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          referrer?: string | null
          url_id: string
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          os?: string | null
          referrer?: string | null
          url_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "url_clicks_url_id_fkey"
            columns: ["url_id"]
            isOneToOne: false
            referencedRelation: "url_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      url_mappings: {
        Row: {
          clicks: number
          code_length: number | null
          created_at: string
          custom_code: boolean
          domain: string | null
          expires_at: string | null
          header: string | null
          id: string
          is_active: boolean
          is_healthy: boolean | null
          last_checked_at: string | null
          original_url: string
          short_code: string
          tags: string[] | null
          title: string | null
          user_id: string | null
          user_tracking: boolean | null
        }
        Insert: {
          clicks?: number
          code_length?: number | null
          created_at?: string
          custom_code?: boolean
          domain?: string | null
          expires_at?: string | null
          header?: string | null
          id?: string
          is_active?: boolean
          is_healthy?: boolean | null
          last_checked_at?: string | null
          original_url: string
          short_code: string
          tags?: string[] | null
          title?: string | null
          user_id?: string | null
          user_tracking?: boolean | null
        }
        Update: {
          clicks?: number
          code_length?: number | null
          created_at?: string
          custom_code?: boolean
          domain?: string | null
          expires_at?: string | null
          header?: string | null
          id?: string
          is_active?: boolean
          is_healthy?: boolean | null
          last_checked_at?: string | null
          original_url?: string
          short_code?: string
          tags?: string[] | null
          title?: string | null
          user_id?: string | null
          user_tracking?: boolean | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          current_node: string | null
          error_message: string | null
          execution_log: Json | null
          id: string
          started_at: string | null
          status: string
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          current_node?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          current_node?: string | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_reserve_dll: {
        Args: { p_university_id: string }
        Returns: {
          allowed: boolean
          current_count: number
          daily_limit: number
        }[]
      }
      get_user_permissions: { Args: { _user_id: string }; Returns: string[] }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_automation_fail: {
        Args: { rule_uuid: string }
        Returns: undefined
      }
      increment_automation_success: {
        Args: { rule_uuid: string }
        Returns: undefined
      }
      increment_automation_triggered: {
        Args: { rule_uuid: string }
        Returns: undefined
      }
      increment_batch_duplicate: {
        Args: { batch_uuid: string }
        Returns: undefined
      }
      increment_batch_fail: { Args: { batch_uuid: string }; Returns: undefined }
      increment_batch_success: {
        Args: { batch_uuid: string }
        Returns: undefined
      }
      increment_landing_page_submission: {
        Args: { lp_id: string }
        Returns: undefined
      }
      increment_url_clicks: { Args: { p_url_id: string }; Returns: undefined }
      is_short_code_available:
        | { Args: { p_code: string }; Returns: boolean }
        | { Args: { p_code: string; p_header?: string }; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
      recalculate_lead_score: {
        Args: { p_contact_id: string }
        Returns: number
      }
      reset_api_daily_limits: { Args: never; Returns: undefined }
      upsert_lead_push_stat: {
        Args: { p_source: string; p_status: string; p_university_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
