export interface ColumnMapping {
  name: string;
  email: string;
  address: string;
  mobile: string;
  state: string;
  city: string;
  university: string;
  course: string;
  specialization: string;
  leadSource: string;
  leadMedium: string;
  leadCampaign: string;
  [key: string]: string;
}

export interface StateCity {
  state: string;
  city: string;
}

export interface CourseSpecialization {
  course: string;
  specialization: string;
}

export interface University {
  id: number;
  name: string;
  apiUrl: string;
  collegeId: string;
  secretKey: string;
  source: string;
  medium: string;
  campaign: string;
  programs: string[];
  stateCities: StateCity[];
  courseSpecializations: CourseSpecialization[];
  columnMapping: ColumnMapping;
  leadsPerMinute: number;
  createdAt: string;
}

export interface Lead {
  name: string;
  email: string;
  address?: string;
  mobile: string;
  state: string;
  city: string;
  university?: string;
  course: string;
  specialization: string;
  leadSource: string;
  leadMedium: string;
  leadCampaign: string;
  [key: string]: string | undefined;
}

export interface ApiLog {
  id: string;
  universityId: number;
  universityName: string;
  userId?: string;
  applicationNo?: string;
  triggerPoint: string;
  webhookId?: string;
  dataPushType: string;
  email: string;
  mobile: string;
  form?: string;
  responseOn: string;
  status: 'Success' | 'Fail' | 'Pending';
  response: string;
  leadData: Lead;
}

export interface ProcessingQueue {
  universityId: number;
  leads: Lead[];
  currentIndex: number;
  isProcessing: boolean;
  intervalMs: number;
}
