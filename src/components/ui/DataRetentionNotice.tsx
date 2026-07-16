import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataRetentionNoticeProps {
  className?: string;
  variant?: 'inline' | 'banner';
}

export function DataRetentionNotice({ className, variant = 'inline' }: DataRetentionNoticeProps) {
  if (variant === 'banner') {
    return (
      <div className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm",
        className
      )}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>Data Retention Policy:</strong> All lead data, CSV files, and API logs are automatically deleted after <strong>72 hours</strong>. Download your results before they expire.
        </span>
      </div>
    );
  }

  return (
    <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Clock className="h-3 w-3" />
      Data auto-deleted after 72 hours
    </p>
  );
}
