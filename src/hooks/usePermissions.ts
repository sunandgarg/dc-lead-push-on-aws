import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAdminAuth } from './useAdminAuth';

// All available permissions in the system
export const ALL_PERMISSIONS = {
  crm: {
    label: 'CRM',
    children: {
      'crm.contacts': 'Contacts',
      'crm.pipeline': 'Pipeline',
      'crm.tasks': 'Tasks',
      'crm.activities': 'Activities',
      'crm.lead-scoring': 'Lead Scoring',
      'crm.segments': 'Segments',
      'crm.assignment': 'Lead Assignment',
      'crm.lead-capture': 'Lead Capture',
      'crm.team': 'Team Management',
      'crm.whatsapp': 'WhatsApp',
    },
  },
  'lead-push': {
    label: 'Lead Push',
    children: {
      'lead-push.universities': 'Universities',
      'lead-push.upload': 'Upload Leads',
      'lead-push.history': 'Upload History',
      'lead-push.logs': 'API Logs',
    },
  },
  'url-shortener': {
    label: 'URL Shortener',
    children: {},
  },
  marketing: {
    label: 'Marketing',
    children: {
      'marketing.campaigns': 'Campaigns',
      'marketing.templates': 'Templates',
      'marketing.smtp': 'SMTP',
      'marketing.analytics': 'Analytics',
    },
  },
  settings: {
    label: 'Settings',
    children: {},
  },
} as const;

export function usePermissions() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    // Admins have all permissions
    if (isAdmin) {
      setPermissions(['*']);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission')
        .eq('user_id', user.id);

      if (error) throw error;
      setPermissions(data?.map(p => p.permission) || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (isAdmin || permissions.includes('*')) return true;
    
    // Check exact match
    if (permissions.includes(permission)) return true;
    
    // Check parent permission (e.g., 'crm' grants 'crm.contacts')
    const parts = permission.split('.');
    if (parts.length > 1 && permissions.includes(parts[0])) return true;
    
    return false;
  }, [permissions, isAdmin]);

  return { permissions, hasPermission, loading, refetch: fetchPermissions };
}
