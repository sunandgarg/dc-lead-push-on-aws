import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Upload, History, ArrowRight, Zap, CheckCircle2, Clock, Link2, Activity, Layers, Trash2, Globe, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataRetentionNotice } from "@/components/ui/DataRetentionNotice";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const LEAD_PUSH_MODULES = [
  {
    id: "admin",
    name: "Admin Dashboard",
    description: "Live overview of today and cumulative push stats across all universities + source history.",
    icon: LayoutDashboard,
    color: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-500",
    route: "/lead-push/admin",
    features: ["Today's KPIs", "Per-University Tiles", "DLL Usage", "Source History"],
  },
  {
    id: "universities",
    name: "Universities",
    description: "Configure university APIs, manage credentials, and set up lead routing.",
    icon: Building2,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-500",
    route: "/lead-push/universities",
    features: ["API Configuration", "Payload Mapping", "Rate Limits", "Export Config"],
  },
  {
    id: "upload",
    name: "Upload Leads",
    description: "Upload CSV files with leads and push them to university CRMs in real-time.",
    icon: Upload,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-500/10",
    textColor: "text-green-500",
    route: "/lead-push/upload",
    features: ["CSV Upload", "Column Mapping", "Validation", "Batch Processing"],
  },
  {
    id: "utm",
    name: "UTM Links",
    description: "View and manage UTM tracking links for all configured universities.",
    icon: Link2,
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-500/10",
    textColor: "text-teal-500",
    route: "/lead-push/utm",
    features: ["UTM Tracking", "Quick Copy", "University Mapping"],
  },
  {
    id: "multi-push",
    name: "Multi-Push",
    description: "Push one CSV of leads to multiple universities at once with saved presets and per-university defaults.",
    icon: Layers,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-500",
    route: "/lead-push/multi-push",
    features: ["Multi-Select", "Presets (Top 5)", "Per-Uni Defaults", "Per-Lead Report"],
  },
  {
    id: "landing-pages",
    name: "Landing Pages",
    description: "Give each landing page its own API key. Submitted leads auto-push to your chosen universities.",
    icon: Globe,
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-500",
    route: "/lead-push/landing-pages",
    features: ["Per-Page API Key", "Direct or Preset", "Default Values", "Copy Snippet"],
  },
  {
    id: "active-tasks",
    name: "Active Tasks",
    description: "Monitor all running tasks across users. Pause, resume or stop any batch.",
    icon: Activity,
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-500",
    route: "/lead-push/active-tasks",
    features: ["All Users", "Pause/Stop", "Progress Tracking", "Manual Refresh"],
  },
  {
    id: "history",
    name: "Upload History",
    description: "View past upload batches and track success rates.",
    icon: History,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-500",
    route: "/lead-push/history",
    features: ["Batch History", "Status Tracking", "Filters", "Analytics"],
  },
  {
    id: "purge-cache",
    name: "Purge Uni Cache",
    description: "Clear cached lead push data (logs, leads, batches) for a chosen university or all.",
    icon: Trash2,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-500/10",
    textColor: "text-red-500",
    route: "/lead-push/purge-cache",
    features: ["Per-University", "All Universities", "0/1/2/30 Days", "Instant"],
  },
];

interface LeadPushHubProps {
  stats?: {
    totalUniversities: number;
    totalLeadsToday: number;
    successRate: number;
    pendingLeads: number;
  };
}

const ModuleCard = memo(({ module, onSelect }: { module: (typeof LEAD_PUSH_MODULES)[0]; onSelect: () => void }) => {
  const Icon = module.icon;

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:-translate-y-1"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-xl", module.bgColor)}>
            <Icon className={cn("h-6 w-6", module.textColor)} />
          </div>
        </div>
        <CardTitle className="text-lg font-bold mt-3 group-hover:text-primary transition-colors">
          {module.name}
        </CardTitle>
        <CardDescription className="text-sm">{module.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {module.features.map((feature, idx) => (
            <span key={idx} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {feature}
            </span>
          ))}
        </div>
        <Button variant="ghost" className="w-full justify-between group-hover:bg-primary/5">
          <span>Open</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
});

ModuleCard.displayName = "ModuleCard";

const QuickStats = memo(({ stats }: { stats?: LeadPushHubProps["stats"] }) => {
  const defaultStats = {
    totalUniversities: 0,
    totalLeadsToday: 0,
    successRate: 0,
    pendingLeads: 0,
    ...stats,
  };

  const statItems = [
    { label: "Universities", value: defaultStats.totalUniversities, icon: Building2 },
    { label: "Leads Today", value: defaultStats.totalLeadsToday, icon: Upload },
    {
      label: "Success Rate",
      value: `${defaultStats.successRate}%`,
      icon: CheckCircle2,
      isGreen: defaultStats.successRate >= 80,
    },
    { label: "Pending", value: defaultStats.pendingLeads, icon: Clock, isWarning: defaultStats.pendingLeads > 0 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statItems.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    stat.isGreen ? "text-green-500" : stat.isWarning ? "text-orange-500" : "text-muted-foreground",
                  )}
                />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

QuickStats.displayName = "QuickStats";

export function LeadPushHub({ stats }: LeadPushHubProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();
  const visibleModules = useMemo(
    () =>
      isAdmin
        ? LEAD_PUSH_MODULES
        : LEAD_PUSH_MODULES.filter((module) => ["upload", "active-tasks"].includes(module.id)),
    [isAdmin],
  );
  const quickActions = useMemo(
    () =>
      isAdmin
        ? [
            { label: "Add University", icon: Building2, action: () => navigate("/lead-push/universities/add") },
            { label: "Upload Leads", icon: Upload, action: () => navigate("/lead-push/upload") },
            { label: "Active Tasks", icon: Activity, action: () => navigate("/lead-push/active-tasks") },
            { label: "View History", icon: History, action: () => navigate("/lead-push/history") },
          ]
        : [
            { label: "Upload Leads", icon: Upload, action: () => navigate("/lead-push/upload") },
            { label: "Active Tasks", icon: Activity, action: () => navigate("/lead-push/active-tasks") },
          ],
    [isAdmin, navigate],
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <DataRetentionNotice variant="banner" className="mb-6" />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lead Push</h1>
            <p className="text-muted-foreground">Push leads to university CRMs with real-time API integration</p>
          </div>
        </div>
      </div>

      <QuickStats stats={stats} />

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Modules</h2>
        <div className={cn("grid gap-6", isAdmin ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-2")}>
          {visibleModules.map((module) => (
            <ModuleCard key={module.id} module={module} onSelect={() => navigate(module.route)} />
          ))}
        </div>
      </div>

      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("grid gap-3", isAdmin ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-2")}>
            {quickActions.map((item, idx) => {
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

export default memo(LeadPushHub);
