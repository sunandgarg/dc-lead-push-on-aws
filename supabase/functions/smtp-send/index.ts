import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SendEmailRequest {
  campaignId: string;
  testMode?: boolean;
  testEmail?: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId, testMode, testEmail }: SendEmailRequest = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch campaign with domain
    const { data: campaign, error: campaignError } = await supabase
      .from('smtp_campaigns')
      .select(`
        *,
        domain:smtp_domains(*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!campaign.domain) {
      return new Response(
        JSON.stringify({ error: 'No sending domain configured for this campaign' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check domain verification
    if (campaign.domain.verification_status !== 'verified') {
      return new Response(
        JSON.stringify({ error: 'Sending domain is not verified' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Generate tracking pixel ID and rewrite links
    const baseUrl = `${supabaseUrl}/functions/v1/smtp-tracking`;
    
    const processEmailContent = (html: string, emailLogId: string, trackingPixelId: string) => {
      // Add tracking pixel before </body>
      const trackingPixel = `<img src="${baseUrl}/open/${trackingPixelId}" width="1" height="1" style="display:none;" alt="" />`;
      let processedHtml = html.replace('</body>', `${trackingPixel}</body>`);
      
      // If no </body>, append at end
      if (!html.includes('</body>')) {
        processedHtml = html + trackingPixel;
      }
      
      return processedHtml;
    };

    // Test mode - just verify setup
    if (testMode && testEmail) {
      console.log(`Test mode: Would send to ${testEmail}`);
      
      // Create test email log
      const trackingPixelId = crypto.randomUUID();
      const { data: testLog, error: testLogError } = await supabase
        .from('smtp_email_logs')
        .insert({
          campaign_id: campaignId,
          recipient_email: testEmail,
          recipient_name: 'Test Recipient',
          domain_id: campaign.from_domain_id,
          tracking_pixel_id: trackingPixelId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (testLogError) {
        console.error('Error creating test log:', testLogError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Test email prepared for ${testEmail}`,
          trackingPixelId,
          previewUrl: `${baseUrl}/open/${trackingPixelId}`,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Update campaign status to sending
    await supabase
      .from('smtp_campaigns')
      .update({ 
        status: 'sending',
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Get recipients from campaign list or segment
    let recipients: { email: string; name?: string; variables?: any }[] = [];

    if (campaign.list_id) {
      const { data: contacts } = await supabase
        .from('marketing_list_contacts')
        .select('email, name, variables')
        .eq('list_id', campaign.list_id)
        .not('email', 'is', null);

      recipients = contacts || [];
    }

    // Check suppression list
    const { data: suppressed } = await supabase
      .from('smtp_suppression_list')
      .select('email');

    const suppressedEmails = new Set((suppressed || []).map(s => s.email.toLowerCase()));
    
    // Filter out suppressed emails
    recipients = recipients.filter(r => !suppressedEmails.has(r.email.toLowerCase()));

    console.log(`Processing ${recipients.length} recipients for campaign ${campaignId}`);

    // Create email logs and process
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const trackingPixelId = crypto.randomUUID();
        const messageId = `<${crypto.randomUUID()}@${campaign.domain.domain}>`;

        // Create email log
        const { data: emailLog, error: logError } = await supabase
          .from('smtp_email_logs')
          .insert({
            campaign_id: campaignId,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            domain_id: campaign.from_domain_id,
            message_id: messageId,
            tracking_pixel_id: trackingPixelId,
            status: 'queued',
            variables: recipient.variables,
          })
          .select()
          .single();

        if (logError) {
          console.error(`Error creating log for ${recipient.email}:`, logError);
          failedCount++;
          continue;
        }

        // Process HTML with tracking
        const processedHtml = processEmailContent(
          campaign.html_body,
          emailLog.id,
          trackingPixelId
        );

        // Variable replacement
        let finalHtml = processedHtml;
        let finalSubject = campaign.subject;
        
        if (recipient.variables) {
          for (const [key, value] of Object.entries(recipient.variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            finalHtml = finalHtml.replace(regex, String(value));
            finalSubject = finalSubject.replace(regex, String(value));
          }
        }

        // Replace common variables
        finalHtml = finalHtml.replace(/{{email}}/g, recipient.email);
        finalHtml = finalHtml.replace(/{{name}}/g, recipient.name || '');
        finalSubject = finalSubject.replace(/{{email}}/g, recipient.email);
        finalSubject = finalSubject.replace(/{{name}}/g, recipient.name || '');

        // Mark as sent (in production, this would call actual SMTP)
        await supabase
          .from('smtp_email_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', emailLog.id);

        // Log sent event
        await supabase
          .from('smtp_tracking_events')
          .insert({
            email_log_id: emailLog.id,
            event_type: 'sent',
          });

        sentCount++;

        // Rate limiting - small delay between sends
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing ${recipient.email}:`, error);
        failedCount++;
      }
    }

    // Update campaign totals
    await supabase
      .from('smtp_campaigns')
      .update({
        total_recipients: recipients.length,
        status: failedCount === recipients.length ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Update domain send count
    await supabase
      .from('smtp_domains')
      .update({
        emails_sent_today: campaign.domain.emails_sent_today + sentCount,
      })
      .eq('id', campaign.from_domain_id);

    console.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        totalRecipients: recipients.length,
        sent: sentCount,
        failed: failedCount,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in smtp-send:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
