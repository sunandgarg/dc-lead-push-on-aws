import { memo, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { universityToExportData, UniversityExport } from '@/components/universities/UniversityImportExport';

interface UniversityExportProps {
  university: any;
  variant?: 'icon' | 'button';
}

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function UniversityExportButton({ university, variant = 'icon' }: UniversityExportProps) {
  const { toast } = useToast();

  const handleExport = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const exportData: UniversityExport = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        university: universityToExportData(university),
      };
      const safeName = university.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      downloadJSON(exportData, `${safeName}_config.json`);
      toast({ title: 'Exported', description: `Configuration for ${university.name} downloaded` });
    } catch {
      toast({ title: 'Error', description: 'Failed to export configuration', variant: 'destructive' });
    }
  }, [university, toast]);

  if (variant === 'icon') {
    return (
      <Button variant="ghost" size="sm" onClick={handleExport} title="Export Configuration">
        <Download className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Export Config
    </Button>
  );
}

export default memo(UniversityExportButton);
