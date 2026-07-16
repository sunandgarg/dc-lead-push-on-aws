import { memo, useState, useEffect } from 'react';
import { Save, Lock, Unlock, Loader2, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RateLimitConfig {
  admin_locked: boolean;
  max_leads_per_minute: number;
}

interface DllConfig {
  admin_locked: boolean;
  max_daily_leads: number;
}

function AdminRateLimitControlInner() {
  const { toast } = useToast();
  const [config, setConfig] = useState<RateLimitConfig>({ admin_locked: false, max_leads_per_minute: 45 });
  const [dll, setDll] = useState<DllConfig>({ admin_locked: false, max_daily_leads: 1000 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDll, setSavingDll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rl, dl] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'rate_limit_config').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'dll_global_config').maybeSingle(),
      ]);
      if (cancelled) return;
      if (rl.data?.value) { try { setConfig(JSON.parse(rl.data.value)); } catch {} }
      if (dl.data?.value) { try { setDll(JSON.parse(dl.data.value)); } catch {} }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: 'rate_limit_config', value: JSON.stringify(config), description: 'Admin rate limit control' },
          { onConflict: 'key' }
        );
      if (error) throw error;
      toast({ title: 'Saved', description: `Rate limit ${config.admin_locked ? 'locked' : 'unlocked'} at ${config.max_leads_per_minute}/min` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDll = async () => {
    setSavingDll(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: 'dll_global_config', value: JSON.stringify(dll), description: 'Global daily lead limit cap' },
          { onConflict: 'key' }
        );
      if (error) throw error;
      toast({ title: 'Saved', description: `Global DLL ${dll.admin_locked ? 'locked' : 'unlocked'} at ${dll.max_daily_leads}/day` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingDll(false);
    }
  };

  if (loading) return <Card><CardContent className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {config.admin_locked ? <Lock className="h-5 w-5 text-amber-500" /> : <Unlock className="h-5 w-5 text-emerald-500" />}
            Rate Limit Control (per minute)
          </CardTitle>
          <CardDescription>
            Set maximum leads per minute globally. When locked, users cannot change per-university rate limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium text-foreground">Lock rate limit for all users</p>
              <p className="text-sm text-muted-foreground">
                {config.admin_locked
                  ? 'Users cannot change rate limits - admin value is enforced'
                  : 'Users can set their own rate limits per university'}
              </p>
            </div>
            <Switch
              checked={config.admin_locked}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, admin_locked: checked }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground">
                {config.admin_locked ? 'Enforced Max Leads/Minute' : 'Default Max Leads/Minute'}
              </label>
              <Badge variant="secondary" className="text-lg px-3 py-1">{config.max_leads_per_minute}</Badge>
            </div>
            <Slider
              value={[config.max_leads_per_minute]}
              onValueChange={(val) => setConfig(prev => ({ ...prev, max_leads_per_minute: val[0] }))}
              min={1}
              max={100}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-accent/50 text-sm">
            <p>
              <strong>Interval:</strong> {(60 / config.max_leads_per_minute).toFixed(1)}s per lead •
              <strong> Throughput:</strong> {(config.max_leads_per_minute * 60).toLocaleString()} leads/hour
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Rate Limit Settings'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className={`h-5 w-5 ${dll.admin_locked ? 'text-amber-500' : 'text-emerald-500'}`} />
            Daily Lead Limit (DLL) – Global Cap
          </CardTitle>
          <CardDescription>
            Hard ceiling on leads pushed per university per day. When locked, the smaller of (per-university DLL, global cap) is enforced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium text-foreground">Lock global DLL for all universities</p>
              <p className="text-sm text-muted-foreground">
                {dll.admin_locked
                  ? 'Effective limit = min(per-university DLL, global cap)'
                  : 'Only per-university DLL is enforced'}
              </p>
            </div>
            <Switch
              checked={dll.admin_locked}
              onCheckedChange={(checked) => setDll(prev => ({ ...prev, admin_locked: checked }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {dll.admin_locked ? 'Enforced Max Leads/Day per University' : 'Default Max Leads/Day per University'}
            </label>
            <Input
              type="number"
              min={1}
              max={1000000}
              value={dll.max_daily_leads}
              onChange={(e) => setDll(prev => ({ ...prev, max_daily_leads: Math.max(1, Number(e.target.value) || 1) }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Universities reset their counter at midnight server time.
            </p>
          </div>

          <Button onClick={handleSaveDll} disabled={savingDll} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {savingDll ? 'Saving...' : 'Save Global DLL Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const AdminRateLimitControl = memo(AdminRateLimitControlInner);
export default AdminRateLimitControl;
