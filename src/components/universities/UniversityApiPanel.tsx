import { useState, useEffect } from 'react';
import { supabase, supabaseProjectUrl } from '@/integrations/supabase/client';
import { Copy, Check, Key, RefreshCw, Eye, EyeOff, Code, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UniversityApiPanelProps {
  universityId: string;
  universityName: string;
}

export function UniversityApiPanel({ universityId, universityName }: UniversityApiPanelProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();

  const supabaseUrl = supabaseProjectUrl;

  useEffect(() => {
    fetchApiKey();
  }, [universityId]);

  const fetchApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from('university_api_keys')
        .select('api_key')
        .eq('university_id', universityId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        // Create new API key
        const { data: newKey, error: createError } = await supabase
          .from('university_api_keys')
          .insert({ university_id: universityId, name: 'Default API Key' })
          .select('api_key')
          .single();

        if (createError) throw createError;
        setApiKey(newKey.api_key);
      } else {
        setApiKey(data.api_key);
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!window.confirm('Regenerating will invalidate the current API key. Continue?')) return;
    
    setRegenerating(true);
    try {
      // Deactivate old key
      await supabase
        .from('university_api_keys')
        .update({ is_active: false })
        .eq('university_id', universityId);

      // Create new key
      const { data: newKey, error } = await supabase
        .from('university_api_keys')
        .insert({ university_id: universityId, name: 'Default API Key' })
        .select('api_key')
        .single();

      if (error) throw error;
      setApiKey(newKey.api_key);
      toast({ title: 'API Key Regenerated', description: 'New API key has been created' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to regenerate API key', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const apiEndpoint = `${supabaseUrl}/functions/v1/receive-lead`;

  const samplePayload = {
    university_id: universityId,
    api_key: apiKey || 'YOUR_API_KEY',
    name: 'John Doe',
    email: 'john@example.com',
    mobile: '9876543210',
    course: 'MBA',
    specialization: 'Marketing',
    city: 'Mumbai',
    state: 'Maharashtra',
  };

  const curlExample = `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(samplePayload, null, 2)}'`;

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="border-t border-border mt-4 pt-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Code className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">API Integration</span>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">API Key</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey || ''}
              readOnly
              className="input-field text-sm pr-20 font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => apiKey && copyToClipboard(apiKey, 'apiKey')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted hover:bg-accent text-sm"
          >
            {copied === 'apiKey' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={regenerateApiKey}
            disabled={regenerating}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted hover:bg-accent text-sm"
            title="Regenerate API Key"
          >
            <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* University ID */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">University ID</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={universityId}
            readOnly
            className="input-field text-sm font-mono flex-1"
          />
          <button
            onClick={() => copyToClipboard(universityId, 'uniId')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted hover:bg-accent text-sm"
          >
            {copied === 'uniId' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Endpoint */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">API Endpoint</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={apiEndpoint}
            readOnly
            className="input-field text-sm font-mono flex-1"
          />
          <button
            onClick={() => copyToClipboard(apiEndpoint, 'endpoint')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted hover:bg-accent text-sm"
          >
            {copied === 'endpoint' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Sample Payload */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground">Sample Payload</label>
          <button
            onClick={() => copyToClipboard(JSON.stringify(samplePayload, null, 2), 'payload')}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {copied === 'payload' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            Copy JSON
          </button>
        </div>
        <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto font-mono text-foreground">
          {JSON.stringify(samplePayload, null, 2)}
        </pre>
      </div>

      {/* cURL Example */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground">cURL Example</label>
          <button
            onClick={() => copyToClipboard(curlExample, 'curl')}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {copied === 'curl' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            Copy cURL
          </button>
        </div>
        <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto font-mono text-foreground whitespace-pre-wrap">
          {curlExample}
        </pre>
      </div>
    </div>
  );
}
