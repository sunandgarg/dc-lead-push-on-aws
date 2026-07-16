import { useState, useEffect, useCallback, memo } from 'react';
import { Globe, Plus, Trash2, RefreshCw, CheckCircle2, Clock, AlertCircle, Copy, Check, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomDomain {
  id: string;
  domain: string;
  status: string;
  verification_token: string;
  verified_at: string | null;
  ssl_status: string;
  dns_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  verified: { label: 'Verified', icon: CheckCircle2, variant: 'default' },
  pending: { label: 'Pending Verification', icon: Clock, variant: 'secondary' },
  failed: { label: 'Verification Failed', icon: AlertCircle, variant: 'destructive' },
};

export const UrlCustomDomains = memo(function UrlCustomDomains() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains((data as unknown as CustomDomain[]) || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load domains', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();

    const domain = newDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    if (!domain) {
      toast({ title: 'Required', description: 'Please enter a domain', variant: 'destructive' });
      return;
    }

    // Basic domain validation
    const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainRegex.test(domain)) {
      toast({ title: 'Invalid Domain', description: 'Please enter a valid domain (e.g., short.example.com)', variant: 'destructive' });
      return;
    }

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('custom_domains')
        .insert({
          user_id: user.id,
          domain,
          status: 'pending',
          dns_config: {
            type: 'CNAME',
            host: domain,
            value: window.location.hostname,
            txt_host: `_verify.${domain}`,
          },
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Duplicate', description: 'This domain is already added', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      setDomains(prev => [data as unknown as CustomDomain, ...prev]);
      setNewDomain('');
      toast({ title: 'Domain Added', description: 'Configure your DNS records to verify ownership' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add domain', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async (domain: CustomDomain) => {
    setVerifyingId(domain.id);
    try {
      // Call edge function to verify DNS
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { domainId: domain.id, domain: domain.domain, token: domain.verification_token },
      });

      if (error) throw error;

      if (data?.verified) {
        setDomains(prev =>
          prev.map(d => d.id === domain.id ? { ...d, status: 'verified', verified_at: new Date().toISOString() } : d)
        );
        toast({ title: 'Verified!', description: `${domain.domain} has been verified successfully` });
      } else {
        setDomains(prev =>
          prev.map(d => d.id === domain.id ? { ...d, status: 'pending' } : d)
        );
        toast({
          title: 'Not Verified Yet',
          description: data?.message || 'DNS records not found. Please ensure records are configured and try again (DNS can take up to 48 hours to propagate).',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Verification failed', variant: 'destructive' });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (domain: CustomDomain) => {
    if (!confirm(`Remove ${domain.domain}? Short URLs using this domain will fall back to the default domain.`)) return;

    try {
      const { error } = await supabase
        .from('custom_domains')
        .delete()
        .eq('id', domain.id);

      if (error) throw error;
      setDomains(prev => prev.filter(d => d.id !== domain.id));
      toast({ title: 'Removed', description: `${domain.domain} has been removed` });
    } catch {
      toast({ title: 'Error', description: 'Failed to remove domain', variant: 'destructive' });
    }
  };

  const copyToken = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: 'Copied!', description: 'Verification token copied' });
  };

  return (
    <div className="space-y-6">
      {/* Add Domain Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Add Custom Domain
          </CardTitle>
          <CardDescription>
            Use your own domain for short URLs. You'll need to configure DNS records to verify ownership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="e.g. link.yourdomain.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                disabled={adding}
              />
            </div>
            <Button type="submit" disabled={adding || !newDomain.trim()}>
              {adding ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Domain
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Domains List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Domains</CardTitle>
            <Button variant="outline" size="icon" onClick={fetchDomains}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="p-4 border rounded-lg space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              ))}
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="mb-1">No custom domains configured</p>
              <p className="text-sm">Add a domain above to start using it for your short URLs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => {
                const statusConfig = STATUS_CONFIG[domain.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                const dnsConfig = domain.dns_config as Record<string, string>;

                return (
                  <div key={domain.id} className="p-4 border rounded-lg space-y-4">
                    {/* Domain header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{domain.domain}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(domain.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(domain)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* DNS Configuration */}
                    {domain.status !== 'verified' && (
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Shield className="h-4 w-4 text-primary" />
                          DNS Configuration Required
                        </div>

                        <div className="space-y-3 text-sm">
                          {/* CNAME Record */}
                          <div className="p-3 bg-background rounded border">
                            <p className="font-medium text-xs text-muted-foreground mb-2">
                              Step 1: Add CNAME Record
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <Label className="text-xs text-muted-foreground">Type</Label>
                                <p className="font-mono mt-0.5">CNAME</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Host/Name</Label>
                                <p className="font-mono mt-0.5 break-all">{domain.domain}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Value/Target</Label>
                                <p className="font-mono mt-0.5 break-all">{dnsConfig.value || window.location.hostname}</p>
                              </div>
                            </div>
                          </div>

                          {/* TXT Record */}
                          <div className="p-3 bg-background rounded border">
                            <p className="font-medium text-xs text-muted-foreground mb-2">
                              Step 2: Add TXT Record (Verification)
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <Label className="text-xs text-muted-foreground">Type</Label>
                                <p className="font-mono mt-0.5">TXT</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Host/Name</Label>
                                <p className="font-mono mt-0.5 break-all">_verify.{domain.domain}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Value</Label>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <p className="font-mono break-all truncate">{domain.verification_token}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 shrink-0"
                                    onClick={() => copyToken(domain.verification_token, domain.id)}
                                  >
                                    {copiedToken === domain.id ? (
                                      <Check className="h-3 w-3 text-primary" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            DNS changes can take up to 48 hours to propagate. After configuring, click "Verify" below.
                          </p>
                        </div>

                        <Button
                          onClick={() => handleVerify(domain)}
                          disabled={verifyingId === domain.id}
                          size="sm"
                        >
                          {verifyingId === domain.id ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Verify Domain
                        </Button>
                      </div>
                    )}

                    {/* Verified info */}
                    {domain.status === 'verified' && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                        <p className="text-primary font-medium">✓ Domain verified and ready to use</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          Select this domain when creating short URLs. All links will use https://{domain.domain}/
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default UrlCustomDomains;
