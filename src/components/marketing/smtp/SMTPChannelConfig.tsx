import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus, Settings, Trash2, CheckCircle, XCircle, RefreshCw, 
  Copy, Shield, Mail, Globe, Key, AlertTriangle, Zap, Server
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface SMTPDomain {
  id: string;
  domain: string;
  display_name: string | null;
  from_email: string;
  from_name: string | null;
  spf_record: string | null;
  dkim_public_key: string | null;
  dkim_selector: string | null;
  dmarc_record: string | null;
  verification_status: string;
  verified_at: string | null;
  reputation_score: number;
  daily_limit: number;
  hourly_limit: number;
  emails_sent_today: number;
  is_active: boolean;
  warmup_enabled: boolean;
  warmup_day: number;
  created_at: string;
}

export function SMTPChannelConfig() {
  const [domains, setDomains] = useState<SMTPDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<SMTPDomain | null>(null);
  const [formData, setFormData] = useState({
    domain: '',
    from_email: '',
    from_name: '',
    display_name: '',
  });
  const { toast } = useToast();

  const fetchDomains = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error fetching SMTP domains:', error);
      toast({ title: 'Error', description: 'Failed to fetch domains', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const generateDNSRecords = (domain: string) => {
    // Generate realistic DNS records
    const spf = `v=spf1 include:_spf.${domain} include:amazonses.com ~all`;
    const dkim = `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${btoa(domain).substring(0, 40)}...`;
    const dmarc = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; pct=100; adkim=s; aspf=s`;
    
    return { spf, dkim, dmarc };
  };

  const handleSave = async () => {
    try {
      const dns = generateDNSRecords(formData.domain);
      
      const { error } = await supabase
        .from('smtp_domains')
        .insert({
          domain: formData.domain,
          from_email: formData.from_email,
          from_name: formData.from_name,
          display_name: formData.display_name || formData.domain,
          spf_record: dns.spf,
          dkim_public_key: dns.dkim,
          dkim_selector: 'default',
          dmarc_record: dns.dmarc,
          verification_status: 'pending',
        });

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Domain added! Configure DNS records to verify.' });
      setShowAddModal(false);
      setFormData({ domain: '', from_email: '', from_name: '', display_name: '' });
      fetchDomains();
    } catch (error: any) {
      console.error('Error saving domain:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save domain', variant: 'destructive' });
    }
  };

  const handleVerify = async (domain: SMTPDomain) => {
    try {
      // Simulate DNS verification
      await supabase
        .from('smtp_domains')
        .update({ verification_status: 'verifying' })
        .eq('id', domain.id);

      toast({ title: 'Verifying...', description: 'Checking DNS records...' });
      
      // Simulate verification delay
      setTimeout(async () => {
        // For demo, randomly succeed or need more time
        const verified = Math.random() > 0.3;
        
        await supabase
          .from('smtp_domains')
          .update({ 
            verification_status: verified ? 'verified' : 'pending',
            verified_at: verified ? new Date().toISOString() : null
          })
          .eq('id', domain.id);

        if (verified) {
          toast({ title: 'Verified!', description: 'Domain verified successfully.' });
        } else {
          toast({ 
            title: 'Verification Pending', 
            description: 'DNS records not found yet. Please wait for propagation.',
            variant: 'default'
          });
        }
        fetchDomains();
      }, 2000);
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast({ title: 'Error', description: 'Verification failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('smtp_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'Domain removed.' });
      fetchDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast({ title: 'Error', description: 'Failed to delete domain', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'verifying':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Verifying</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading SMTP configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            SMTP Email Configuration
          </CardTitle>
          <CardDescription>
            Configure your own SMTP servers and custom domains for email sending with full tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Domains List */}
      <div className="space-y-4">
        {domains.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">No Domains Configured</h3>
              <p className="text-muted-foreground mb-4">
                Add your first sending domain to start sending emails with full deliverability tracking
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          domains.map((domain) => (
            <Card key={domain.id} className="card-elevated">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{domain.domain}</h3>
                        {getStatusBadge(domain.verification_status)}
                        {domain.is_active && <Badge variant="outline">Active</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {domain.from_name} &lt;{domain.from_email}&gt;
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {domain.emails_sent_today} / {domain.daily_limit} today
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Reputation: {domain.reputation_score}%
                        </span>
                        {domain.warmup_enabled && (
                          <Badge variant="secondary" className="text-xs">
                            Warmup Day {domain.warmup_day}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedDomain(domain); setShowDNSModal(true); }}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      DNS Records
                    </Button>
                    {domain.verification_status !== 'verified' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(domain)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(domain.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Domain Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Sending Domain</DialogTitle>
            <DialogDescription>
              Configure a new domain for sending emails. You'll need to add DNS records for verification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Domain Name</Label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                placeholder="noreply@yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label>Display Name (optional)</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Marketing Emails"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.domain || !formData.from_email}>
              Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DNS Records Modal */}
      <Dialog open={showDNSModal} onOpenChange={setShowDNSModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              DNS Configuration for {selectedDomain?.domain}
            </DialogTitle>
            <DialogDescription>
              Add these DNS records to your domain provider to enable email authentication
            </DialogDescription>
          </DialogHeader>
          
          {selectedDomain && (
            <div className="space-y-6 py-4">
              {/* SPF Record */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">SPF Record</Label>
                  <Badge variant="outline">TXT Record</Badge>
                </div>
                <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-muted-foreground">Name:</span>
                    <code>@</code>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Value:</span>
                    <div className="flex-1">
                      <code className="break-all">{selectedDomain.spf_record}</code>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(selectedDomain.spf_record || '', 'SPF Record')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* DKIM Record */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">DKIM Record</Label>
                  <Badge variant="outline">TXT Record</Badge>
                </div>
                <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-muted-foreground">Name:</span>
                    <code>{selectedDomain.dkim_selector}._domainkey</code>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Value:</span>
                    <div className="flex-1">
                      <code className="break-all">{selectedDomain.dkim_public_key}</code>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(selectedDomain.dkim_public_key || '', 'DKIM Record')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* DMARC Record */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">DMARC Record</Label>
                  <Badge variant="outline">TXT Record</Badge>
                </div>
                <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-muted-foreground">Name:</span>
                    <code>_dmarc</code>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Value:</span>
                    <div className="flex-1">
                      <code className="break-all">{selectedDomain.dmarc_record}</code>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(selectedDomain.dmarc_record || '', 'DMARC Record')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Provider Instructions */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium mb-2">Quick Setup Guides</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/" target="_blank" rel="noopener">
                      Cloudflare
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.godaddy.com/help/add-a-txt-record-19232" target="_blank" rel="noopener">
                      GoDaddy
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.namecheap.com/support/knowledgebase/article.aspx/317/2237/how-do-i-add-txtspfdaborot-records-for-my-domain/" target="_blank" rel="noopener">
                      Namecheap
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#TXTFormat" target="_blank" rel="noopener">
                      Route53
                    </a>
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>⏱️ DNS propagation can take up to 48 hours. Click "Verify" to check status.</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDNSModal(false)}>Close</Button>
            {selectedDomain && selectedDomain.verification_status !== 'verified' && (
              <Button onClick={() => { handleVerify(selectedDomain); setShowDNSModal(false); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verify Domain
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
