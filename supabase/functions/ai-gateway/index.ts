import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, data } = await req.json();
    
    switch (action) {
      case 'score_lead': {
        // AI Lead Scoring logic
        const lead = data.lead;
        let score = 50; // Base score
        
        // Scoring rules based on Indian EdTech industry
        if (lead.email?.includes('.edu') || lead.email?.includes('.ac.in')) score += 15;
        if (lead.mobile?.startsWith('+91') || lead.mobile?.match(/^[6-9]\d{9}$/)) score += 10;
        if (lead.city) score += 5;
        if (lead.state) score += 5;
        if (lead.course) score += 10;
        
        // Source scoring
        const highValueSources = ['google', 'linkedin', 'referral'];
        if (highValueSources.some(s => lead.source?.toLowerCase().includes(s))) score += 15;
        
        // Time-based scoring (leads during business hours score higher)
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 18) score += 5;
        
        // Cap score at 100
        score = Math.min(score, 100);
        
        const quality = score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold';
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            score, 
            quality,
            recommendations: getRecommendations(score, quality, lead)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'analyze_call': {
        // Simulated call analysis
        const { transcript, duration, contact } = data;
        
        // Sentiment keywords
        const positiveWords = ['interested', 'yes', 'good', 'great', 'thank', 'happy', 'enroll', 'admit'];
        const negativeWords = ['no', 'not interested', 'expensive', 'later', 'busy', 'dont call'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        const lowerTranscript = (transcript || '').toLowerCase();
        
        positiveWords.forEach(word => {
          if (lowerTranscript.includes(word)) positiveCount++;
        });
        negativeWords.forEach(word => {
          if (lowerTranscript.includes(word)) negativeCount++;
        });
        
        const sentiment = positiveCount > negativeCount ? 'positive' : 
                         negativeCount > positiveCount ? 'negative' : 'neutral';
        
        const outcome = positiveCount >= 3 ? 'interested' :
                       negativeCount >= 2 ? 'not_interested' : 'follow_up_needed';
        
        return new Response(
          JSON.stringify({
            success: true,
            analysis: {
              sentiment,
              outcome,
              positive_signals: positiveCount,
              negative_signals: negativeCount,
              duration_quality: duration > 180 ? 'good' : duration > 60 ? 'average' : 'short',
              suggested_next_action: getSuggestedAction(sentiment, outcome),
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'predict_enrollment': {
        const { contacts } = data;
        
        const predictions = contacts.map((contact: any) => {
          // Simple prediction model based on available data
          let probability = 0.3; // Base probability
          
          if (contact.lead_score >= 80) probability += 0.3;
          else if (contact.lead_score >= 50) probability += 0.15;
          
          if (contact.activities_count > 5) probability += 0.1;
          if (contact.email_opens > 3) probability += 0.1;
          if (contact.stage === 'qualified' || contact.stage === 'negotiation') probability += 0.15;
          
          probability = Math.min(probability, 0.95);
          
          return {
            contact_id: contact.id,
            name: contact.name,
            probability: Math.round(probability * 100),
            confidence: probability > 0.7 ? 'high' : probability > 0.4 ? 'medium' : 'low',
          };
        });
        
        return new Response(
          JSON.stringify({ success: true, predictions }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'generate_email': {
        const { template_type, lead, context } = data;
        
        const templates: Record<string, string> = {
          welcome: `Dear ${lead?.name || 'Student'},\n\nThank you for your interest in our programs. We're excited to help you on your educational journey.\n\nOur counselor will reach out to you shortly to discuss your requirements and guide you through the admission process.\n\nBest regards,\nAdmissions Team`,
          
          follow_up: `Hi ${lead?.name || 'there'},\n\nI hope this email finds you well. I wanted to follow up on our previous conversation about ${lead?.course || 'our programs'}.\n\nDo you have any questions I can help answer? I'd be happy to schedule a call at your convenience.\n\nLooking forward to hearing from you.\n\nBest,\nAdmissions Counselor`,
          
          reminder: `Dear ${lead?.name || 'Student'},\n\nThis is a gentle reminder about your application for ${lead?.course || 'our program'}. The deadline is approaching soon.\n\nIf you need any assistance with the application process, please don't hesitate to reach out.\n\nBest regards,\nAdmissions Team`,
          
          callback: `Hi ${lead?.name || 'there'},\n\nAs requested, I'm writing to schedule a callback. Please let me know your preferred time for a quick chat.\n\nYou can reply to this email or call us directly at our helpline.\n\nLooking forward to speaking with you!\n\nBest,\nAdmissions Counselor`,
        };
        
        return new Response(
          JSON.stringify({
            success: true,
            content: templates[template_type] || templates.follow_up,
            subject: getSubjectLine(template_type, lead),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('AI Gateway error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getRecommendations(score: number, quality: string, lead: any): string[] {
  const recommendations: string[] = [];
  
  if (quality === 'hot') {
    recommendations.push('Priority follow-up within 1 hour');
    recommendations.push('Assign to senior counselor');
    recommendations.push('Schedule campus visit');
  } else if (quality === 'warm') {
    recommendations.push('Follow up within 24 hours');
    recommendations.push('Send course brochure');
    recommendations.push('Add to nurturing sequence');
  } else {
    recommendations.push('Add to long-term nurturing campaign');
    recommendations.push('Send educational content');
    recommendations.push('Re-engage after 2 weeks');
  }
  
  if (!lead.email) recommendations.push('Collect email address');
  if (!lead.course) recommendations.push('Identify course interest');
  
  return recommendations;
}

function getSuggestedAction(sentiment: string, outcome: string): string {
  if (outcome === 'interested') return 'Schedule campus visit or send application link';
  if (outcome === 'not_interested') return 'Add to re-engagement campaign';
  if (sentiment === 'positive') return 'Follow up with course details';
  if (sentiment === 'negative') return 'Send soft touch email after 1 week';
  return 'Schedule follow-up call in 3 days';
}

function getSubjectLine(template_type: string, lead: any): string {
  const subjects: Record<string, string> = {
    welcome: `Welcome to ${lead?.university || 'Our Institution'} - Your Journey Begins!`,
    follow_up: `Quick follow-up on ${lead?.course || 'your inquiry'}`,
    reminder: `Important: Application deadline approaching`,
    callback: `Your requested callback - Let's connect!`,
  };
  return subjects[template_type] || 'From Admissions Team';
}
