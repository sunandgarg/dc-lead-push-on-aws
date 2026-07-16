import { useEffect, useState } from 'react';
import { Copy, RefreshCw, Globe, CheckCircle2, ListChecks, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PROBE_COUNT = 20;
const STORAGE_KEY = 'api-whitelist-ips';

type Environment = 'staging' | 'production';
interface IpStore {
  staging: string[];
  production: string[];
}

function loadStoredIps(): IpStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as IpStore;
  } catch {
    /* ignore */
  }
  return { staging: [], production: [] };
}

function saveStoredIps(store: IpStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function ApiWhitelistSection() {
  const [env, setEnv] = useState<Environment>('production');
  const [stored, setStored] = useState<IpStore>(loadStoredIps);
  const [probedIps, setProbedIps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const { toast } = useToast();

  const activeIps = env === 'production' ? stored.production : stored.staging;
  const hasProbed = probedIps.length > 0;

  const fetchServerIps = async () => {
    setLoading(true);
    setProgress(0);
    setProbedIps([]);
    const found = new Set<string>();
    let done = 0;
    try {
      await Promise.all(
        Array.from({ length: PROBE_COUNT }).map(async () => {
          try {
            const { data } = await supabase.functions.invoke('server-ip');
            if (data?.ip) found.add(data.ip);
          } catch (e) {
            console.warn('probe failed', e);
          } finally {
            done += 1;
            setProgress(done);
          }
        })
      );
      const sorted = Array.from(found).sort();
      setProbedIps(sorted);
      toast({
        title: 'Discovery complete',
        description: `Found ${found.size} unique outbound IP${found.size === 1 ? '' : 's'} from ${PROBE_COUNT} probes.`,
      });
    } catch (err) {
      console.error('Error fetching server IPs:', err);
      toast({ title: 'Error', description: 'Could not fetch server IPs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveProbedToEnv = () => {
    const merged = Array.from(new Set([...activeIps, ...probedIps])).sort();
    const next = { ...stored, [env]: merged };
    setStored(next);
    saveStoredIps(next);
    toast({
      title: 'Saved',
      description: `${probedIps.length} IP${probedIps.length === 1 ? '' : 's'} saved to ${env}. Total: ${merged.length}`,
    });
  };

  const downloadTxt = () => {
    if (!activeIps.length) return;
    const blob = new Blob([activeIps.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-whitelist-${env}-ips.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: `Saved as ${a.download}` });
  };

  const copyOne = async (ip: string) => {
    await navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    toast({ title: 'Copied', description: `${ip} copied to clipboard` });
    setTimeout(() => setCopiedIp(null), 1500);
  };

  const copyAll = async () => {
    if (!activeIps.length) return;
    await navigator.clipboard.writeText(activeIps.join('\n'));
    setCopiedAll(true);
    toast({ title: 'Copied', description: `All ${activeIps.length} IPs copied to clipboard` });
    setTimeout(() => setCopiedAll(false), 1500);
  };

  useEffect(() => {
    fetchServerIps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          API Whitelist - Outbound Server IPs
        </CardTitle>
        <CardDescription>
          Share these IPs with your university / API partners for whitelisting. All outbound API calls from this
          platform originate from this pool of IPs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-3">
            <Switch
              id="env-toggle"
              checked={env === 'production'}
              onCheckedChange={(checked) => setEnv(checked ? 'production' : 'staging')}
            />
            <Label htmlFor="env-toggle" className="cursor-pointer select-none">
              {env === 'production' ? 'Production' : 'Staging'}
            </Label>
          </div>
          <span className="text-xs text-muted-foreground">
            {env === 'production' ? 'Live environment IPs' : 'Test environment IPs'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecks className="h-4 w-4" />
            {loading ? (
              <span>Probing… {progress}/{PROBE_COUNT} ({probedIps.length} unique so far)</span>
            ) : (
              <span>
                {activeIps.length} unique IP{activeIps.length === 1 ? '' : 's'} in {env}
                {hasProbed && !loading && (
                  <span className="ml-1 text-xs text-muted-foreground/70">(new probe: {probedIps.length})</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasProbed && !loading && (
              <Button variant="secondary" size="sm" onClick={saveProbedToEnv}>
                <CheckCircle2 className="h-4 w-4" />
                Save probe to {env}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={downloadTxt} disabled={!activeIps.length}>
              <Download className="h-4 w-4" />
              Download .txt
            </Button>
            <Button variant="outline" size="sm" onClick={copyAll} disabled={!activeIps.length}>
              {copiedAll ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              Copy all
            </Button>
            <Button variant="outline" size="sm" onClick={fetchServerIps} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Re-scan
            </Button>
          </div>
        </div>

        {/* IP list */}
        <div className="space-y-2">
          {activeIps.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              No IPs saved for {env} yet. Click Re-scan to probe, then Save probe to {env}.
            </p>
          )}
          {activeIps.map((ip) => (
            <div key={ip} className="flex items-center gap-2">
              <Input value={ip} readOnly className="font-mono bg-muted/50" />
              <Button variant="outline" size="icon" onClick={() => copyOne(ip)}>
                {copiedIp === ip ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>

        {activeIps.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">All {env} IPs (one per line)</label>
            <Textarea readOnly value={activeIps.join('\n')} rows={Math.min(activeIps.length + 1, 10)} className="font-mono text-xs bg-muted/50" />
          </div>
        )}

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
          <p className="font-medium mb-1">Note</p>
          <p className="text-muted-foreground">
            Outbound API calls run on a pool of edge servers, so requests can originate from multiple IPs. We probe{' '}
            {PROBE_COUNT} times to surface as many as possible - re-scan periodically and share the full list with
            partners. If a partner requires a single static IP, route calls through a dedicated proxy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
