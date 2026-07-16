import { useState, useMemo, useEffect } from 'react';
import { X, Send, User, Mail, Phone, MapPin, BookOpen, Tag, Loader2, CheckCircle2, XCircle, AlertTriangle, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { columnMappingToPayloadFields } from '@/components/universities/PayloadFieldsEditor';

interface CustomColumn {
  columnKey: string;
  columnName: string;
  isRequired: boolean;
  values: { value: string; parentValue?: string }[];
}

interface University {
  id: string;
  name: string;
  api_url: string;
  college_id: string;
  secret_key: string;
  source: string;
  medium: string;
  campaign: string;
  leads_per_minute: number;
  api_type: string;
  column_mapping: Record<string, string>;
  courseSpecializations?: { course: string; specialization: string }[];
  stateCities?: { state: string; city: string }[];
  customColumns?: CustomColumn[];
}

interface SingleLeadFormProps {
  university: University;
  onClose: () => void;
  onSuccess: () => void;
}

const stringifyRenderValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map(stringifyRenderValue).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferredKey = ['name', 'contact_name', 'value', 'label', 'displayName', 'fieldName'].find(
      (key) => key in record,
    );
    if (preferredKey) return stringifyRenderValue(record[preferredKey]);
    return Object.values(record).map(stringifyRenderValue).filter(Boolean).join(', ');
  }
  return String(value).trim();
};

const normalizeSingleLeadStatus = (value: unknown): "Success" | "Duplicate" | "Fail" => {
  const status = stringifyRenderValue(value).toLowerCase();
  if (status === "success") return "Success";
  if (status === "duplicate") return "Duplicate";
  return "Fail";
};

const normalizeSingleLeadResponse = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return stringifyRenderValue(value);
  }
};

// Define which fields are core lead fields vs dynamic/static
const coreLeadFields = ['name', 'email', 'mobile', 'state', 'city', 'course', 'specialization', 'address'];
// Core lead fields that have special rendering

export function SingleLeadForm({ university, onClose, onSuccess }: SingleLeadFormProps) {
  // Parse payload fields from column_mapping
  const payloadFields = useMemo(() => {
    return columnMappingToPayloadFields(university.column_mapping || {});
  }, [university.column_mapping]);

  // Get custom fields that need user input (lead_data fields that aren't core + custom columns)
  const customInputFields = useMemo(() => {
    const fields: Array<{
      key: string;
      displayName: string;
      isRequired: boolean;
      sourceKey: string;
    }> = [];

    payloadFields.forEach(field => {
      if (field.sourceType === 'lead_data' && field.sourceKey) {
        // Only add if it's not a core field
        if (!coreLeadFields.includes(field.sourceKey)) {
          fields.push({
            key: field.sourceKey,
            displayName: field.displayName || field.fieldName,
            isRequired: field.isRequired,
            sourceKey: field.sourceKey,
          });
        }
      }
    });

    return fields;
  }, [payloadFields]);

  // Initialize form data with all required fields
  const getInitialFormData = () => {
    const initial: Record<string, string> = {
      name: '',
      email: '',
      mobile: '',
      state: '',
      city: '',
      course: '',
      specialization: '',
      leadSource: university.source || '',
      leadMedium: university.medium || '',
      leadCampaign: university.campaign || '',
    };

    // Add custom input fields
    customInputFields.forEach(field => {
      initial[field.key] = '';
    });

    // Add custom columns
    university.customColumns?.forEach(col => {
      initial[col.columnKey] = '';
    });

    return initial;
  };

  const [formData, setFormData] = useState<Record<string, string>>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: 'success' | 'fail'; message: string; response?: string } | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const safeResultResponse = result ? normalizeSingleLeadResponse(result.response) : '';

  // Update form when university changes
  useEffect(() => {
    setFormData(getInitialFormData());
  }, [university.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset dependent fields
    if (name === 'state') {
      setFormData(prev => ({ ...prev, city: '' }));
    }
    if (name === 'course') {
      setFormData(prev => ({ ...prev, specialization: '' }));
      // Also reset custom columns that depend on course
      const customResets: Record<string, string> = {};
      university.customColumns?.forEach(col => {
        if (col.values.some(v => v.parentValue)) {
          customResets[col.columnKey] = '';
        }
      });
      if (Object.keys(customResets).length > 0) {
        setFormData(prev => ({ ...prev, ...customResets }));
      }
    }
    
    // Clear warnings when user edits
    setValidationWarnings([]);
  };

  // Get unique states from uploaded data
  const uniqueStates = useMemo(() => {
    if (!university.stateCities) return [];
    return [...new Set(university.stateCities.map(sc => sc.state))].sort();
  }, [university.stateCities]);

  // Get cities for selected state
  const availableCities = useMemo(() => {
    if (!formData.state || !university.stateCities) return [];
    return [...new Set(
      university.stateCities
        .filter(sc => sc.state === formData.state)
        .map(sc => sc.city)
    )].sort();
  }, [formData.state, university.stateCities]);

  // Get unique courses from uploaded data
  const uniqueCourses = useMemo(() => {
    if (!university.courseSpecializations) return [];
    return [...new Set(university.courseSpecializations.map(cs => cs.course))].sort();
  }, [university.courseSpecializations]);

  // Get specializations for selected course
  const availableSpecializations = useMemo(() => {
    if (!formData.course || !university.courseSpecializations) return [];
    return [...new Set(
      university.courseSpecializations
        .filter(cs => cs.course === formData.course)
        .map(cs => cs.specialization)
        .filter(Boolean)
    )].sort();
  }, [formData.course, university.courseSpecializations]);

  // Get values for a custom column (filtered by parent if applicable)
  const getCustomColumnValues = (column: CustomColumn) => {
    if (!column.values || column.values.length === 0) return [];
    
    // If column has parent relationships, filter by selected course
    const hasParent = column.values.some(v => v.parentValue);
    if (hasParent && formData.course) {
      return column.values
        .filter(v => !v.parentValue || stringifyRenderValue(v.parentValue) === formData.course)
        .map(v => stringifyRenderValue(v.value))
        .filter(Boolean);
    }
    
    return [...new Set(column.values.map(v => stringifyRenderValue(v.value)).filter(Boolean))];
  };

  // Check if a core field is configured in payload
  const isFieldInPayload = (fieldKey: string): boolean => {
    return payloadFields.some(f => 
      f.sourceType === 'lead_data' && f.sourceKey === fieldKey
    );
  };

  // Get field requirement from payload config
  const isFieldRequired = (fieldKey: string): boolean => {
    const field = payloadFields.find(f => 
      f.sourceType === 'lead_data' && f.sourceKey === fieldKey
    );
    return field?.isRequired || false;
  };

  const validateForm = () => {
    const warnings: string[] = [];
    
    // Check required payload fields
    payloadFields.forEach(field => {
      if (field.isRequired && field.sourceType === 'lead_data' && field.sourceKey) {
        const value = formData[field.sourceKey];
        if (!value?.trim()) {
          warnings.push(`${field.displayName || field.sourceKey} is required`);
        }
      }
    });

    // Validate state/city against uploaded data
    if (formData.state && university.stateCities && university.stateCities.length > 0) {
      const validStates = uniqueStates.map(s => s.toLowerCase());
      if (!validStates.includes(formData.state.toLowerCase())) {
        warnings.push(`State "${formData.state}" is not in the allowed list`);
      }
    }
    
    // Validate course/specialization
    if (formData.course && university.courseSpecializations && university.courseSpecializations.length > 0) {
      const validCourses = uniqueCourses.map(c => c.toLowerCase());
      if (!validCourses.includes(formData.course.toLowerCase())) {
        warnings.push(`Course "${formData.course}" is not in the allowed list`);
      }
    }
    
    // Validate custom columns
    university.customColumns?.forEach(col => {
      const value = formData[col.columnKey];
      if (col.isRequired && !value?.trim()) {
        warnings.push(`${col.columnName} is required`);
      }
      if (value && col.values.length > 0) {
        const validValues = getCustomColumnValues(col).map(v => v.toLowerCase());
        if (!validValues.includes(value.toLowerCase())) {
          warnings.push(`${col.columnName} "${value}" is not in the allowed list`);
        }
      }
    });
    
    setValidationWarnings(warnings);
    return warnings.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    
    // Check minimum required fields
    const requiredMissing = payloadFields
      .filter(f => f.isRequired && f.sourceType === 'lead_data')
      .some(f => !formData[f.sourceKey || '']?.trim());
    
    if (requiredMissing) {
      setResult({ status: 'fail', message: 'Please fill in all required fields' });
      return;
    }

    // Validate but don't block submission for warnings
    validateForm();

    setIsSubmitting(true);
    setResult(null);

    try {
      // Create a single-lead batch
      const { data: batch, error: batchError } = await supabase
        .from('upload_batches')
        .insert({
          university_id: university.id,
          file_name: `Single Lead - ${formData.name || formData.email}`,
          total_leads: 1,
          status: 'processing',
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Build extra data for custom fields
      const extraData: Record<string, string> = {};
      
      // Add custom input fields from payload
      customInputFields.forEach(field => {
        if (formData[field.key]) {
          extraData[field.key] = formData[field.key];
        }
      });
      
      // Add custom columns
      university.customColumns?.forEach(col => {
        if (formData[col.columnKey]) {
          extraData[col.columnKey] = formData[col.columnKey];
        }
      });

      // Process lead directly. Lead Push does not store individual lead rows.
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-lead', {
        body: {
          universityId: university.id,
          batchId: batch.id,
          leadData: { ...formData, ...extraData },
          apiConfig: {
            apiUrl: university.api_url,
            secretKey: university.secret_key,
            collegeId: university.college_id,
            source: formData.leadSource,
            medium: formData.leadMedium,
            campaign: formData.leadCampaign,
            apiType: university.api_type || 'nopaperforms',
            columnMapping: university.column_mapping || {},
          },
        },
      });

      if (processError) throw processError;

      // Update batch status and counts
      const normalizedStatus = normalizeSingleLeadStatus(processResult?.status);
      const normalizedResponse = normalizeSingleLeadResponse(processResult?.response);
      const isSuccess = normalizedStatus === 'Success';
      const isDuplicate = normalizedStatus === 'Duplicate';
      await supabase
        .from('upload_batches')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          success_count: isSuccess ? 1 : 0,
          duplicate_count: isDuplicate ? 1 : 0,
          fail_count: isSuccess || isDuplicate ? 0 : 1,
          processed_count: 1,
        })
        .eq('id', batch.id);

      // Show result
      if (normalizedStatus === 'Success') {
        setResult({ 
          status: 'success', 
          message: 'Lead submitted successfully!',
          response: normalizedResponse
        });
        
        if (addAnother) {
          // Reset form but keep source/medium/campaign
          setFormData(prev => ({
            ...getInitialFormData(),
            leadSource: prev.leadSource,
            leadMedium: prev.leadMedium,
            leadCampaign: prev.leadCampaign,
          }));
          setValidationWarnings([]);
        } else {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        }
      } else {
        let errorMessage = 'Lead submission failed';
        try {
          const responseJson = JSON.parse(normalizedResponse || '{}');
          errorMessage = responseJson.message || responseJson.error || errorMessage;
        } catch {
          // Keep default message
        }
        
        setResult({ 
          status: 'fail', 
          message: errorMessage,
          response: normalizedResponse
        });
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      setResult({ status: 'fail', message: String(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasDropdownData = (uniqueStates.length > 0 || uniqueCourses.length > 0);

  // Helper to render a field based on type
  const renderField = (
    key: string, 
    label: string, 
    isRequired: boolean,
    options?: string[],
    disabled?: boolean,
    icon?: React.ReactNode,
    placeholder?: string
  ) => {
    const hasOptions = options && options.length > 0;
    
    return (
      <div key={key}>
        <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-2">
          {icon}
          {label}
          {isRequired && <span className="text-destructive">*</span>}
        </label>
        {hasOptions ? (
          <select
            name={key}
            value={formData[key] || ''}
            onChange={handleChange}
            className="input-field bg-card"
            disabled={disabled}
            required={isRequired}
          >
            <option value="">Select {label}</option>
            {options.map(opt => (
              <option key={stringifyRenderValue(opt)} value={stringifyRenderValue(opt)}>{stringifyRenderValue(opt)}</option>
            ))}
          </select>
        ) : (
          <input
            type={key === 'email' ? 'email' : key === 'mobile' ? 'tel' : 'text'}
            name={key}
            value={formData[key] || ''}
            onChange={handleChange}
            className="input-field"
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            disabled={disabled}
            required={isRequired}
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl animate-slide-up rounded-2xl bg-card shadow-xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Add Single Lead</h2>
            <p className="text-sm text-muted-foreground mt-1">Submit a lead directly to {stringifyRenderValue(university.name)}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Result Banner */}
          {result && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              result.status === 'success' ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'
            }`}>
              {result.status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${result.status === 'success' ? 'text-success' : 'text-destructive'}`}>
                  {result.message}
                </p>
                {safeResultResponse && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View API Response
                    </summary>
                    <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto font-mono">
                      {safeResultResponse}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="font-medium text-warning">Validation Warnings</p>
                  <ul className="mt-1 text-sm text-warning/80 list-disc list-inside">
                    {validationWarnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Core Required Fields - Name, Email, Mobile */}
          <section>
            <h3 className="font-medium text-foreground mb-4">Basic Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {isFieldInPayload('name') && renderField(
                'name', 
                'Name', 
                isFieldRequired('name'),
                undefined,
                false,
                <User className="h-4 w-4" />,
                'Enter full name'
              )}
              {isFieldInPayload('email') && renderField(
                'email', 
                'Email', 
                isFieldRequired('email'),
                undefined,
                false,
                <Mail className="h-4 w-4" />,
                'Enter email address'
              )}
              {isFieldInPayload('mobile') && (
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Phone className="h-4 w-4" />
                    Mobile Number
                    {isFieldRequired('mobile') && <span className="text-destructive">*</span>}
                  </label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 rounded-lg bg-muted text-muted-foreground text-sm">+91</span>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      className="input-field flex-1"
                      placeholder="Enter mobile number"
                      required={isFieldRequired('mobile')}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Location - State/City */}
          {(isFieldInPayload('state') || isFieldInPayload('city')) && (
            <section>
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Location
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {isFieldInPayload('state') && renderField(
                  'state',
                  'State',
                  isFieldRequired('state'),
                  uniqueStates.length > 0 ? uniqueStates : undefined
                )}
                {isFieldInPayload('city') && renderField(
                  'city',
                  'City',
                  isFieldRequired('city'),
                  availableCities.length > 0 ? availableCities : undefined,
                  uniqueStates.length > 0 && !formData.state
                )}
              </div>
            </section>
          )}

          {/* Course Interest */}
          {(isFieldInPayload('course') || isFieldInPayload('specialization')) && (
            <section>
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Course Interest
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {isFieldInPayload('course') && renderField(
                  'course',
                  'Course',
                  isFieldRequired('course'),
                  uniqueCourses.length > 0 ? uniqueCourses : undefined
                )}
                {isFieldInPayload('specialization') && renderField(
                  'specialization',
                  'Specialization',
                  isFieldRequired('specialization'),
                  availableSpecializations.length > 0 ? availableSpecializations : undefined,
                  uniqueCourses.length > 0 && !formData.course
                )}
              </div>
            </section>
          )}

          {/* Address if configured */}
          {isFieldInPayload('address') && (
            <section>
              <h3 className="font-medium text-foreground mb-4">Address</h3>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                className="input-field w-full"
                placeholder="Enter full address"
                required={isFieldRequired('address')}
              />
            </section>
          )}

          {/* Custom Payload Fields (non-core lead_data fields) */}
          {customInputFields.length > 0 && (
            <section>
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Additional Fields
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {customInputFields.map(field => renderField(
                  field.key,
                  stringifyRenderValue(field.displayName) || stringifyRenderValue(field.key),
                  field.isRequired
                ))}
              </div>
            </section>
          )}

          {/* Dynamic Custom Columns */}
          {university.customColumns && university.customColumns.length > 0 && (
            <section>
              <h3 className="font-medium text-foreground mb-4">Custom Fields</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {university.customColumns.map(column => {
                  const columnValues = getCustomColumnValues(column);
                  const hasParent = column.values.some(v => v.parentValue);
                  const isDisabled = hasParent && !formData.course;
                  
                  return (
                    <div key={column.columnKey}>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        {stringifyRenderValue(column.columnName) || stringifyRenderValue(column.columnKey)}
                        {column.isRequired && <span className="text-destructive ml-1">*</span>}
                      </label>
                      {columnValues.length > 0 ? (
                        <select
                          name={column.columnKey}
                          value={formData[column.columnKey] || ''}
                          onChange={handleChange}
                          className="input-field bg-card"
                          disabled={isDisabled}
                          required={column.isRequired}
                        >
                          <option value="">Select {stringifyRenderValue(column.columnName) || stringifyRenderValue(column.columnKey)}</option>
                          {columnValues.map(value => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name={column.columnKey}
                          value={formData[column.columnKey] || ''}
                          onChange={handleChange}
                          className="input-field"
                          placeholder={`Enter ${(stringifyRenderValue(column.columnName) || stringifyRenderValue(column.columnKey)).toLowerCase()}`}
                          required={column.isRequired}
                        />
                      )}
                      {hasParent && !formData.course && (
                        <p className="text-xs text-muted-foreground mt-1">Select a course first</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Lead Source */}
          <section>
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Lead Source
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Source</label>
                <input
                  type="text"
                  name="leadSource"
                  value={formData.leadSource}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., dekhocampus"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Medium</label>
                <input
                  type="text"
                  name="leadMedium"
                  value={formData.leadMedium}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., direct"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Campaign</label>
                <input
                  type="text"
                  name="leadCampaign"
                  value={formData.leadCampaign}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., API"
                />
              </div>
            </div>
          </section>

          {/* Info about dropdown data */}
          {!hasDropdownData && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Upload State/City and Course/Specialization data in the university settings to enable dropdown selection for these fields.
              </p>
            </div>
          )}
        </form>

        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button 
            onClick={(e) => handleSubmit(e, true)} 
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg font-medium border border-primary text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save & Add New'}
          </button>
          <button 
            onClick={(e) => handleSubmit(e, false)} 
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Lead
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
