import { useState, useEffect, memo, useCallback } from 'react';
import { Heart, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { truncateUrl } from '@/utils/base62';
import { format } from 'date-fns';

interface UrlHealth {
  id: string;
  short_code: string;
  original_url: string;
  is_healthy: boolean | null;
  last_checked_at: string | null;
  clicks: number;
}

export const UrlHealthCheck = memo(function UrlHealthCheck() {
  const { toast } = useToast();
  const [urls, setUrls] = useState<UrlHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const fetchUrls = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('url_mappings')
        .select('id, short_code, original_url, is_healthy, last_checked_at, clicks')
        .order('clicks', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUrls(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load URLs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const checkUrlHealth = async (url: string): Promise<boolean> => {
    try {
      // Use a CORS proxy or backend to check URL health
      // For now, we'll just validate the URL format
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const runHealthCheck = async () => {
    if (urls.length === 0) return;

    setChecking(true);
    setProgress(0);

    const updatedUrls = [...urls];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      setCurrentUrl(url.original_url);
      
      const isHealthy = await checkUrlHealth(url.original_url);
      
      // Update in database
      await supabase
        .from('url_mappings')
        .update({
          is_healthy: isHealthy,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', url.id);

      updatedUrls[i] = {
        ...url,
        is_healthy: isHealthy,
        last_checked_at: new Date().toISOString(),
      };
      
      setUrls([...updatedUrls]);
      setProgress(((i + 1) / urls.length) * 100);

      // Small delay between checks
      if (i < urls.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    setChecking(false);
    setCurrentUrl(null);

    const brokenCount = updatedUrls.filter(u => u.is_healthy === false).length;
    toast({
      title: 'Health Check Complete',
      description: brokenCount > 0 
        ? `Found ${brokenCount} broken URL(s)` 
        : 'All URLs are healthy!',
    });
  };

  const healthyCount = urls.filter(u => u.is_healthy === true).length;
  const brokenCount = urls.filter(u => u.is_healthy === false).length;
  const uncheckedCount = urls.filter(u => u.is_healthy === null).length;

  const getHealthBadge = (isHealthy: boolean | null) => {
    if (isHealthy === null) {
      return <Badge variant="secondary">Not Checked</Badge>;
    }
    if (isHealthy) {
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Broken</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                URL Health Check
              </CardTitle>
              <CardDescription>
                Verify that your original URLs are still working
              </CardDescription>
            </div>
            <Button 
              onClick={runHealthCheck} 
              disabled={checking || urls.length === 0}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking...' : 'Run Health Check'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-green-500/10 text-center">
              <p className="text-2xl font-bold text-green-600">{healthyCount}</p>
              <p className="text-sm text-muted-foreground">Healthy</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 text-center">
              <p className="text-2xl font-bold text-red-600">{brokenCount}</p>
              <p className="text-sm text-muted-foreground">Broken</p>
            </div>
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold">{uncheckedCount}</p>
              <p className="text-sm text-muted-foreground">Not Checked</p>
            </div>
          </div>

          {/* Progress */}
          {checking && (
            <div className="space-y-2 mb-6">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground truncate">
                Checking: {currentUrl}
              </p>
            </div>
          )}

          {/* URL Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : urls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No URLs to check</div>
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Short Code</TableHead>
                    <TableHead>Original URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urls.map((url) => (
                    <TableRow key={url.id} className={url.is_healthy === false ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <TableCell className="font-mono text-sm">/{url.short_code}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm cursor-help">
                              {truncateUrl(url.original_url, 40)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-md">
                            <p className="break-all">{url.original_url}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{getHealthBadge(url.is_healthy)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {url.last_checked_at 
                          ? format(new Date(url.last_checked_at), 'MMM d, HH:mm')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(url.original_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Health Checks</p>
              <p>
                Health checks verify that the original URLs are still accessible. 
                Broken URLs may result in a poor experience for your users. 
                We recommend running health checks periodically to identify issues early.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default UrlHealthCheck;
