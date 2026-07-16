export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface Lead {
  name: string;
  email: string;
  address?: string;
  mobile: string;
  state?: string;
  city?: string;
  course?: string;
  specialization?: string;
  leadSource?: string;
  leadMedium?: string;
  leadCampaign?: string;
  [key: string]: string | undefined;
}

export interface LeadValidationConfig {
  requiredFields?: string[];
  customColumns?: Array<{
    columnKey: string;
    columnName: string;
    isRequired: boolean;
  }>;
}

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Mobile validation - accepts 10+ digits, optional country code
const mobileRegex = /^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/;

export function validateEmail(email: string): boolean {
  return emailRegex.test(email.trim());
}

export function validateMobile(mobile: string): boolean {
  // Remove spaces, dashes, parentheses for validation
  const cleaned = mobile.replace(/[\s\-().]/g, '');
  return mobileRegex.test(cleaned);
}

// Core required fields that are always validated
const CORE_REQUIRED_FIELDS = ['name', 'email', 'mobile'];

export function validateLead(lead: Lead, config?: LeadValidationConfig): ValidationResult {
  const errors: string[] = [];
  
  // Always validate name, email, mobile (core fields)
  if (!lead.name?.trim()) {
    errors.push('Name is required');
  } else if (lead.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  } else if (lead.name.trim().length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  if (!lead.email?.trim()) {
    errors.push('Email is required');
  } else if (!validateEmail(lead.email)) {
    errors.push('Invalid email format');
  }

  if (!lead.mobile?.trim()) {
    errors.push('Mobile number is required');
  } else if (!validateMobile(lead.mobile)) {
    errors.push('Invalid mobile number format (expected 10+ digits)');
  }

  // If config is provided with explicit required fields, use that
  // Otherwise check standard fields conditionally (only show warning if field exists but is empty)
  const additionalRequired = config?.requiredFields || [];
  
  // Check custom column requirements from config
  if (config?.customColumns) {
    config.customColumns.forEach(col => {
      if (col.isRequired && !lead[col.columnKey]?.trim()) {
        errors.push(`${col.columnName} is required`);
      }
    });
  }

  // Check additional required fields from config
  additionalRequired.forEach(field => {
    if (!CORE_REQUIRED_FIELDS.includes(field) && !lead[field]?.trim()) {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      errors.push(`${fieldName} is required`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateLeads(leads: Lead[], config?: LeadValidationConfig): { 
  validLeads: Lead[]; 
  invalidLeads: { lead: Lead; errors: string[]; index: number }[];
  hasDuplicates: boolean;
  duplicateIndices: Set<number>;
} {
  const validLeads: Lead[] = [];
  const invalidLeads: { lead: Lead; errors: string[]; index: number }[] = [];
  
  // Track duplicates by email and mobile
  const seenEmails = new Map<string, number>();
  const seenMobiles = new Map<string, number>();
  const duplicateIndices = new Set<number>();

  leads.forEach((lead, index) => {
    const validation = validateLead(lead, config);
    const errors = [...validation.errors];

    // Check for duplicate email
    const normalizedEmail = lead.email?.trim().toLowerCase();
    if (normalizedEmail) {
      const existingIndex = seenEmails.get(normalizedEmail);
      if (existingIndex !== undefined) {
        errors.push(`Duplicate email (same as row ${existingIndex + 1})`);
        duplicateIndices.add(index);
        duplicateIndices.add(existingIndex);
      } else {
        seenEmails.set(normalizedEmail, index);
      }
    }

    // Check for duplicate mobile
    const normalizedMobile = lead.mobile?.replace(/[\s\-().+]/g, '');
    if (normalizedMobile) {
      const existingIndex = seenMobiles.get(normalizedMobile);
      if (existingIndex !== undefined) {
        errors.push(`Duplicate mobile (same as row ${existingIndex + 1})`);
        duplicateIndices.add(index);
        duplicateIndices.add(existingIndex);
      } else {
        seenMobiles.set(normalizedMobile, index);
      }
    }

    if (errors.length === 0) {
      validLeads.push(lead);
    } else {
      invalidLeads.push({ lead, errors, index });
    }
  });

  return {
    validLeads,
    invalidLeads,
    hasDuplicates: duplicateIndices.size > 0,
    duplicateIndices,
  };
}

// Check for duplicates against existing database records
export async function checkDatabaseDuplicates(
  leads: Lead[],
  universityId: string,
  supabase: any
): Promise<{ duplicates: { email: string; mobile: string; existingId: string }[]; emails: Set<string>; mobiles: Set<string> }> {
  const emails = leads.map(l => l.email?.trim().toLowerCase()).filter(Boolean);
  const mobiles = leads.map(l => l.mobile?.replace(/[\s\-().+]/g, '')).filter(Boolean);

  if (emails.length === 0 && mobiles.length === 0) {
    return { duplicates: [], emails: new Set(), mobiles: new Set() };
  }

  // Build OR conditions
  const conditions: string[] = [];
  if (emails.length > 0) {
    conditions.push(`email.in.(${emails.join(',')})`);
  }
  if (mobiles.length > 0) {
    conditions.push(`mobile.in.(${mobiles.join(',')})`);
  }

  const { data: existingLeads, error } = await supabase
    .from('leads')
    .select('id, email, mobile')
    .eq('university_id', universityId)
    .or(conditions.join(','));

  if (error) {
    console.error('Error checking duplicates:', error);
    return { duplicates: [], emails: new Set(), mobiles: new Set() };
  }

  const existingEmails = new Set<string>((existingLeads || []).map((l: any) => (l.email?.toLowerCase() || '') as string).filter(Boolean));
  const existingMobiles = new Set<string>((existingLeads || []).map((l: any) => (l.mobile?.replace(/[\s\-().+]/g, '') || '') as string).filter(Boolean));
  
  const duplicates = (existingLeads || []).map((l: any) => ({
    email: l.email,
    mobile: l.mobile,
    existingId: l.id,
  }));

  return { duplicates, emails: existingEmails, mobiles: existingMobiles };
}

// Generate CSV from leads (for export)
export function generateLeadsCSV(leads: Lead[], customColumns?: string[]): string {
  const baseHeaders = ['name', 'email', 'mobile', 'state', 'city', 'course', 'specialization', 'source', 'medium', 'campaign'];
  const headers = [...baseHeaders, ...(customColumns || [])];
  
  const rows = leads.map(lead => {
    const baseValues = [
      lead.name || '',
      lead.email || '',
      lead.mobile || '',
      lead.state || '',
      lead.city || '',
      lead.course || '',
      lead.specialization || '',
      lead.leadSource || '',
      lead.leadMedium || '',
      lead.leadCampaign || '',
    ];
    
    const customValues = (customColumns || []).map(col => lead[col] || '');
    
    return [...baseValues, ...customValues].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Build validation config from university custom columns
export function buildValidationConfigFromUniversity(university: {
  customColumns?: Array<{ columnKey: string; columnName: string; isRequired: boolean }>;
}): LeadValidationConfig {
  return {
    requiredFields: [],
    customColumns: university.customColumns || [],
  };
}
