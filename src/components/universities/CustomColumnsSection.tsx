import { useState, useRef } from 'react';
import { Plus, Trash2, Upload, Download, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';

export interface CustomColumn {
  id?: string;
  columnName: string;
  columnKey: string;
  apiFieldName?: string; // Custom API field name for payload mapping
  isRequired: boolean;
  sortOrder: number;
  values: CustomColumnValue[];
}

export interface CustomColumnValue {
  id?: string;
  value: string;
  parentColumnKey?: string;
  parentValue?: string;
}

interface CustomColumnsSectionProps {
  columns: CustomColumn[];
  onChange: (columns: CustomColumn[]) => void;
  courseSpecializations: { course: string; specialization: string }[];
}

export function CustomColumnsSection({ columns, onChange, courseSpecializations }: CustomColumnsSectionProps) {
  const [expandedColumns, setExpandedColumns] = useState<Set<number>>(new Set());
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const addColumn = () => {
    const newColumn: CustomColumn = {
      columnName: '',
      columnKey: '',
      apiFieldName: '',
      isRequired: false,
      sortOrder: columns.length,
      values: [],
    };
    onChange([...columns, newColumn]);
    // Auto expand newly added column
    setExpandedColumns(new Set([...expandedColumns, columns.length]));
  };

  const removeColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index));
    const newExpanded = new Set(expandedColumns);
    newExpanded.delete(index);
    setExpandedColumns(newExpanded);
  };

  const updateColumn = (index: number, updates: Partial<CustomColumn>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    
    // Auto-generate key from name if key is empty
    if (updates.columnName && !updated[index].columnKey) {
      updated[index].columnKey = updates.columnName.toLowerCase().replace(/\s+/g, '_');
    }
    
    onChange(updated);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedColumns(newExpanded);
  };

  const handleCSVUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const valueColIndex = headers.findIndex(h => h === 'value' || h === columns[index].columnKey || h === columns[index].columnName.toLowerCase());
      const parentColIndex = headers.findIndex(h => h === 'parent' || h === 'course' || h === 'parent_value');

      const values: CustomColumnValue[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const value = valueColIndex >= 0 ? parts[valueColIndex] : parts[0];
        const parent = parentColIndex >= 0 ? parts[parentColIndex] : undefined;
        
        if (value) {
          values.push({
            value,
            parentColumnKey: parent ? 'course' : undefined,
            parentValue: parent || undefined,
          });
        }
      }

      updateColumn(index, { values });
    };
    reader.readAsText(file);
    
    // Reset input
    if (e.target) e.target.value = '';
  };

  const downloadSampleCSV = (column: CustomColumn) => {
    const hasParent = column.values.some(v => v.parentValue);
    const headers = hasParent ? ['Value', 'Parent (Course)'] : ['Value'];
    const sampleData = hasParent 
      ? [['Value 1', 'Course A'], ['Value 2', 'Course A'], ['Value 3', 'Course B']]
      : [['Value 1'], ['Value 2'], ['Value 3']];

    const content = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${column.columnKey || 'column'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addManualValue = (columnIndex: number) => {
    const column = columns[columnIndex];
    const updated = [...columns];
    updated[columnIndex] = {
      ...column,
      values: [...column.values, { value: '', parentValue: undefined }],
    };
    onChange(updated);
  };

  const updateValue = (columnIndex: number, valueIndex: number, updates: Partial<CustomColumnValue>) => {
    const updated = [...columns];
    updated[columnIndex].values[valueIndex] = { 
      ...updated[columnIndex].values[valueIndex], 
      ...updates 
    };
    onChange(updated);
  };

  const removeValue = (columnIndex: number, valueIndex: number) => {
    const updated = [...columns];
    updated[columnIndex].values = updated[columnIndex].values.filter((_, i) => i !== valueIndex);
    onChange(updated);
  };

  const uniqueCourses = [...new Set(courseSpecializations.map(cs => cs.course))];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Dynamic Columns
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add custom columns like School, Branch, etc. with hierarchical relationships
          </p>
        </div>
        <button
          type="button"
          onClick={addColumn}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus className="h-4 w-4" /> Add Column
        </button>
      </div>

      {columns.length > 0 ? (
        <div className="space-y-4">
          {columns.map((column, index) => (
            <div key={index} className="border border-border rounded-xl overflow-hidden">
              {/* Column Header */}
              <div
                className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-center gap-3">
                  {expandedColumns.has(index) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <span className="font-medium text-foreground">
                      {column.columnName || 'New Column'}
                    </span>
                    {column.columnKey && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        ({column.columnKey}{column.apiFieldName && column.apiFieldName !== column.columnKey ? ` → ${column.apiFieldName}` : ''})
                      </span>
                    )}
                    {column.isRequired && (
                      <span className="ml-2 badge-warning text-xs">Required</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm text-muted-foreground">
                    {column.values.length} values
                  </span>
                  <button
                    type="button"
                    onClick={() => removeColumn(index)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Column Details */}
              {expandedColumns.has(index) && (
                <div className="p-4 space-y-4">
                  {/* Column Settings */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Column Name
                      </label>
                      <input
                        type="text"
                        value={column.columnName}
                        onChange={(e) => updateColumn(index, { columnName: e.target.value })}
                        className="input-field"
                        placeholder="e.g., School"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Internal Key
                      </label>
                      <input
                        type="text"
                        value={column.columnKey}
                        onChange={(e) => updateColumn(index, { columnKey: e.target.value })}
                        className="input-field font-mono text-sm"
                        placeholder="e.g., school"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        API Field Name
                        <span className="text-xs text-muted-foreground ml-1">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={column.apiFieldName || ''}
                        onChange={(e) => updateColumn(index, { apiFieldName: e.target.value })}
                        className="input-field font-mono text-sm"
                        placeholder={column.columnKey || 'field_school'}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Maps to this field in API payload
                      </p>
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={column.isRequired}
                          onChange={(e) => updateColumn(index, { isRequired: e.target.checked })}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Required Field</span>
                      </label>
                    </div>
                  </div>

                  {/* Values Section */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Values</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => downloadSampleCSV(column)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" /> Sample
                        </button>
                        <button
                          type="button"
                          onClick={() => fileRefs.current[index]?.click()}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Upload className="h-3 w-3" /> Upload CSV
                        </button>
                        <input
                          ref={(el) => { fileRefs.current[index] = el; }}
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleCSVUpload(index, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => addManualValue(index)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Plus className="h-3 w-3" /> Add Value
                        </button>
                      </div>
                    </div>

                    {column.values.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {column.values.map((val, valIndex) => (
                          <div key={valIndex} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={val.value}
                              onChange={(e) => updateValue(index, valIndex, { value: e.target.value })}
                              className="input-field text-sm flex-1"
                              placeholder="Value"
                            />
                            {uniqueCourses.length > 0 && (
                              <select
                                value={val.parentValue || ''}
                                onChange={(e) => updateValue(index, valIndex, { 
                                  parentValue: e.target.value || undefined,
                                  parentColumnKey: e.target.value ? 'course' : undefined 
                                })}
                                className="input-field text-sm w-40"
                              >
                                <option value="">No Parent</option>
                                {uniqueCourses.map(course => (
                                  <option key={course} value={course}>{course}</option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => removeValue(index, valIndex)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No values added. Upload a CSV or add values manually.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-3">
            No dynamic columns configured. Add columns for fields like School, Branch, etc.
          </p>
          <button
            type="button"
            onClick={addColumn}
            className="text-primary hover:underline text-sm"
          >
            Add your first column
          </button>
        </div>
      )}
    </section>
  );
}
