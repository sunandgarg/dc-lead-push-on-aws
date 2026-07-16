import { memo, useState, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link2, BarChart3, Key, Upload as UploadIcon, Heart, Globe } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UrlCreationForm } from './UrlCreationForm';
import { UrlDashboard } from './UrlDashboard';
import { UrlAnalytics } from './UrlAnalytics';
import { UrlBulkImport } from './UrlBulkImport';
import { UrlHealthCheck } from './UrlHealthCheck';
import { UrlApiAccess } from './UrlApiAccess';
import { UrlCustomDomains } from './UrlCustomDomains';

export function UrlShortenerModule() {
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardRefreshRef = useRef<(() => void) | null>(null);
  
  const activeTab = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'url-shortener' && parts[1]) {
      return parts[1];
    }
    return 'dashboard';
  }, [location.pathname]);

  const handleTabChange = (tab: string) => {
    navigate(`/url-shortener/${tab}`);
  };

  const handleUrlCreated = useCallback(() => {
    dashboardRefreshRef.current?.();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Link2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">URL Shortener</h1>
            <p className="text-muted-foreground">
              Create, manage, and track shortened URLs
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-background">
            <Link2 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="bulk-import" className="gap-2 data-[state=active]:bg-background">
            <UploadIcon className="h-4 w-4" />
            Bulk Import
          </TabsTrigger>
          <TabsTrigger value="health-check" className="gap-2 data-[state=active]:bg-background">
            <Heart className="h-4 w-4" />
            Health Check
          </TabsTrigger>
          <TabsTrigger value="custom-domains" className="gap-2 data-[state=active]:bg-background">
            <Globe className="h-4 w-4" />
            Custom Domains
          </TabsTrigger>
          <TabsTrigger value="api-access" className="gap-2 data-[state=active]:bg-background">
            <Key className="h-4 w-4" />
            API Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <UrlCreationForm onUrlCreated={handleUrlCreated} />
          <UrlDashboard onRefreshRef={dashboardRefreshRef} />
        </TabsContent>

        <TabsContent value="analytics">
          <UrlAnalytics />
        </TabsContent>

        <TabsContent value="bulk-import">
          <UrlBulkImport />
        </TabsContent>

        <TabsContent value="health-check">
          <UrlHealthCheck />
        </TabsContent>

        <TabsContent value="custom-domains">
          <UrlCustomDomains />
        </TabsContent>

        <TabsContent value="api-access">
          <UrlApiAccess />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(UrlShortenerModule);
