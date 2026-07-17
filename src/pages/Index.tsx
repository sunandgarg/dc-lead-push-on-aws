import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TabNavigation } from '@/components/TabNavigation';
import { SettingsTab } from '@/components/settings/SettingsTab';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { AddUniversityModal, UniversityFormData } from '@/components/universities/AddUniversityModal';
import { EditUniversityModal, UniversityEditData } from '@/components/universities/EditUniversityModal';
import { CRMModule } from '@/components/crm/CRMModule';
import { LeadPushModule } from '@/components/leadpush/LeadPushModule';
import { UrlShortenerModule } from '@/components/urlshortener/UrlShortenerModule';
import { AllLeadsPage } from '@/components/lms/AllLeadsPage';
import { ApiConnectionsPage } from '@/components/lms/ApiConnectionsPage';
import { AdPlatformsPage } from '@/components/lms/AdPlatformsPage';
import { AutomationRulesPage } from '@/components/lms/AutomationRulesPage';
import { TelecallerManagement } from '@/components/telecaller/TelecallerManagement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { appCache } from '@/hooks/useAppCache';
import { LogOut } from 'lucide-react';
import UniversityTracker from '@/components/admin/UniversityTracker';

// Memoize heavy components to prevent re-renders
const MemoizedCRMModule = memo(CRMModule);
const MemoizedDashboardTab = memo(DashboardTab);
const MemoizedLeadPushModule = memo(LeadPushModule);
const MemoizedUrlShortenerModule = memo(UrlShortenerModule);

// Utility to create URL-safe slug from name
const toSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const INITIAL_LOAD_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      value => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      error => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const hasInitialized = useRef(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { isAdmin, loading: adminAuthLoading } = useAdminAuth();

  // Parse route to get active tab and sub-routes
  const { activeTab, subRoute, universitySlug } = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const tab = pathParts[0] || 'dashboard';
    const sub = pathParts[1] || null;
    const uniSlug = tab === 'lead-push' && sub === 'upload' ? pathParts[2] : null;

    // Update cache
    appCache.setActiveTab(tab);
    appCache.setLastRoute(location.pathname);
    if (uniSlug) appCache.setUploadSelectedUniversity(uniSlug);

    return { activeTab: tab, subRoute: sub, universitySlug: uniSlug };
  }, [location.pathname]);

  // Initialize state from persistent cache
  const [universities, setUniversitiesState] = useState<any[]>(() => appCache.universities || []);
  const [logs, setLogsState] = useState<any[]>(() => appCache.logs || []);
  const [batches, setBatchesState] = useState<any[]>(() => appCache.batches || []);
  const [loading, setLoading] = useState(() => !appCache.hasData());
  const [startupError, setStartupError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<UniversityEditData | null>(null);
  const [selectedUploadUniversity, setSelectedUploadUniversityState] = useState<any | null>(() => {
    // Try to restore from cache immediately on init
    const cachedSlug = appCache.uploadSelectedUniversity;
    if (cachedSlug && appCache.universities) {
      const uni = appCache.universities.find((u: any) => 
        u.slug === cachedSlug || 
        u.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === cachedSlug
      );
      return uni || null;
    }
    return null;
  });

  // Restore selected university from cache when universities are loaded (if not already set)
  useEffect(() => {
    if (universities.length > 0 && !selectedUploadUniversity) {
      const cachedSlug = appCache.uploadSelectedUniversity;
      if (cachedSlug) {
        const uni = universities.find(u => 
          u.slug === cachedSlug || 
          u.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === cachedSlug
        );
        if (uni) {
          setSelectedUploadUniversityState(uni);
        }
      }
    }
  }, [universities, selectedUploadUniversity]);

  // Track user changes
  useEffect(() => {
    if (user?.id) {
      appCache.setUserId(user.id);
    }
  }, [user?.id]);

  // Wrapper functions that update both state and cache
  const setUniversities = useCallback((data: any[]) => {
    setUniversitiesState(data);
    appCache.setUniversities(data);
  }, []);

  const setLogs = useCallback((data: any[]) => {
    setLogsState(data);
    appCache.setLogs(data);
  }, []);

  const setBatches = useCallback((data: any[]) => {
    setBatchesState(data);
    appCache.setBatches(data);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    if (tab !== activeTab) {
      appCache.setActiveTab(tab);
      navigate(`/${tab}`, { replace: false });
    }
  }, [activeTab, navigate]);

  useEffect(() => {
    if (adminAuthLoading || isAdmin) return;

    const userAllowedLeadPushRoutes = new Set(['upload', 'active-tasks']);
    const isAllowedUserRoute = activeTab === 'lead-push' && subRoute && userAllowedLeadPushRoutes.has(subRoute);

    if (!isAllowedUserRoute) {
      navigate('/lead-push/upload', { replace: true });
    }
  }, [activeTab, subRoute, isAdmin, adminAuthLoading, navigate]);

  const fetchUniversities = useCallback(async () => {
    try {
      const { data: unis, error } = await supabase
        .from('universities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Batch fetch related data for performance
      const uniIds = (unis || []).map(u => u.id);
      
      const [programsRes, stateCitiesRes, coursesRes, customColumnsRes] = await Promise.all([
        supabase.from('programs').select('name, university_id').in('university_id', uniIds),
        supabase.from('state_cities').select('state, city, university_id').in('university_id', uniIds),
        supabase.from('course_specializations').select('course, specialization, university_id').in('university_id', uniIds),
        supabase.from('custom_columns').select('id, column_name, column_key, is_required, sort_order, university_id').in('university_id', uniIds).order('sort_order'),
      ]);

      // Fetch custom column values
      const columnIds = (customColumnsRes.data || []).map(c => c.id);
      const { data: columnValues } = columnIds.length > 0 
        ? await supabase.from('custom_column_values').select('value, parent_value_id, column_id').in('column_id', columnIds)
        : { data: [] };

      // Group data by university ID
      const programsByUni = new Map<string, string[]>();
      const stateCitiesByUni = new Map<string, any[]>();
      const coursesByUni = new Map<string, any[]>();
      const columnsByUni = new Map<string, any[]>();

      (programsRes.data || []).forEach(p => {
        if (!programsByUni.has(p.university_id)) programsByUni.set(p.university_id, []);
        programsByUni.get(p.university_id)!.push(p.name);
      });

      (stateCitiesRes.data || []).forEach(sc => {
        if (!stateCitiesByUni.has(sc.university_id)) stateCitiesByUni.set(sc.university_id, []);
        stateCitiesByUni.get(sc.university_id)!.push({ state: sc.state, city: sc.city });
      });

      (coursesRes.data || []).forEach(c => {
        if (!coursesByUni.has(c.university_id)) coursesByUni.set(c.university_id, []);
        coursesByUni.get(c.university_id)!.push({ course: c.course, specialization: c.specialization });
      });

      const valuesByColumn = new Map<string, any[]>();
      (columnValues || []).forEach(v => {
        if (!valuesByColumn.has(v.column_id)) valuesByColumn.set(v.column_id, []);
        valuesByColumn.get(v.column_id)!.push({ value: v.value, parentValue: undefined });
      });

      (customColumnsRes.data || []).forEach(col => {
        if (!columnsByUni.has(col.university_id)) columnsByUni.set(col.university_id, []);
        columnsByUni.get(col.university_id)!.push({
          columnKey: col.column_key,
          columnName: col.column_name,
          isRequired: col.is_required,
          sortOrder: col.sort_order,
          values: valuesByColumn.get(col.id) || [],
        });
      });

      const enrichedUnis = (unis || []).map(uni => ({
        ...uni,
        slug: toSlug(uni.name),
        column_mapping: typeof uni.column_mapping === 'object' && uni.column_mapping !== null ? uni.column_mapping : {},
        programs: programsByUni.get(uni.id) || [],
        stateCities: stateCitiesByUni.get(uni.id) || [],
        courseSpecializations: coursesByUni.get(uni.id) || [],
        customColumns: columnsByUni.get(uni.id) || [],
      }));

      setUniversities(enrichedUnis);
    } catch (error) {
      console.error('Error fetching universities:', error);
      toast({ title: 'Error', description: 'Failed to fetch universities', variant: 'destructive' });
    }
  }, [toast, setUniversities]);

  const fetchLogs = useCallback(async () => {
    try {
      const [logsRes, batchesRes] = await Promise.all([
        supabase
          .from('api_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('upload_batches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (logsRes.error) throw logsRes.error;

      const logsWithNames = (logsRes.data || []).map(log => {
        const uni = universities.find(u => u.id === log.university_id);
        return { ...log, universityName: uni?.name || 'Unknown' };
      });

      setLogs(logsWithNames);
      setBatches(batchesRes.data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  }, [universities, setLogs, setBatches]);

  // Handle visibility change - save scroll position only, NO refetching on tab switch
  // This prevents the "refresh every time I come back" problem
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save current scroll position when tab is hidden
        appCache.setScrollPosition(location.pathname, window.scrollY);
      }
      // IMPORTANT: Do NOT fetch anything when tab becomes visible
      // This was causing the constant refresh issue on tab switch
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [location.pathname]);

  // Initialize data only once
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initData = async () => {
      try {
        if (!appCache.hasData() || appCache.isStale()) {
          await withTimeout(
            fetchUniversities(),
            INITIAL_LOAD_TIMEOUT_MS,
            'Supabase did not respond within 15 seconds.',
          );
        }
      } catch (error) {
        console.error('Initial data load failed:', error);
        setStartupError(error instanceof Error ? error.message : 'Could not load data from Supabase.');
      } finally {
        // Never leave the whole application behind an infinite loading screen.
        // Users can still navigate and retry if Supabase or the network is unavailable.
        setLoading(false);
      }
    };

    initData();
  }, [fetchUniversities]);

  const retryInitialLoad = useCallback(async () => {
    setStartupError(null);
    try {
      await withTimeout(
        fetchUniversities(),
        INITIAL_LOAD_TIMEOUT_MS,
        'Supabase did not respond within 15 seconds.',
      );
    } catch (error) {
      console.error('Data reload failed:', error);
      setStartupError(error instanceof Error ? error.message : 'Could not load data from Supabase.');
    }
  }, [fetchUniversities]);

  // Fetch logs when universities are loaded
  useEffect(() => {
    if (universities.length > 0 && !appCache.logs) {
      fetchLogs();
    }
  }, [universities.length, fetchLogs]);

  // Modal handlers
  const openAddModal = useCallback(() => {
    navigate('/lead-push/universities/add');
    setIsModalOpen(true);
  }, [navigate]);

  const closeAddModal = useCallback(() => {
    navigate('/lead-push/universities');
    setIsModalOpen(false);
  }, [navigate]);

  const handleAddUniversity = async (formData: UniversityFormData) => {
    try {
      const { data: newUni, error } = await supabase
        .from('universities')
        .insert({
          name: formData.name,
          api_url: formData.apiUrl,
          college_id: formData.collegeId,
          secret_key: formData.secretKey,
          source: formData.source,
          medium: formData.medium,
          campaign: formData.campaign,
          leads_per_minute: formData.leadsPerMinute,
          api_timeout_seconds: formData.apiTimeoutSeconds,
          default_push_concurrency: formData.defaultPushConcurrency,
          daily_lead_limit: formData.dailyLeadLimit ?? null,
          status: formData.status || 'live',
          api_type: formData.apiType,
          column_mapping: formData.columnMapping,
          utm_link: formData.utmLink || null,
          publisher_panel_url: formData.publisherPanelUrl || null,
          publisher_id: formData.publisherId || null,
          auth_type: formData.authType || 'secret_key',
          auth_header_key: formData.authHeaderKey || null,
          auth_header_value: formData.authHeaderValue || null,
          payload_wrapper: formData.payloadWrapper || 'object',
          custom_headers: formData.customHeaders || {},
          default_values: formData.defaultValues || {},
        })
        .select()
        .single();

      if (error) throw error;

      if (formData.programs.length > 0) {
        await supabase.from('programs').insert(
          formData.programs.map(name => ({ university_id: newUni.id, name }))
        );
      }
      if (formData.stateCities.length > 0) {
        await supabase.from('state_cities').insert(
          formData.stateCities.map(sc => ({ university_id: newUni.id, state: sc.state, city: sc.city }))
        );
      }
      if (formData.courseSpecializations.length > 0) {
        await supabase.from('course_specializations').insert(
          formData.courseSpecializations.map(cs => ({ university_id: newUni.id, course: cs.course, specialization: cs.specialization }))
        );
      }

      if (formData.customColumns && formData.customColumns.length > 0) {
        for (const col of formData.customColumns) {
          const { data: columnData, error: colError } = await supabase
            .from('custom_columns')
            .insert({
              university_id: newUni.id,
              column_name: col.columnName,
              column_key: col.columnKey,
              is_required: col.isRequired,
              sort_order: col.sortOrder,
            })
            .select()
            .single();

          if (colError) throw colError;

          if (col.values.length > 0) {
            await supabase.from('custom_column_values').insert(
              col.values.map(v => ({
                university_id: newUni.id,
                column_id: columnData.id,
                value: v.value,
                parent_column_id: null,
                parent_value_id: null,
              }))
            );
          }
        }
      }

      toast({ title: 'Success', description: 'University added successfully!' });
      fetchUniversities();
      closeAddModal();
    } catch (error) {
      console.error('Error adding university:', error);
      toast({ title: 'Error', description: 'Failed to add university', variant: 'destructive' });
    }
  };

  const handleEditUniversity = useCallback((uni: any) => {
    setEditingUniversity({
      id: uni.id,
      name: uni.name,
      apiUrl: uni.api_url,
      collegeId: uni.college_id,
      secretKey: uni.secret_key,
      source: uni.source || 'dekhocampus',
      medium: uni.medium || 'dekhocampus',
      campaign: uni.campaign || 'API',
      leadsPerMinute: uni.leads_per_minute || 90,
      apiTimeoutSeconds: uni.api_timeout_seconds ?? 30,
      defaultPushConcurrency: uni.default_push_concurrency ?? 2,
      dailyLeadLimit: uni.daily_lead_limit ?? null,
      status: (uni.status === 'disabled' ? 'disabled' : 'live'),
      apiType: uni.api_type || 'nopaperforms',
      utmLink: uni.utm_link || '',
      publisherPanelUrl: uni.publisher_panel_url || '',
      publisherId: uni.publisher_id || '',
      authType: uni.auth_type || 'secret_key',
      authHeaderKey: uni.auth_header_key || 'Authorization',
      authHeaderValue: uni.auth_header_value || '',
      payloadWrapper: uni.payload_wrapper || 'object',
      customHeaders: uni.custom_headers || {},
      programs: uni.programs || [],
      stateCities: uni.stateCities || [],
      courseSpecializations: uni.courseSpecializations || [],
      columnMapping: uni.column_mapping || {},
      sampleCsvContent: uni.sample_csv_content || '',
    });
    navigate(`/lead-push/universities/edit/${uni.slug || uni.id}`);
    setIsEditModalOpen(true);
  }, [navigate]);

  const closeEditModal = useCallback(() => {
    navigate('/lead-push/universities');
    setIsEditModalOpen(false);
    setEditingUniversity(null);
  }, [navigate]);

  const handleSaveEdit = async (formData: UniversityEditData) => {
    try {
      const { error } = await supabase
        .from('universities')
        .update({
          name: formData.name,
          api_url: formData.apiUrl,
          college_id: formData.collegeId,
          secret_key: formData.secretKey,
          source: formData.source,
          medium: formData.medium,
          campaign: formData.campaign,
          leads_per_minute: formData.leadsPerMinute,
          api_timeout_seconds: formData.apiTimeoutSeconds,
          default_push_concurrency: formData.defaultPushConcurrency,
          daily_lead_limit: formData.dailyLeadLimit ?? null,
          status: formData.status || 'live',
          api_type: formData.apiType,
          column_mapping: formData.columnMapping,
          sample_csv_content: formData.sampleCsvContent || null,
          utm_link: formData.utmLink || null,
          publisher_panel_url: formData.publisherPanelUrl || null,
          publisher_id: formData.publisherId || null,
          auth_type: formData.authType || 'secret_key',
          auth_header_key: formData.authHeaderKey || null,
          auth_header_value: formData.authHeaderValue || null,
          payload_wrapper: formData.payloadWrapper || 'object',
          custom_headers: formData.customHeaders || {},
        })
        .eq('id', formData.id);

      if (error) throw error;

      await Promise.all([
        supabase.from('programs').delete().eq('university_id', formData.id),
        supabase.from('state_cities').delete().eq('university_id', formData.id),
        supabase.from('course_specializations').delete().eq('university_id', formData.id),
      ]);

      if (formData.programs.length > 0) {
        await supabase.from('programs').insert(
          formData.programs.map(name => ({ university_id: formData.id, name }))
        );
      }
      if (formData.stateCities.length > 0) {
        await supabase.from('state_cities').insert(
          formData.stateCities.map(sc => ({ university_id: formData.id, state: sc.state, city: sc.city }))
        );
      }
      if (formData.courseSpecializations.length > 0) {
        await supabase.from('course_specializations').insert(
          formData.courseSpecializations.map(cs => ({ university_id: formData.id, course: cs.course, specialization: cs.specialization }))
        );
      }

      // Refresh before closing so the active upload view receives the exact
      // saved timeout/concurrency rather than a stale cached university row.
      await fetchUniversities();
      toast({ title: 'Success', description: 'University updated successfully!' });
      closeEditModal();
    } catch (error) {
      console.error('Error updating university:', error);
      toast({ title: 'Error', description: 'Failed to update university', variant: 'destructive' });
    }
  };

  // Keep the university selected on the upload page in sync with refreshed
  // database records. This is particularly important after editing the API
  // timeout or the "leads at one time" default.
  useEffect(() => {
    setSelectedUploadUniversityState((current) => {
      if (!current?.id) return current;
      return universities.find((university) => university.id === current.id) || current;
    });
  }, [universities]);

  const handleDeleteUniversity = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this university? This action cannot be undone.')) {
      return;
    }
    
    try {
      await Promise.all([
        supabase.from('programs').delete().eq('university_id', id),
        supabase.from('state_cities').delete().eq('university_id', id),
        supabase.from('course_specializations').delete().eq('university_id', id),
      ]);

      const { error } = await supabase
        .from('universities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'University deleted successfully' });
      fetchUniversities();
    } catch (error) {
      console.error('Error deleting university:', error);
      toast({ title: 'Error', description: 'Failed to delete university', variant: 'destructive' });
    }
  };

  const handleBulkDeleteUniversities = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return;

    try {
      await Promise.all([
        supabase.from('programs').delete().in('university_id', uniqueIds),
        supabase.from('state_cities').delete().in('university_id', uniqueIds),
        supabase.from('course_specializations').delete().in('university_id', uniqueIds),
      ]);

      const { error } = await supabase
        .from('universities')
        .delete()
        .in('id', uniqueIds);

      if (error) throw error;

      setSelectedUploadUniversityState((current) => (current?.id && uniqueIds.includes(current.id) ? null : current));
      toast({ title: 'Deleted', description: `${uniqueIds.length} universities deleted successfully` });
      fetchUniversities();
    } catch (error) {
      console.error('Error bulk deleting universities:', error);
      toast({ title: 'Error', description: 'Failed to delete universities', variant: 'destructive' });
    }
  };

  const handleSelectUploadUniversity = useCallback((uni: any) => {
    setSelectedUploadUniversityState(uni);
    const slug = uni.slug || uni.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    appCache.setUploadSelectedUniversity(slug);
  }, []);

  const handleBulkImport = useCallback(async (configs: any[]) => {
    // Every scalar/jsonb column on public.universities (excluding auto-managed id/created_at/updated_at
    // and runtime counters daily_pushed_count / daily_count_reset_at).
    // Values are picked from BOTH camelCase and snake_case keys so any prior export shape works.
    const pick = (cfg: any, snake: string, camel: string, fallback: any = null) => {
      const v = cfg[camel] ?? cfg[snake];
      return v === undefined ? fallback : v;
    };

    const buildRow = (cfg: any) => ({
      name: cfg.name,
      api_url: pick(cfg, 'api_url', 'apiUrl', ''),
      college_id: pick(cfg, 'college_id', 'collegeId', ''),
      secret_key: pick(cfg, 'secret_key', 'secretKey', ''),
      source: cfg.source ?? 'dekhocampus',
      medium: cfg.medium ?? 'dekhocampus',
      campaign: cfg.campaign ?? 'API',
      api_type: pick(cfg, 'api_type', 'apiType', 'nopaperforms'),
      leads_per_minute: pick(cfg, 'leads_per_minute', 'leadsPerMinute', 90),
      api_timeout_seconds: pick(cfg, 'api_timeout_seconds', 'apiTimeoutSeconds', String(cfg?.api_url ?? cfg?.apiUrl ?? '').toLowerCase().includes('ctpl') ? 90 : 30),
      default_push_concurrency: pick(cfg, 'default_push_concurrency', 'defaultPushConcurrency', 2),
      column_mapping: pick(cfg, 'column_mapping', 'columnMapping', {}),
      auto_retry_enabled: pick(cfg, 'auto_retry_enabled', 'autoRetryEnabled', false),
      auto_retry_delay_minutes: pick(cfg, 'auto_retry_delay_minutes', 'autoRetryDelayMinutes', null),
      auto_retry_max_attempts: pick(cfg, 'auto_retry_max_attempts', 'autoRetryMaxAttempts', null),
      sample_csv_content: pick(cfg, 'sample_csv_content', 'sampleCsvContent', null),
      utm_link: pick(cfg, 'utm_link', 'utmLink', null),
      daily_limit: pick(cfg, 'daily_limit', 'dailyLimit', null),
      admission_commitment: pick(cfg, 'admission_commitment', 'admissionCommitment', null),
      contact_person_name: pick(cfg, 'contact_person_name', 'contactPersonName', null),
      contact_person_mobile: pick(cfg, 'contact_person_mobile', 'contactPersonMobile', null),
      contact_person_email: pick(cfg, 'contact_person_email', 'contactPersonEmail', null),
      whatsapp_group_link: pick(cfg, 'whatsapp_group_link', 'whatsappGroupLink', null),
      deal_price: pick(cfg, 'deal_price', 'dealPrice', null),
      gst_inclusive: pick(cfg, 'gst_inclusive', 'gstInclusive', null),
      city: cfg.city ?? null,
      state: cfg.state ?? null,
      publisher_panel_url: pick(cfg, 'publisher_panel_url', 'publisherPanelUrl', null),
      publisher_id: pick(cfg, 'publisher_id', 'publisherId', null),
      custom_headers: pick(cfg, 'custom_headers', 'customHeaders', {}),
      auth_type: pick(cfg, 'auth_type', 'authType', 'secret_key'),
      auth_header_key: pick(cfg, 'auth_header_key', 'authHeaderKey', null),
      auth_header_value: pick(cfg, 'auth_header_value', 'authHeaderValue', null),
      payload_wrapper: pick(cfg, 'payload_wrapper', 'payloadWrapper', 'object'),
      default_values: pick(cfg, 'default_values', 'defaultValues', {}),
      daily_lead_limit: pick(cfg, 'daily_lead_limit', 'dailyLeadLimit', null),
      status: cfg.status ?? 'live',
    });

    try {
      let importedCount = 0;
      const failures: string[] = [];
      for (const cfg of configs) {
        if (!cfg?.name) { failures.push('(unnamed)'); continue; }
        const { data: newUni, error } = await supabase
          .from('universities')
          .insert(buildRow(cfg))
          .select()
          .single();

        if (error) {
          console.error(`Failed to import ${cfg.name}:`, error);
          failures.push(`${cfg.name}: ${error.message}`);
          continue;
        }

        // Related tables
        if (cfg.programs?.length > 0) {
          await supabase.from('programs').insert(
            cfg.programs.map((name: string) => ({ university_id: newUni.id, name }))
          );
        }
        if (cfg.stateCities?.length > 0) {
          await supabase.from('state_cities').insert(
            cfg.stateCities.map((sc: any) => ({ university_id: newUni.id, state: sc.state, city: sc.city }))
          );
        }
        if (cfg.courseSpecializations?.length > 0) {
          await supabase.from('course_specializations').insert(
            cfg.courseSpecializations.map((cs: any) => ({ university_id: newUni.id, course: cs.course, specialization: cs.specialization }))
          );
        }
        if (cfg.customColumns?.length > 0) {
          for (const col of cfg.customColumns) {
            const { data: columnData, error: colError } = await supabase
              .from('custom_columns')
              .insert({
                university_id: newUni.id,
                column_name: col.columnName,
                column_key: col.columnKey,
                is_required: !!col.isRequired,
                sort_order: col.sortOrder ?? 0,
              })
              .select()
              .single();
            if (!colError && col.values?.length > 0) {
              await supabase.from('custom_column_values').insert(
                col.values.map((v: any) => ({
                  university_id: newUni.id,
                  column_id: columnData.id,
                  value: v.value,
                }))
              );
            }
          }
        }
        importedCount++;
      }
      toast({
        title: 'Bulk Import Complete',
        description: failures.length
          ? `${importedCount}/${configs.length} imported. Failures: ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '…' : ''}`
          : `${importedCount} of ${configs.length} universities imported successfully`,
        variant: failures.length ? 'destructive' : 'default',
      });
      fetchUniversities();
    } catch (error) {
      console.error('Bulk import error:', error);
      toast({ title: 'Error', description: 'Bulk import failed', variant: 'destructive' });
    }
  }, [toast, fetchUniversities]);

  if (loading || adminAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} isAdmin={isAdmin} />

      {startupError && (
        <div className="mx-4 mt-4 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span>Could not load Supabase data: {startupError}</span>
          <Button variant="outline" size="sm" onClick={retryInitialLoad}>
            Retry
          </Button>
        </div>
      )}

      <main className="pb-16">
        {/* All Leads */}
        {isAdmin && <div className={activeTab === 'all-leads' ? '' : 'hidden'}>
          <AllLeadsPage />
        </div>}

        {/* Dashboard */}
        {isAdmin && <div className={activeTab === 'dashboard' ? '' : 'hidden'}>
          <MemoizedDashboardTab />
        </div>}

        {/* CRM (includes Marketing) */}
        {isAdmin && <div className={activeTab === 'crm' ? '' : 'hidden'}>
          <MemoizedCRMModule universities={universities} />
        </div>}

        {/* Lead Push (Universities, Upload, History, Logs) */}
        <div className={activeTab === 'lead-push' ? '' : 'hidden'}>
          <MemoizedLeadPushModule
            universities={universities}
            logs={logs}
            batches={batches}
            onUniversitiesChange={fetchUniversities}
            onAddUniversity={openAddModal}
            onEditUniversity={handleEditUniversity}
            onDeleteUniversity={handleDeleteUniversity}
            onBulkDeleteUniversities={handleBulkDeleteUniversities}
            onSelectUploadUniversity={handleSelectUploadUniversity}
            selectedUploadUniversity={selectedUploadUniversity}
            onBulkImport={handleBulkImport}
          />
        </div>

        {/* Connections - API Keys */}
        {isAdmin && <div className={activeTab === 'connections' ? '' : 'hidden'}>
          <div className="container mx-auto px-4 pt-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant={!location.pathname.includes('ad-platforms') ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate('/connections')}
              >
                API Keys
              </Button>
              <Button
                variant={location.pathname.includes('ad-platforms') ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate('/connections/ad-platforms')}
              >
                Ad Platforms
              </Button>
            </div>
          </div>
          {location.pathname.includes('ad-platforms') ? <AdPlatformsPage /> : <ApiConnectionsPage />}
        </div>}

        {/* Automation */}
        {isAdmin && <div className={activeTab === 'automation' ? '' : 'hidden'}>
          <AutomationRulesPage />
        </div>}

        {/* URL Shortener */}
        {isAdmin && <div className={activeTab === 'url-shortener' ? '' : 'hidden'}>
          <MemoizedUrlShortenerModule />
        </div>}

        {/* University Tracker (Admin Only) */}
        {isAdmin && (
          <div className={activeTab === 'uni-tracker' ? '' : 'hidden'}>
            <UniversityTracker />
          </div>
        )}

        {/* Telecaller Management */}
        {isAdmin && <div className={activeTab === 'telecaller-mgmt' ? '' : 'hidden'}>
          <div className="container mx-auto px-4 pt-4">
            <TelecallerManagement />
          </div>
        </div>}

        {/* Settings */}
        {isAdmin && <div className={activeTab === 'settings' ? '' : 'hidden'}>
          <SettingsTab
            defaultLeadsPerMinute={5}
            onSaveSettings={() => toast({ title: 'Settings saved!' })}
            onClearAllData={() => {
              appCache.clearDataCache();
            }}
          />
        </div>}
      </main>

      {/* Modals */}
      <AddUniversityModal
        isOpen={isModalOpen}
        onClose={closeAddModal}
        onSave={handleAddUniversity}
      />

      <EditUniversityModal
        isOpen={isEditModalOpen}
        university={editingUniversity}
        onClose={closeEditModal}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default Index;
