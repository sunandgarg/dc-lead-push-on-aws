import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  autoClose?: boolean;
}

const alertConfig = {
  success: {
    icon: CheckCircle2,
    className: 'bg-success/10 border-success/30 text-success',
  },
  error: {
    icon: XCircle,
    className: 'bg-destructive/10 border-destructive/30 text-destructive',
  },
  warning: {
    icon: AlertCircle,
    className: 'bg-warning/10 border-warning/30 text-warning',
  },
  info: {
    icon: Info,
    className: 'bg-primary/10 border-primary/30 text-primary',
  },
};

export function Alert({ type, message, onClose, autoClose = true }: AlertProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  return (
    <div className={`animate-slide-up flex items-center gap-3 rounded-lg border px-4 py-3 ${config.className}`}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 rounded p-1 transition-colors hover:bg-background/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
