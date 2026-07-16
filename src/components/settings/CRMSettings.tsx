import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  GitBranch, 
  Layers, 
  Target, 
  Megaphone, 
  Zap, 
  Users, 
  Map,
  Shield,
  Save
} from 'lucide-react';

interface CRMSettingsProps {
  isAdmin: boolean;
}

const SETTINGS_TABS = [
  { id: 'lead-flow', label: 'Lead Flow', icon: GitBranch },
  { id: 'lead-stage', label: 'Lead Stage', icon: Layers },
  { id: 'conversion-funnel', label: 'Conversion Funnel', icon: Target },
  { id: 'campaign-settings', label: 'Campaign Settings', icon: Megaphone },
  { id: 'lead-score', label: 'Lead Score', icon: Zap },
  { id: 'lead-allocation', label: 'Lead Allocation', icon: Users },
  { id: 'mapping-config', label: 'Mapping Configuration', icon: Map },
];

export function CRMSettings({ isAdmin }: CRMSettingsProps) {
  const [activeTab, setActiveTab] = useState('lead-flow');
  const [settings, setSettings] = useState({
    leadVerification: true,
    mobileValidation: true,
    registrationAttempts: 'on_creation',
    autoAssignment: false,
    duplicateHandling: 'skip',
    leadScoreThreshold: 50,
    autoQualifyThreshold: 80,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, save to database
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({ title: 'Settings Saved', description: 'CRM settings updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">CRM Settings</h2>
          <p className="text-muted-foreground">Configure your CRM behavior and rules</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {SETTINGS_TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="col-span-9">
          <Card>
            <CardContent className="p-6">
              {activeTab === 'lead-flow' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Lead Flow Settings</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure how leads flow through your system
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Lead Verification Settings</p>
                        <p className="text-sm text-muted-foreground">
                          Verify leads before registration
                        </p>
                      </div>
                      <Switch 
                        checked={settings.leadVerification}
                        onCheckedChange={(v) => setSettings(s => ({ ...s, leadVerification: v }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Mobile Number Validations</p>
                        <p className="text-sm text-muted-foreground">
                          Validate mobile numbers on lead creation
                        </p>
                      </div>
                      <Switch 
                        checked={settings.mobileValidation}
                        onCheckedChange={(v) => setSettings(s => ({ ...s, mobileValidation: v }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Registration Attempt Configurations</p>
                        <p className="text-sm text-muted-foreground">
                          When to log registration attempts
                        </p>
                      </div>
                      <Select 
                        value={settings.registrationAttempts}
                        onValueChange={(v) => setSettings(s => ({ ...s, registrationAttempts: v }))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_creation">On Creation</SelectItem>
                          <SelectItem value="on_update">On Creation & Update</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lead-stage' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Lead Stage Configuration</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Manage your lead pipeline stages
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    Configure stages in CRM → Lead Management → Pipeline
                  </p>
                </div>
              )}

              {activeTab === 'lead-score' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Lead Scoring Settings</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure automatic lead qualification thresholds
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Qualified Lead Threshold</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Leads with scores above this will be marked as qualified
                      </p>
                      <Input 
                        type="number"
                        value={settings.leadScoreThreshold}
                        onChange={(e) => setSettings(s => ({ ...s, leadScoreThreshold: parseInt(e.target.value) || 0 }))}
                        className="w-32"
                      />
                    </div>

                    <div>
                      <Label>Auto-Qualify Threshold</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Leads above this score auto-move to next stage
                      </p>
                      <Input 
                        type="number"
                        value={settings.autoQualifyThreshold}
                        onChange={(e) => setSettings(s => ({ ...s, autoQualifyThreshold: parseInt(e.target.value) || 0 }))}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lead-allocation' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Lead Allocation Rules</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure how leads are assigned to team members
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Auto Assignment</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically assign new leads to team members
                        </p>
                      </div>
                      <Switch 
                        checked={settings.autoAssignment}
                        onCheckedChange={(v) => setSettings(s => ({ ...s, autoAssignment: v }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Duplicate Lead Handling</p>
                        <p className="text-sm text-muted-foreground">
                          What to do when a duplicate lead is detected
                        </p>
                      </div>
                      <Select 
                        value={settings.duplicateHandling}
                        onValueChange={(v) => setSettings(s => ({ ...s, duplicateHandling: v }))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip Duplicate</SelectItem>
                          <SelectItem value="update">Update Existing</SelectItem>
                          <SelectItem value="create">Create New</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'campaign-settings' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Campaign Attribution Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure how campaigns are tracked and attributed
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    Configure campaigns in Marketing → Campaigns
                  </p>
                </div>
              )}

              {activeTab === 'conversion-funnel' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Conversion Funnel Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Define your admission funnel stages
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    Configure funnels in CRM → Analytics & Reporting
                  </p>
                </div>
              )}

              {activeTab === 'mapping-config' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Field Mapping Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Map external fields to CRM fields
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    Configure field mappings in Universities → Edit → Payload Fields
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
