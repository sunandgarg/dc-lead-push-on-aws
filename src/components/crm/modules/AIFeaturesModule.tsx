import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Bot, 
  MessageSquare, 
  BarChart3,
  Sparkles,
  PhoneCall,
  Users,
  Zap,
  Brain,
  Target,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

// Sub-tabs for AI Features
const AI_TABS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'lead-scoring', label: 'AI Lead Scoring', icon: Target },
  { id: 'call-analysis', label: 'Call Analysis', icon: BarChart3 },
  { id: 'email-generator', label: 'Email Generator', icon: MessageSquare },
  { id: 'predictions', label: 'Predictions', icon: Brain },
];

// AI Lead Scoring Component
const LeadScoringTab = memo(() => {
  const { toast } = useToast();
  const [isScoring, setIsScoring] = useState(false);
  const queryClient = useQueryClient();

  // Fetch contacts for scoring
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['crm-contacts-for-scoring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleScoreAllLeads = async () => {
    setIsScoring(true);
    try {
      for (const contact of contacts) {
        const { data } = await supabase.functions.invoke('ai-gateway', {
          body: {
            action: 'score_lead',
            data: { lead: contact },
          },
        });

        if (data?.success) {
          await supabase
            .from('crm_contacts')
            .update({
              lead_score: data.score,
              lead_quality: data.quality,
              lead_score_updated_at: new Date().toISOString(),
            })
            .eq('id', contact.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['crm-contacts-for-scoring'] });
      toast({ title: 'Lead Scoring Complete', description: `Scored ${contacts.length} leads` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to score leads', variant: 'destructive' });
    } finally {
      setIsScoring(false);
    }
  };

  const scoredLeads = contacts.filter(c => c.lead_score != null);
  const hotLeads = contacts.filter(c => c.lead_quality === 'hot').length;
  const warmLeads = contacts.filter(c => c.lead_quality === 'warm').length;
  const coldLeads = contacts.filter(c => c.lead_quality === 'cold').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Lead Scoring</h3>
          <p className="text-sm text-muted-foreground">
            Automatically score leads based on engagement and profile data
          </p>
        </div>
        <Button onClick={handleScoreAllLeads} disabled={isScoring || isLoading}>
          {isScoring ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scoring...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Score All Leads
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{contacts.length}</p>
            <p className="text-sm text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{hotLeads}</p>
            <p className="text-sm text-muted-foreground">Hot Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{warmLeads}</p>
            <p className="text-sm text-muted-foreground">Warm Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{coldLeads}</p>
            <p className="text-sm text-muted-foreground">Cold Leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Lead List */}
      <Card>
        <CardHeader>
          <CardTitle>Scored Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : scoredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads scored yet. Click "Score All Leads" to start.
            </div>
          ) : (
            <div className="space-y-3">
              {scoredLeads.slice(0, 10).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {lead.name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">{lead.email || lead.mobile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">{lead.lead_score}</p>
                      <Badge variant={
                        lead.lead_quality === 'hot' ? 'destructive' :
                        lead.lead_quality === 'warm' ? 'default' : 'secondary'
                      }>
                        {lead.lead_quality}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

LeadScoringTab.displayName = 'LeadScoringTab';

// Call Analysis Component
const CallAnalysisTab = memo(() => {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast({ title: 'Please enter a call transcript', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: {
          action: 'analyze_call',
          data: { transcript, duration: 180 },
        },
      });

      if (error) throw error;
      setAnalysis(data.analysis);
      toast({ title: 'Analysis Complete' });
    } catch (error) {
      toast({ title: 'Error analyzing call', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">AI Call Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Analyze call transcripts for sentiment and actionable insights
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Transcript</CardTitle>
            <CardDescription>
              Paste or type the call conversation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter call transcript here...&#10;&#10;Example:&#10;Counselor: Hello, this is [Name] from [University]. Am I speaking with [Student]?&#10;Student: Yes, speaking.&#10;Counselor: I wanted to discuss our MBA program that you showed interest in..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[200px]"
            />
            <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Call
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Sentiment</span>
                  <Badge variant={
                    analysis.sentiment === 'positive' ? 'default' :
                    analysis.sentiment === 'negative' ? 'destructive' : 'secondary'
                  }>
                    {analysis.sentiment}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Outcome</span>
                  <Badge variant="outline">{analysis.outcome?.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Positive Signals</span>
                  <span className="font-bold text-green-500">{analysis.positive_signals}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Negative Signals</span>
                  <span className="font-bold text-red-500">{analysis.negative_signals}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Call Quality</span>
                  <Badge>{analysis.duration_quality}</Badge>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium mb-1">Suggested Next Action:</p>
                  <p className="text-sm">{analysis.suggested_next_action}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a transcript and click analyze</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

CallAnalysisTab.displayName = 'CallAnalysisTab';

// Email Generator Component
const EmailGeneratorTab = memo(() => {
  const { toast } = useToast();
  const [templateType, setTemplateType] = useState('welcome');
  const [leadName, setLeadName] = useState('');
  const [course, setCourse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; content: string } | null>(null);

  const templateTypes = [
    { id: 'welcome', label: 'Welcome Email' },
    { id: 'follow_up', label: 'Follow-up' },
    { id: 'reminder', label: 'Application Reminder' },
    { id: 'callback', label: 'Callback Request' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: {
          action: 'generate_email',
          data: {
            template_type: templateType,
            lead: { name: leadName || 'Student', course: course },
          },
        },
      });

      if (error) throw error;
      setGeneratedEmail({ subject: data.subject, content: data.content });
      toast({ title: 'Email Generated' });
    } catch (error) {
      toast({ title: 'Error generating email', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyEmail = () => {
    if (generatedEmail) {
      navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.content}`);
      toast({ title: 'Copied to clipboard' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">AI Email Generator</h3>
        <p className="text-sm text-muted-foreground">
          Generate personalized emails for leads
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generate Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Template Type</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {templateTypes.map((t) => (
                  <Button
                    key={t.id}
                    variant={templateType === t.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTemplateType(t.id)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Lead Name (optional)</Label>
              <Input
                placeholder="Enter lead name"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Course/Program (optional)</Label>
              <Input
                placeholder="e.g., MBA, BBA"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Email</CardTitle>
            {generatedEmail && (
              <Button variant="outline" size="sm" onClick={copyEmail}>
                Copy
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {generatedEmail ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="font-medium">{generatedEmail.subject}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Body</p>
                  <p className="whitespace-pre-wrap text-sm">{generatedEmail.content}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a template and generate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

EmailGeneratorTab.displayName = 'EmailGeneratorTab';

// Predictions Component
const PredictionsTab = memo(() => {
  const { toast } = useToast();
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['crm-contacts-for-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .order('lead_score', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const handlePredict = async () => {
    setIsPredicting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: {
          action: 'predict_enrollment',
          data: { contacts },
        },
      });

      if (error) throw error;
      setPredictions(data.predictions || []);
      toast({ title: 'Predictions Generated' });
    } catch (error) {
      toast({ title: 'Error generating predictions', variant: 'destructive' });
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Enrollment Predictions</h3>
          <p className="text-sm text-muted-foreground">
            AI-powered predictions for lead enrollment probability
          </p>
        </div>
        <Button onClick={handlePredict} disabled={isPredicting}>
          {isPredicting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Generate Predictions
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Probability</CardTitle>
          <CardDescription>
            Leads sorted by predicted enrollment likelihood
          </CardDescription>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Generate Predictions" to see enrollment probabilities</p>
            </div>
          ) : (
            <div className="space-y-3">
              {predictions.sort((a, b) => b.probability - a.probability).map((pred) => (
                <div key={pred.contact_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {pred.name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <p className="font-medium">{pred.name}</p>
                      <Badge variant={
                        pred.confidence === 'high' ? 'default' :
                        pred.confidence === 'medium' ? 'secondary' : 'outline'
                      }>
                        {pred.confidence} confidence
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{pred.probability}%</p>
                    <p className="text-xs text-muted-foreground">Enrollment Probability</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

PredictionsTab.displayName = 'PredictionsTab';

// Overview Tab
const OverviewTab = memo(() => {
  const { data: scoredCount = 0 } = useQuery({
    queryKey: ['ai-overview-scored'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_contacts')
        .select('id', { count: 'exact', head: true })
        .not('lead_score', 'is', null)
        .gt('lead_score', 0);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: activitiesCount = 0 } = useQuery({
    queryKey: ['ai-overview-activities'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_activities')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'call');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalContacts = 0 } = useQuery({
    queryKey: ['ai-overview-contacts'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_contacts')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const aiStats = [
    { label: 'Call Activities', value: activitiesCount.toLocaleString(), icon: PhoneCall, color: 'text-blue-500' },
    { label: 'Leads Scored', value: scoredCount.toLocaleString(), icon: Target, color: 'text-green-500' },
    { label: 'Total Contacts', value: totalContacts.toLocaleString(), icon: Users, color: 'text-purple-500' },
    { label: 'Score Coverage', value: totalContacts > 0 ? `${Math.round((scoredCount / totalContacts) * 100)}%` : '0%', icon: Brain, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {aiStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="flex items-end justify-between mt-1">
                      <span className="text-2xl font-bold">{stat.value}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Features
          </CardTitle>
          <CardDescription>
            Powered by advanced machine learning for the Indian EdTech industry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Target className="h-5 w-5" />
              <span className="text-sm">Lead Scoring</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm">Call Analysis</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm">Email Generator</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Brain className="h-5 w-5" />
              <span className="text-sm">Predictions</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

OverviewTab.displayName = 'OverviewTab';

// Main Component
export function AIFeaturesModule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleBack = () => {
    navigate('/crm');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to CRM Hub
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-purple-500" />
          AI Features
        </h1>
        <p className="text-muted-foreground">
          AI-powered lead scoring, call analysis, and smart recommendations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
          {AI_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="lead-scoring">
          <LeadScoringTab />
        </TabsContent>

        <TabsContent value="call-analysis">
          <CallAnalysisTab />
        </TabsContent>

        <TabsContent value="email-generator">
          <EmailGeneratorTab />
        </TabsContent>

        <TabsContent value="predictions">
          <PredictionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(AIFeaturesModule);
