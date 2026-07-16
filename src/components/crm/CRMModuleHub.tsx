import { useState, memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Megaphone, 
  Workflow, 
  BarChart3, 
  CreditCard, 
  Smartphone,
  ArrowRight,
  Sparkles,
  Target,
  MessageSquare,
  Bot,
  ClipboardList,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { appCache } from '@/hooks/useAppCache';

// Module definitions based on Automateazy
const CRM_MODULES = [
  {
    id: 'lead-management',
    name: 'Lead Management',
    description: 'Capture, organize, score, segment, and assign leads across all channels',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    status: 'active',
    features: ['Lead Capture', 'Lead Scoring', 'Segmentation', 'Assignment Rules', 'Pipeline View'],
    route: '/crm/lead-management'
  },
  {
    id: 'marketing-automation',
    name: 'Marketing Automation',
    description: 'Multi-channel campaigns with Email, SMS, WhatsApp, and automated sequences',
    icon: Megaphone,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
    status: 'active',
    features: ['Email Campaigns', 'SMS Marketing', 'WhatsApp', 'Drip Sequences', 'A/B Testing'],
    route: '/crm/marketing-automation'
  },
  {
    id: 'workflow-automation',
    name: 'Workflow Automation',
    description: 'Visual workflow builder with triggers, conditions, and automated actions',
    icon: Workflow,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500',
    status: 'active',
    features: ['Drag & Drop Builder', 'Triggers', 'Conditions', 'Actions', 'Templates'],
    route: '/crm/workflow-automation'
  },
  {
    id: 'application-management',
    name: 'Application Management',
    description: 'Form builder, document management, and application tracking workflows',
    icon: ClipboardList,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    status: 'active',
    features: ['Form Builder', 'Document Upload', 'Application Tracking', 'Review Workflow'],
    route: '/crm/application-management'
  },
  {
    id: 'ai-features',
    name: 'AI-Powered Features',
    description: 'AI voice assistant, smart dialer, call analysis, and intelligent recommendations',
    icon: Bot,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-500',
    status: 'active',
    features: ['AI Voice Bot', 'Smart Dialer', 'Call Analysis', 'Lead Scoring AI'],
    route: '/crm/ai-features'
  },
  {
    id: 'analytics-reporting',
    name: 'Analytics & Reporting',
    description: 'Dashboards, funnel analytics, custom reports, and data visualization',
    icon: BarChart3,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-500',
    status: 'active',
    features: ['Lead Analytics', 'Funnel Reports', 'Campaign ROI', 'Custom Dashboards'],
    route: '/crm/analytics-reporting'
  },
  {
    id: 'payment-billing',
    name: 'Payment & Billing',
    description: 'Payment gateway integration, invoicing, and financial tracking',
    icon: CreditCard,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    status: 'active',
    features: ['Payment Gateway', 'Invoicing', 'Payment Tracking', 'Financial Reports'],
    route: '/crm/payment-billing'
  },
  {
    id: 'funnel-campaigns',
    name: 'Funnel Campaign Engine',
    description: 'Email blast → track engagement → WhatsApp/SMS follow-up → push to university',
    icon: Target,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    status: 'active',
    features: ['Bulk Email', 'Open/Click Tracking', 'Auto Follow-up', 'University Push'],
    route: '/crm/funnel-campaigns'
  },
  {
    id: 'omnichannel',
    name: 'Omnichannel Campaigns',
    description: 'Bulk SMS, WhatsApp campaigns & email broadcasts with mobile preview',
    icon: MessageSquare,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-500/10',
    textColor: 'text-teal-500',
    status: 'active',
    features: ['Bulk SMS', 'WhatsApp Campaigns', 'Email Broadcasts', 'URL Shortener'],
    route: '/crm/omnichannel'
  },
  {
    id: 'crm-settings',
    name: 'CRM Configuration',
    description: 'Custom fields, pipeline stages, master data management',
    icon: Settings2,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    status: 'active',
    features: ['Lead Fields', 'Pipeline Stages', 'Lead Sources', 'USPs'],
    route: '/crm/crm-settings'
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'Mobile access for field staff with route planning and real-time sync',
    icon: Smartphone,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-500',
    status: 'coming-soon',
    features: ['Lead Access', 'Field Tools', 'Route Planning', 'Offline Mode'],
    route: '/crm/mobile-app'
  }
];

interface CRMModuleHubProps {
  universities: any[];
}

// Module Card Component
const ModuleCard = memo(({ module, onSelect }: { module: typeof CRM_MODULES[0]; onSelect: () => void }) => {
  const Icon = module.icon;
  const isActive = module.status === 'active';
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg border-2",
        isActive 
          ? "hover:border-primary/50 hover:-translate-y-1" 
          : "opacity-75 hover:opacity-90"
      )}
      onClick={isActive ? onSelect : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-xl", module.bgColor)}>
            <Icon className={cn("h-6 w-6", module.textColor)} />
          </div>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "text-xs",
              isActive ? "bg-green-500/10 text-green-600 border-green-500/20" : ""
            )}
          >
            {isActive ? 'Active' : 'Coming Soon'}
          </Badge>
        </div>
        <CardTitle className="text-lg font-bold mt-3 group-hover:text-primary transition-colors">
          {module.name}
        </CardTitle>
        <CardDescription className="text-sm">
          {module.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {module.features.slice(0, 4).map((feature, idx) => (
            <span 
              key={idx}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
            >
              {feature}
            </span>
          ))}
          {module.features.length > 4 && (
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              +{module.features.length - 4} more
            </span>
          )}
        </div>
        {isActive && (
          <Button 
            variant="ghost" 
            className="w-full justify-between group-hover:bg-primary/5"
          >
            <span>Open Module</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

ModuleCard.displayName = 'ModuleCard';

// Quick Stats Component
const QuickStats = memo(() => {
  const [stats, setStats] = useState([
    { label: 'Total Contacts', value: '...', change: '', positive: true },
    { label: 'Active Tasks', value: '...', change: '', positive: true },
    { label: 'Pipeline Stages', value: '...', change: '', positive: true },
    { label: 'Activities Today', value: '...', change: '', positive: true },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [contacts, tasks, stages, activities] = await Promise.all([
          supabase.from('crm_contacts').select('id', { count: 'exact', head: true }),
          supabase.from('crm_tasks').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
          supabase.from('pipeline_stages').select('id', { count: 'exact', head: true }),
          supabase.from('crm_activities').select('id', { count: 'exact', head: true }).gte('created_at', today),
        ]);
        setStats([
          { label: 'Total Contacts', value: String(contacts.count || 0), change: 'all time', positive: true },
          { label: 'Active Tasks', value: String(tasks.count || 0), change: 'pending', positive: (tasks.count || 0) > 0 },
          { label: 'Pipeline Stages', value: String(stages.count || 0), change: 'configured', positive: true },
          { label: 'Activities Today', value: String(activities.count || 0), change: 'today', positive: true },
        ]);
      } catch (e) { console.error(e); }
    })();
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, idx) => (
        <Card key={idx} className="border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold">{stat.value}</span>
              <span className={cn(
                "text-xs font-medium",
                stat.positive ? "text-green-500" : "text-orange-500"
              )}>
                {stat.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

QuickStats.displayName = 'QuickStats';

export function CRMModuleHub({ universities: _universities }: CRMModuleHubProps) {
  const navigate = useNavigate();
  const handleModuleSelect = (moduleId: string, route: string) => {
    appCache.setCrmSubTab(moduleId);
    navigate(route);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM Suite</h1>
            <p className="text-muted-foreground">
              Complete customer relationship management powered by automation
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Module Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Modules</h2>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/crm/config')}>
            <Settings2 className="h-4 w-4" />
            Customize
          </Button>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CRM_MODULES.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onSelect={() => handleModuleSelect(module.id, module.route)}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add New Lead', icon: Users, action: () => navigate('/crm/lead-management/contacts') },
              { label: 'Create Campaign', icon: Megaphone, action: () => navigate('/crm/marketing-automation/campaigns') },
              { label: 'Build Workflow', icon: Workflow, action: () => navigate('/crm/workflow-automation') },
              { label: 'View Reports', icon: BarChart3, action: () => navigate('/crm/analytics-reporting') },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Button 
                  key={idx} 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2 hover:bg-primary/5"
                  onClick={item.action}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(CRMModuleHub);
