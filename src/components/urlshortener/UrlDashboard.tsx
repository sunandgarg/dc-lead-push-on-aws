import { useState, useEffect, useCallback, memo } from 'react';
import { Search, Copy, Trash2, BarChart3, QrCode, ExternalLink, MoreHorizontal, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { truncateUrl, formatClicks } from '@/utils/base62';
import { format } from 'date-fns';
import { UrlQrCodeModal } from './UrlQrCodeModal';
import { UrlAnalyticsModal } from './UrlAnalyticsModal';
import { cn } from '@/lib/utils';

interface UrlMapping {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  clicks: number;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  is_healthy: boolean | null;
  header: string | null;
  domain: string | null;
}

interface UrlDashboardProps {
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

export const UrlDashboard = memo(function UrlDashboard({ onRefreshRef }: UrlDashboardProps) {
  const { toast } = useToast();
  const [urls, setUrls] = useState<UrlMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'clicks'>('created_at');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<UrlMapping | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  const pageSize = 20;

  const fetchUrls = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 0 : page;
      if (reset) setPage(0);

      let query = supabase
        .from('url_mappings')
        .select('*')
        .order(sortBy, { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (searchTerm) {
        query = query.or(`short_code.ilike.%${searchTerm}%,original_url.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (reset) {
        setUrls(data || []);
      } else {
        setUrls(prev => [...prev, ...(data || [])]);
      }
      setHasMore((data?.length || 0) === pageSize);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load URLs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, searchTerm, toast]);

  // Register refresh callback for parent
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = () => fetchUrls(true);
    }
    return () => {
      if (onRefreshRef) onRefreshRef.current = null;
    };
  }, [onRefreshRef, fetchUrls]);

  useEffect(() => {
    setLoading(true);
    fetchUrls(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, searchTerm]);

  const getShortUrl = (url: UrlMapping) => {
    const base = url.domain ? `https://${url.domain}` : window.location.origin;
    return url.header 
      ? `${base}/${url.header}/${url.short_code}`
      : `${base}/${url.short_code}`;
  };

  const handleCopy = async (url: UrlMapping) => {
    const shortUrl = getShortUrl(url);
    await navigator.clipboard.writeText(shortUrl);
    setCopiedId(url.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied!', description: 'URL copied to clipboard' });
  };

  const handleDelete = async (url: UrlMapping) => {
    if (!confirm('Are you sure you want to delete this URL? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('url_mappings')
        .delete()
        .eq('id', url.id);

      if (error) throw error;

      setUrls(prev => prev.filter(u => u.id !== url.id));
      toast({ title: 'Deleted', description: 'URL has been deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete URL', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (url: UrlMapping) => {
    try {
      const { error } = await supabase
        .from('url_mappings')
        .update({ is_active: !url.is_active })
        .eq('id', url.id);

      if (error) throw error;

      setUrls(prev => prev.map(u => 
        u.id === url.id ? { ...u, is_active: !u.is_active } : u
      ));
      toast({ 
        title: url.is_active ? 'Deactivated' : 'Activated', 
        description: `URL is now ${url.is_active ? 'inactive' : 'active'}` 
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to update URL', variant: 'destructive' });
    }
  };

  const getStatus = (url: UrlMapping) => {
    if (!url.is_active) return { label: 'Inactive', variant: 'secondary' as const };
    if (url.expires_at && new Date(url.expires_at) < new Date()) return { label: 'Expired', variant: 'destructive' as const };
    if (url.is_healthy === false) return { label: 'Broken', variant: 'destructive' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Your URLs</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search URLs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest</SelectItem>
                  <SelectItem value="clicks">Most Clicks</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => fetchUrls(true)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : urls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">No URLs found</p>
              <p className="text-sm">Create your first short URL above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urls.map((url) => {
                const status = getStatus(url);
                const shortUrl = getShortUrl(url);
                
                return (
                  <div 
                    key={url.id} 
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg transition-colors hover:bg-muted/30",
                      !url.is_active && "opacity-60"
                    )}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <a 
                          href={shortUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-mono text-sm font-medium text-primary hover:underline truncate"
                        >
                          {shortUrl}
                        </a>
                        <Badge variant={status.variant} className="text-xs shrink-0">
                          {status.label}
                        </Badge>
                      </div>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm text-muted-foreground truncate cursor-help">
                            {url.title || truncateUrl(url.original_url, 60)}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-md">
                          <p className="break-all">{url.original_url}</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(url.created_at), 'MMM d, yyyy')}</span>
                        <span className="font-medium">{formatClicks(url.clicks)} clicks</span>
                        {url.expires_at && (
                          <span>Expires: {format(new Date(url.expires_at), 'MMM d')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleCopy(url)}
                      >
                        {copiedId === url.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedUrl(url);
                          setShowQrModal(true);
                        }}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedUrl(url);
                          setShowAnalyticsModal(true);
                        }}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(url.original_url, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Original
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(url)}>
                            {url.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(url)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setPage(p => p + 1);
                    fetchUrls();
                  }}
                >
                  Load More
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {selectedUrl && showQrModal && (
        <UrlQrCodeModal
          url={selectedUrl}
          open={showQrModal}
          onClose={() => {
            setShowQrModal(false);
            setSelectedUrl(null);
          }}
        />
      )}

      {/* Analytics Modal */}
      {selectedUrl && showAnalyticsModal && (
        <UrlAnalyticsModal
          url={selectedUrl}
          open={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedUrl(null);
          }}
        />
      )}
    </>
  );
});

export default UrlDashboard;
