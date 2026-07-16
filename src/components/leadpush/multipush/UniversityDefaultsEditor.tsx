import { memo } from 'react';
import { ChevronDown, ChevronRight, Save, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Common default fields universities ask for beyond the CSV basics
const COMMON_FIELDS = [
  { key: 'course', label: 'Course' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'campus', label: 'Campus' },
  { key: 'program', label: 'Program' },
  { key: 'state', label: 'State (fallback)' },
  { key: 'city', label: 'City (fallback)' },
];

interface Props {
  universities: any[];
  defaultsMap: Record<string, Record<string, string>>;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  onChange: (uniId: string, defaults: Record<string, string>) => void;
  onSave: (uniId: string, defaults: Record<string, string>) => Promise<void>;
}

export const UniversityDefaultsEditor = memo(function UniversityDefaultsEditor({
  universities,
  defaultsMap,
  expandedId,
  onExpand,
  onChange,
  onSave,
}: Props) {
  return (
    <div className="space-y-2">
      {universities.map((u) => {
        const isOpen = expandedId === u.id;
        const defs = defaultsMap[u.id] || {};
        const fieldCount = Object.values(defs).filter(Boolean).length;

        // Discover extra custom fields from university config
        const extraFields = (u.customColumns || []).map((c: any) => ({
          key: c.columnKey,
          label: c.columnName,
        }));
        const allFields = [
          ...COMMON_FIELDS,
          ...extraFields.filter((f: any) => !COMMON_FIELDS.some((c) => c.key === f.key)),
        ];

        return (
          <div key={u.id} className="border rounded-md">
            <button
              type="button"
              onClick={() => onExpand(isOpen ? null : u.id)}
              className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 text-left"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm flex-1">{u.name}</span>
              {fieldCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {fieldCount} default{fieldCount > 1 ? 's' : ''} set
                </Badge>
              )}
            </button>
            {isOpen && (
              <div className="p-4 border-t space-y-3 bg-muted/20">
                <div className="grid sm:grid-cols-2 gap-3">
                  {allFields.map((f) => (
                    <div key={f.key}>
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        value={defs[f.key] || ''}
                        onChange={(e) => onChange(u.id, { ...defs, [f.key]: e.target.value })}
                        placeholder={`Default ${f.label.toLowerCase()}`}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Button size="sm" onClick={() => onSave(u.id, defs)}>
                  <Save className="h-3 w-3 mr-1" /> Save defaults for {u.name}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
