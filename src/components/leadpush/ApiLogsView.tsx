import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogsTab } from '@/components/LogsTab';
import { DataRetentionNotice } from '@/components/ui/DataRetentionNotice';

interface ApiLogsViewProps {
  logs: any[];
  universities: any[];
}

export function ApiLogsView({ logs, universities }: ApiLogsViewProps) {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/lead-push')}
        className="mb-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Lead Push
      </Button>

      <DataRetentionNotice variant="banner" className="mb-4" />
      
      <LogsTab logs={logs} universities={universities} />
    </div>
  );
}

export default memo(ApiLogsView);
