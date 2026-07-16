import { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { Link2, Copy, Check, Info, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isValidUrl } from '@/utils/base62';

const LENGTH_OPTIONS = ['4', '5', '6', '7', '8'];

interface CustomDomainOption {
  id: string;
  domain: string;
}

interface UrlCreationFormProps {
  onUrlCreated?: () => void;
}

export const UrlCreationForm = memo(function UrlCreationForm({ onUrlCreated }: UrlCreationFormProps) {
  const { toast } = useToast();
  
  // Custom domains from DB
  const [customDomains, setCustomDomains] = useState<CustomDomainOption[]>([]);
  
  // Form state
  const [shortUrlName, setShortUrlName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('auto');
  const [header, setHeader] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [codeType, setCodeType] = useState<'random' | 'custom'>('random');
  const [codeLength, setCodeLength] = useState('6');
  const [customCode, setCustomCode] = useState('');
  const [userTracking, setUserTracking] = useState(true);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch verified custom domains on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('custom_domains')
          .select('id, domain')
          .eq('status', 'verified')
          .order('domain');
        setCustomDomains((data as CustomDomainOption[]) || []);
      } catch { /* silent */ }
    })();
  }, []);

  // Domain options: auto + all verified custom domains
  const domainOptions = useMemo(() => {
    const options = [{ value: 'auto', label: 'Current Domain (Auto)' }];
    customDomains.forEach(d => {
      options.push({ value: d.domain, label: d.domain });
    });
    return options;
  }, [customDomains]);

  // Get the effective domain
  const effectiveDomain = useMemo(() => {
    if (selectedDomain !== 'auto') {
      return `https://${selectedDomain}`;
    }
    return window.location.origin;
  }, [selectedDomain]);

  // Generate random short code
  const generateShortCode = (length: number): string => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  // Get the final short code
  const getFinalCode = useCallback(() => {
    if (codeType === 'custom' && customCode.trim()) {
      return customCode.trim();
    }
    return generateShortCode(parseInt(codeLength, 10));
  }, [codeType, customCode, codeLength]);

  // Preview URL
  const previewUrl = useMemo(() => {
    const code = codeType === 'custom' && customCode.trim() 
      ? customCode.trim() 
      : `[${codeLength}-char]`;
    
    if (header.trim()) {
      return `${effectiveDomain}/${header.trim()}/${code}`;
    }
    return `${effectiveDomain}/${code}`;
  }, [effectiveDomain, header, codeType, customCode, codeLength]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urlValidation = isValidUrl(originalUrl);
    if (!urlValidation.valid) {
      toast({ title: 'Invalid URL', description: urlValidation.error, variant: 'destructive' });
      return;
    }

    if (!shortUrlName.trim()) {
      toast({ title: 'Required', description: 'Short URL Name is required', variant: 'destructive' });
      return;
    }

    if (codeType === 'custom' && !customCode.trim()) {
      toast({ title: 'Required', description: 'Custom code is required', variant: 'destructive' });
      return;
    }

    if (codeType === 'custom' && !/^[a-zA-Z0-9]+$/.test(customCode)) {
      toast({ title: 'Invalid', description: 'Custom code must be alphanumeric only', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const shortCode = getFinalCode();
      const headerValue = header.trim().toUpperCase() || null;
      
      let query = supabase
        .from('url_mappings')
        .select('id')
        .eq('short_code', shortCode);
      
      if (headerValue) {
        query = query.eq('header', headerValue);
      } else {
        query = query.is('header', null);
      }
      
      const { data: existing } = await query.maybeSingle();
      
      if (existing) {
        toast({ 
          title: 'Duplicate', 
          description: 'This short code already exists. Try a different code or let the system generate one.', 
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      const domainToStore = selectedDomain !== 'auto' ? selectedDomain : null;

      const { data, error } = await supabase
        .from('url_mappings')
        .insert({
          original_url: originalUrl.trim(),
          short_code: shortCode,
          user_id: user.id,
          title: shortUrlName.trim(),
          header: headerValue,
          user_tracking: userTracking,
          code_length: codeType === 'random' ? parseInt(codeLength, 10) : shortCode.length,
          custom_code: codeType === 'custom',
          domain: domainToStore,
        })
        .select()
        .single();

      if (error) throw error;

      const finalUrl = data.header 
        ? `${effectiveDomain}/${data.header}/${data.short_code}`
        : `${effectiveDomain}/${data.short_code}`;
      
      setGeneratedUrl(finalUrl);
      toast({ title: 'Success!', description: 'Short URL created successfully' });
      onUrlCreated?.();
      
      setShortUrlName('');
      setHeader('');
      setOriginalUrl('');
      setCodeType('random');
      setCodeLength('6');
      setCustomCode('');
    } catch (error: any) {
      console.error('Create URL error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create short URL', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!generatedUrl) {
      toast({ title: 'No URL', description: 'Create a short URL first', variant: 'destructive' });
      return;
    }
    setIsTesting(true);
    try {
      window.open(generatedUrl, '_blank');
      toast({ title: 'Testing', description: 'Opened short URL in new tab' });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!', description: 'URL copied to clipboard' });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Link2 className="h-5 w-5 text-primary" />
          URL Shortener - Single
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Short URL Name */}
          <div className="space-y-2">
            <Label htmlFor="short-url-name">Short URL Name *</Label>
            <Input
              id="short-url-name"
              placeholder="e.g. DLT Campaign March 2026"
              value={shortUrlName}
              onChange={(e) => setShortUrlName(e.target.value)}
              required
            />
          </div>

          {/* Row 2: Domain + Header */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger id="domain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domainOptions.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="header">Header (DLT Compliance)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>For DLT compliance in India, add your registered header (e.g., DCLPU). 
                    URL format: domain/HEADER/shortcode</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="header"
                placeholder="e.g. DCLPU, DKCAMP"
                value={header}
                onChange={(e) => setHeader(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                className="uppercase"
              />
            </div>
          </div>

          {/* Row 3: Long URL */}
          <div className="space-y-2">
            <Label htmlFor="long-url">Long URL (Destination) *</Label>
            <Input
              id="long-url"
              type="url"
              placeholder="https://example.com/your-long-url-here"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              className="font-mono text-sm"
              required
            />
          </div>

          {/* Row 4: Code Type */}
          <div className="space-y-3">
            <Label>Short Code Type</Label>
            <RadioGroup 
              value={codeType} 
              onValueChange={(v) => setCodeType(v as 'random' | 'custom')}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="random" id="random" />
                <Label htmlFor="random" className="cursor-pointer font-normal">Random (choose length)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="custom-code" />
                <Label htmlFor="custom-code" className="cursor-pointer font-normal">Custom Text</Label>
              </div>
            </RadioGroup>

            {codeType === 'random' ? (
              <div className="flex items-center gap-2">
                <Label className="shrink-0">Length:</Label>
                <Select value={codeLength} onValueChange={setCodeLength}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTH_OPTIONS.map(len => (
                      <SelectItem key={len} value={len}>{len} chars</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="e.g. sg, march2026, dltcamp"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))}
                  className="max-w-xs font-mono"
                />
                <p className="text-xs text-muted-foreground">Alphanumeric only, max 20 characters</p>
              </div>
            )}
          </div>

          {/* Row 5: User Tracking Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Switch
              id="user-tracking"
              checked={userTracking}
              onCheckedChange={setUserTracking}
            />
            <div>
              <Label htmlFor="user-tracking" className="cursor-pointer font-medium">User Tracking</Label>
              <p className="text-xs text-muted-foreground">Track clicks, device, browser, location</p>
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
            <p className="font-mono text-sm break-all">{previewUrl}</p>
          </div>

          {/* Submit button */}
          <Button type="submit" className="w-full md:w-auto px-8" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Short URL'
            )}
          </Button>
        </form>

        {/* Generated URL display */}
        {generatedUrl && (
          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-primary mb-2">
              ✓ Your short URL is ready!
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                value={generatedUrl}
                readOnly
                className="font-mono bg-white dark:bg-background flex-1"
              />
              <div className="flex gap-2">
                <Button onClick={copyToClipboard} variant="outline" size="icon" title="Copy">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button onClick={handleTest} variant="outline" disabled={isTesting} title="Test URL">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Test
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default UrlCreationForm;
