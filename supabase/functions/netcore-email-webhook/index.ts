import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();

    // Netcore can send single event or array of events
    const events = Array.isArray(body) ? body : [body];

    const rows = events.map((event: any) => {
      // Netcore event structure: { event, email, sg_message_id, timestamp, ... }
      const eventType = (event.event || event.EVENT || '').toLowerCase()
        .replace('spamreport', 'spam_report')
        .replace('dropped', 'block')
        .replace('invalidemail', 'invalid');

      return {
        campaign_id: event.campaign_id || event.CAMPAIGN_ID || null,
        recipient_email: event.email || event.EMAIL || event.rcpt || '',
        event_type: eventType || 'unknown',
        event_data: event,
        provider_message_id: event.sg_message_id || event.TRANSID || event.message_id || null,
        received_at: event.timestamp ? new Date(event.timestamp * 1000).toISOString() : new Date().toISOString(),
      };
    }).filter((r: any) => r.recipient_email);

    if (rows.length > 0) {
      const { error } = await supabase.from('email_events').insert(rows);
      if (error) {
        console.error('Error inserting events:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
