import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { lead_ids, batch_id } = body;

    // Find successful leads not yet in CRM
    let query = supabase
      .from('leads')
      .select('*')
      .eq('status', 'Success')
      .limit(100);

    if (lead_ids && lead_ids.length > 0) {
      query = query.in('id', lead_ids);
    } else if (batch_id) {
      query = query.eq('batch_id', batch_id);
    }

    const { data: leads, error: leadsError } = await query;
    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, imported: 0, message: 'No leads to import' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get default pipeline stage
    const { data: defaultStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('is_default', true)
      .single();

    // Check which leads already exist in CRM by mobile
    const mobiles = leads.map(l => l.mobile);
    const { data: existingContacts } = await supabase
      .from('crm_contacts')
      .select('mobile')
      .in('mobile', mobiles);
    
    const existingMobiles = new Set((existingContacts || []).map(c => c.mobile));

    // Filter out duplicates
    const newLeads = leads.filter(l => !existingMobiles.has(l.mobile));

    if (newLeads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, imported: 0, skipped: leads.length, message: 'All leads already in CRM' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into crm_contacts
    const contactsToInsert = newLeads.map(lead => ({
      name: lead.name,
      email: lead.email || null,
      mobile: lead.mobile,
      city: lead.city || null,
      state: lead.state || null,
      course: lead.course || null,
      specialization: lead.specialization || null,
      source: lead.lead_source || 'Lead Push',
      university_id: lead.university_id || null,
      lead_id: lead.id,
      stage_id: defaultStage?.id || null,
      priority: 'medium',
      notes: `Auto-imported from Lead Push batch`,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('crm_contacts')
      .insert(contactsToInsert)
      .select('id');

    if (insertError) throw insertError;

    // Log activities for imported contacts
    if (inserted && inserted.length > 0) {
      const activities = inserted.map(contact => ({
        contact_id: contact.id,
        type: 'system',
        title: 'Lead Imported',
        description: 'Auto-imported from Lead Push system',
      }));
      await supabase.from('crm_activities').insert(activities);
    }

    console.log(`Imported ${inserted?.length || 0} leads into CRM, skipped ${leads.length - newLeads.length} duplicates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: inserted?.length || 0,
        skipped: leads.length - newLeads.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
