import { Component, memo, useEffect, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadLeadsTab } from '@/components/upload/UploadLeadsTab';
import { QueueMonitor } from '@/components/upload/QueueMonitor';
import { DataRetentionNotice } from '@/components/ui/DataRetentionNotice';
import { appCache } from '@/hooks/useAppCache';

interface UploadLeadsViewProps {
  universities: any[];
  selectedUniversity: any | null;
  onSelectUniversity: (uni: any) => void;
}

const stringifyViewValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(stringifyViewValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferredKey = ['name', 'contact_name', 'value', 'label', 'displayName', 'fieldName'].find((key) => key in record);
    if (preferredKey) return stringifyViewValue(record[preferredKey]);
    return Object.values(record).map(stringifyViewValue).filter(Boolean).join(', ');
  }
  return String(value).trim();
};

// Create slug from university name
const toSlug = (name: string): string => {
  return stringifyViewValue(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

// Encode filename for URL (handle special chars like dots)
const encodeFilename = (filename: string): string => {
  return encodeURIComponent(filename);
};

// Decode filename from URL
const decodeFilename = (encoded: string): string => {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

// Valid processing states for URL
const PROCESSING_STATES = ['processing', 'paused', 'complete', 'idle'] as const;
type ProcessingState = typeof PROCESSING_STATES[number];

class LeadPushErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[Lead Push] Render error recovered by boundary:', error);
    const message = error instanceof Error ? error.message : String(error);
    this.setState({ hasError: true, message });
  }

  private resetUploadState = () => {
    const removeMatching = (storage: Storage) => {
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && !key.startsWith('sb-') && !key.includes('auth-token') &&
            (key.startsWith('dekhocampus_') || key.startsWith('csv_mapping_') || key.startsWith('app:page:'))) {
          keys.push(key);
        }
      }
      keys.forEach((key) => storage.removeItem(key));
    };

    try {
      removeMatching(localStorage);
      removeMatching(sessionStorage);
    } catch (error) {
      console.warn('[Lead Push] Could not clear recovered upload state:', error);
    }
    this.props.onReset?.();
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="rounded-xl border border-destructive/30 bg-card p-8 text-center shadow-md">
        <h2 className="text-lg font-semibold text-foreground">Lead Push recovered from an upload error</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The upload state was reset. If this message returns, the diagnostic below identifies the remaining configuration problem.
        </p>
        {this.state.message && <p className="mt-2 break-words text-xs text-destructive">{this.state.message}</p>}
        <button type="button" onClick={this.resetUploadState} className="btn-primary mt-5">
          Reset Upload State
        </button>
      </div>
    );
  }
}

function isProcessingState(str: string): str is ProcessingState {
  return PROCESSING_STATES.includes(str as ProcessingState);
}

export function UploadLeadsView({ universities, selectedUniversity, onSelectUniversity }: UploadLeadsViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isInitialized = useRef(false);
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [queueResetKey, setQueueResetKey] = useState(0);

  // Parse the hierarchical slug from URL
  const { universitySlug, fileName, processingState } = useMemo(() => {
    const fullPath = location.pathname;
    const basePath = '/lead-push/upload';
    
    let remaining = '';
    if (fullPath.startsWith(basePath)) {
      remaining = fullPath.slice(basePath.length + 1);
    }
    
    const parts = remaining ? remaining.split('/').filter(Boolean) : [];
    const uniSlug = parts[0] || null;
    
    // Check if second part is a filename (not a processing state)
    let file: string | null = null;
    let procState: ProcessingState = 'idle';
    
    if (parts[1]) {
      if (isProcessingState(parts[1])) {
        // /lpu/processing
        procState = parts[1];
      } else {
        // /lpu/filename.csv
        file = decodeFilename(parts[1]);
        // Check for processing state after filename
        if (parts[2] && isProcessingState(parts[2])) {
          procState = parts[2];
        }
      }
    }
    
    return {
      universitySlug: uniSlug,
      fileName: file,
      processingState: procState,
    };
  }, [location.pathname]);

  // Restore selected university from cache or URL on mount
  useEffect(() => {
    if (universities.length === 0 || isInitialized.current) return;

    const cachedSlug = appCache.uploadSelectedUniversity;
    const targetSlug = universitySlug || cachedSlug;

    if (targetSlug) {
      const uniFromSlug = universities.find(
        u => toSlug(u.name) === targetSlug || u.slug === targetSlug
      );
      
      if (uniFromSlug) {
        if (!selectedUniversity || selectedUniversity.id !== uniFromSlug.id) {
          onSelectUniversity(uniFromSlug);
        }
        
        if (!universitySlug && cachedSlug) {
          navigate(`/lead-push/upload/${targetSlug}`, { replace: true });
        }
      }
    }
    
    isInitialized.current = true;
  }, [universities, universitySlug, selectedUniversity, onSelectUniversity, navigate]);

  // Handle university selection with URL update
  const handleSelectUniversity = useCallback((uni: any) => {
    const slug = uni.slug || toSlug(uni.name);
    appCache.setUploadSelectedUniversity(slug);
    onSelectUniversity(uni);
    navigate(`/lead-push/upload/${slug}`, { replace: true });
  }, [onSelectUniversity, navigate]);

  // Update URL when file is uploaded
  const handleFileUpload = useCallback((filename: string) => {
    if (!selectedUniversity) return;
    
    const uniSlug = selectedUniversity.slug || toSlug(selectedUniversity.name);
    const encodedFile = encodeFilename(filename);
    
    navigate(`/lead-push/upload/${uniSlug}/${encodedFile}`, { replace: true });
  }, [selectedUniversity, navigate]);

  // Update URL with processing state
  const handleProcessingStateChange = useCallback((_newState: ProcessingState) => {
    // Processing-state route churn was re-driving the upload screen while a
    // push was running. The file/university URL remains stable, and the live
    // processing state is shown in-page instead of rewriting the route.
  }, []);

  // Clear file from URL
  const handleClearFile = useCallback(() => {
    if (!selectedUniversity) return;
    
    const uniSlug = selectedUniversity.slug || toSlug(selectedUniversity.name);
    navigate(`/lead-push/upload/${uniSlug}`, { replace: true });
  }, [selectedUniversity, navigate]);

  // Generate breadcrumbs for the current path
  const breadcrumbs = useMemo(() => {
    if (!selectedUniversity) return [];
    
    const uniSlug = selectedUniversity.slug || toSlug(selectedUniversity.name);
    const basePath = `/lead-push/upload/${uniSlug}`;
    
    const crumbs: Array<{ label: string; path: string; isActive: boolean }> = [
      { label: 'Lead Push', path: '/lead-push', isActive: false },
      { label: stringifyViewValue(selectedUniversity.name), path: basePath, isActive: !fileName && processingState === 'idle' },
    ];
    
    if (fileName) {
      const filePath = `${basePath}/${encodeFilename(fileName)}`;
      crumbs.push({
        label: fileName,
        path: filePath,
        isActive: processingState === 'idle',
      });
      
      if (processingState !== 'idle') {
        crumbs.push({
          label: processingState.charAt(0).toUpperCase() + processingState.slice(1),
          path: `${filePath}/${processingState}`,
          isActive: true,
        });
      }
    } else if (processingState !== 'idle') {
      crumbs.push({
        label: processingState.charAt(0).toUpperCase() + processingState.slice(1),
        path: `${basePath}/${processingState}`,
        isActive: true,
      });
    }
    
    return crumbs;
  }, [selectedUniversity, fileName, processingState]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => navigate('/lead-push')}
          >
            <Home className="h-3.5 w-3.5" />
          </Button>
          {breadcrumbs.map((crumb) => (
            <div key={crumb.path} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={crumb.isActive ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 max-w-[200px] truncate"
                onClick={() => !crumb.isActive && navigate(crumb.path)}
                disabled={crumb.isActive}
                title={stringifyViewValue(crumb.label)}
              >
                {stringifyViewValue(crumb.label)}
              </Button>
            </div>
          ))}
        </nav>
      )}

      <DataRetentionNotice variant="banner" className="mb-4" />
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadPushErrorBoundary onReset={() => setUploadResetKey((value) => value + 1)}>
            <UploadLeadsTab
              key={uploadResetKey}
              universities={universities}
              selectedUniversity={selectedUniversity}
              onSelectUniversity={handleSelectUniversity}
              onFileUpload={handleFileUpload}
              onClearFile={handleClearFile}
              onProcessingStateChange={handleProcessingStateChange}
              currentFileName={fileName}
              currentProcessingState={processingState}
            />
          </LeadPushErrorBoundary>
        </div>
        <div className="lg:col-span-1">
          <LeadPushErrorBoundary onReset={() => setQueueResetKey((value) => value + 1)}>
            <QueueMonitor key={queueResetKey} />
          </LeadPushErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default memo(UploadLeadsView);
