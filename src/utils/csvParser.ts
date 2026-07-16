import { Lead, StateCity, CourseSpecialization } from '@/types/university';

export function parseCSV(csvText: string, options?: { preserveHeaders?: boolean }): { headers: string[]; data: Record<string, string>[] } {
  const lines = csvText.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    return { headers: [], data: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter).map(h => {
    const trimmed = h.trim();
    return options?.preserveHeaders ? trimmed : trimmed.toLowerCase().replace(/\s+/g, '_');
  });
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    let values = parseCSVLine(lines[i], delimiter).map(v => v.trim());
    if (values.length > headers.length && values.slice(headers.length).every(v => !v.trim())) {
      values = values.slice(0, headers.length);
    }
    while (values.length < headers.length) values.push('');

    if (headers.length > 0 && values.some(v => v.trim())) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }

  return { headers, data };
}

function detectDelimiter(headerLine: string): ',' | '\t' | ';' {
  const candidates: Array<',' | '\t' | ';'> = [',', '\t', ';'];
  return candidates.reduce((best, current) =>
    headerLine.split(current).length > headerLine.split(best).length ? current : best
  );
}

function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && line[i + 1] === '"' && inQuotes) {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

export function parseStateCityCSV(csvText: string): StateCity[] {
  const { data } = parseCSV(csvText);
  return data.map(row => ({
    state: row.state || row.state_name || '',
    city: row.city || row.city_name || '',
  })).filter(sc => sc.state && sc.city);
}

export function parseCourseSpecializationCSV(csvText: string): CourseSpecialization[] {
  const { data } = parseCSV(csvText);
  return data.map(row => ({
    course: row.course || row.course_name || row.program || '',
    specialization: row.specialization || row.specialization_name || row.spec || '',
  })).filter(cs => cs.course);
}

export function mapLeadData(
  rawData: Record<string, string>,
  columnMapping: Record<string, string>
): Lead {
  const mappedLead: Lead = {
    name: '',
    email: '',
    address: '',
    mobile: '',
    state: '',
    city: '',
    university: '',
    course: '',
    specialization: '',
    leadSource: '',
    leadMedium: '',
    leadCampaign: '',
  };

  // Standard field mappings (field name -> possible CSV column names)
  const standardFields: Record<string, string[]> = {
    name: ['name', 'full_name', 'student_name', 'candidate_name'],
    email: ['email', 'email_id', 'email_address', 'mail'],
    mobile: ['mobile', 'phone', 'mobile_number', 'phone_number', 'contact'],
    address: ['address', 'full_address', 'street_address'],
    state: ['state', 'state_name'],
    city: ['city', 'city_name'],
    course: ['course', 'course_name', 'program', 'discipline'],
    specialization: ['specialization', 'specialization_name', 'spec', 'programme_name', 'program_name'],
    leadSource: ['source', 'lead_source', 'leadsource'],
    leadMedium: ['medium', 'lead_medium', 'leadmedium'],
    leadCampaign: ['campaign', 'lead_campaign', 'leadcampaign'],
  };

  Object.entries(columnMapping).forEach(([field, csvColumn]) => {
    if (csvColumn) {
      const normalizedColumn = csvColumn.toLowerCase().replace(/\s+/g, '_');
      if (rawData[normalizedColumn]) {
        (mappedLead as any)[field] = rawData[normalizedColumn];
        return;
      }
    }
    
    // Fallback: try standard field names if mapped column not found
    const fallbackColumns = standardFields[field] || [];
    for (const col of fallbackColumns) {
      if (rawData[col]) {
        (mappedLead as any)[field] = rawData[col];
        break;
      }
    }
  });

  return mappedLead;
}

export function generateSampleCSV(): string {
  // Column names match the mapping fields used when adding a university
  // Lead Source, Medium, Campaign are optional - will use university defaults if not provided
  const headers = [
    'name',
    'email',
    'mobile',
    'state',
    'city',
    'course',
    'specialization',
    'source',
    'medium',
    'campaign'
  ];

  const sampleData = [
    ['Rahul Sharma', 'rahul.sharma@email.com', '9876543210', 'Delhi', 'New Delhi', 'B.Tech', 'Computer Science', '', '', ''],
    ['Priya Patel', 'priya.patel@email.com', '9876543211', 'Maharashtra', 'Mumbai', 'BBA', 'Finance', 'custom_source', 'custom_medium', 'custom_campaign'],
    ['Amit Kumar', 'amit.kumar@email.com', '9876543212', 'Karnataka', 'Bangalore', 'M.Tech', 'AI/ML', '', '', ''],
  ];

  return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
}

export function generateStateCitySampleCSV(): string {
  const headers = ['State', 'City'];
  const sampleData = [
    ['Delhi', 'New Delhi'],
    ['Delhi', 'South Delhi'],
    ['Maharashtra', 'Mumbai'],
    ['Maharashtra', 'Pune'],
    ['Karnataka', 'Bangalore'],
    ['Karnataka', 'Mysore'],
  ];

  return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
}

export function generateCourseSpecSampleCSV(): string {
  const headers = ['Course', 'Specialization'];
  const sampleData = [
    ['B.Tech', 'Computer Science and Engineering'],
    ['B.Tech', 'Artificial Intelligence and Machine Learning'],
    ['B.Tech', 'Electronics and Communication'],
    ['BBA', 'Business Administration'],
    ['BBA', 'Finance'],
    ['MBA', 'Marketing'],
    ['MBA', 'Human Resources'],
  ];

  return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
}
