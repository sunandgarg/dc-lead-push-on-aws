import { University } from '@/types/university';
import { Trash2, Globe, Key, Hash, BookOpen, MapPin, Clock, Download } from 'lucide-react';
import { downloadSampleCSV, columnMappingToPayloadFields, CustomColumnForCSV } from './PayloadFieldsEditor';
import { useToast } from '@/hooks/use-toast';

interface UniversityCardProps {
  university: University;
  onDelete: (id: number) => void;
  customColumns?: CustomColumnForCSV[];
}

export function UniversityCard({ university, onDelete, customColumns = [] }: UniversityCardProps) {
  const { toast } = useToast();

  const handleDownloadCSV = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const payloadFields = columnMappingToPayloadFields(
        university.columnMapping as Record<string, string>
      );
      downloadSampleCSV(payloadFields, university.name, customColumns);
      toast({
        title: 'CSV Downloaded',
        description: `Sample CSV for ${university.name} has been downloaded`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate sample CSV',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            {university.name}
          </h3>
          <span className="badge-success mt-2">✓ Active</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownloadCSV}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
            title="Download Sample CSV"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(university.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
            title="Delete university"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Globe className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-muted-foreground">API URL:</span>
            <p className="text-foreground truncate" title={university.apiUrl}>
              {university.apiUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">College ID:</span>
          <span className="font-mono text-foreground">{university.collegeId}</span>
        </div>

        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Source:</span>
          <span className="text-foreground">{university.source}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Rate:</span>
          <span className="badge-info">{university.leadsPerMinute} leads/min</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {university.courseSpecializations.length} Courses
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {university.courseSpecializations.slice(0, 5).map((cs, idx) => (
            <span
              key={idx}
              className="inline-block rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground"
            >
              {cs.course}
            </span>
          ))}
          {university.courseSpecializations.length > 5 && (
            <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              +{university.courseSpecializations.length - 5} more
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {university.stateCities.length} Locations
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set(university.stateCities.map(sc => sc.state))].slice(0, 4).map((state, idx) => (
            <span
              key={idx}
              className="inline-block rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
            >
              {state}
            </span>
          ))}
          {[...new Set(university.stateCities.map(sc => sc.state))].length > 4 && (
            <span className="inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              +{[...new Set(university.stateCities.map(sc => sc.state))].length - 4} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
