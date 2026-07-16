/**
 * DraftIndicator - Shows auto-save status and provides reset functionality
 */

import { memo } from 'react';
import { CheckCircle2, Cloud, CloudOff, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface DraftIndicatorProps {
  hasUnsavedChanges: boolean;
  lastSaved: number | null;
  onReset: () => void;
  className?: string;
}

function formatLastSaved(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export const DraftIndicator = memo(function DraftIndicator({
  hasUnsavedChanges,
  lastSaved,
  onReset,
  className,
}: DraftIndicatorProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border/50',
      className
    )}>
      {/* Status Icon */}
      <div className="flex items-center gap-2">
        {hasUnsavedChanges ? (
          <>
            <Cloud className="h-4 w-4 text-amber-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Saving...</span>
          </>
        ) : lastSaved ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">
              Saved {formatLastSaved(lastSaved)}
            </span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">No draft</span>
          </>
        )}
      </div>
      
      {/* Reset Button */}
      {lastSaved && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      )}
    </div>
  );
});

/**
 * FileRestorePrompt - Shows when a file needs to be re-selected
 */
interface FileRestorePromptProps {
  fileName: string;
  fileSize: number;
  onReselect: () => void;
  className?: string;
}

export const FileRestorePrompt = memo(function FileRestorePrompt({
  fileName,
  fileSize,
  onReselect,
  className,
}: FileRestorePromptProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30',
      className
    )}>
      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          Previously selected: {fileName}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatSize(fileSize)} - Please re-confirm file selection
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReselect}
        className="flex-shrink-0"
      >
        Re-select File
      </Button>
    </div>
  );
});

export default DraftIndicator;
