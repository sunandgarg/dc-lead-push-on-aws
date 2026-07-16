import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestPayload {
  apiUrl: string;
  secretKey: string;
  collegeId: string;
  source: string;
  medium: string;
  campaign: string;
  apiType: string;
  columnMapping?: Record<string, string>;
  apiTimeoutSeconds?: number;
}

function parseJsonLike<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return (value as T) ?? fallback;
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  const parsed = parseJsonLike<Record<string, unknown>>(value, {});
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed)
      .filter(([key]) => Boolean(key))
      .map(([key, entryValue]) => [key, typeof entryValue === 'string' ? entryValue : JSON.stringify(entryValue ?? '')]),
  );
}

function resolvePartnerTimeoutMs(apiConfig: TestPayload): number {
  const configuredSeconds = Number(apiConfig.apiTimeoutSeconds);
  if (Number.isFinite(configuredSeconds) && configuredSeconds >= 5 && configuredSeconds <= 300) {
    return Math.round(configuredSeconds * 1000);
  }

  if (String(apiConfig.apiUrl || '').toLowerCase().includes('ctpl')) {
    return 90000;
  }

  return 30000;
}

// SSRF Protection: Validate URL to prevent internal network access
function isValidExternalUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS for security
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost and loopback addresses
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { valid: false, error: 'Localhost URLs are not allowed' };
    }
    
    // Block private IP ranges
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Pattern);
    if (ipMatch) {
      const [, a, b, c] = ipMatch.map(Number);
      // 10.x.x.x
      if (a === 10) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
      // 172.16.x.x - 172.31.x.x
      if (a === 172 && b >= 16 && b <= 31) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
      // 192.168.x.x
      if (a === 192 && b === 168) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
      // 169.254.x.x (link-local, includes cloud metadata)
      if (a === 169 && b === 254) {
        return { valid: false, error: 'Link-local addresses are not allowed' };
      }
      // 127.x.x.x (loopback range)
      if (a === 127) {
        return { valid: false, error: 'Loopback addresses are not allowed' };
      }
    }
    
    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { valid: false, error: 'Cloud metadata endpoints are not allowed' };
    }
    
    // Block internal hostnames
    const blockedPatterns = [
      /\.local$/,
      /\.internal$/,
      /\.localhost$/,
      /^internal\./,
      /^metadata\./,
    ];
    
    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Internal hostnames are not allowed' };
      }
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiConfig = await req.json() as TestPayload;
    const columnMapping = normalizeStringRecord(apiConfig.columnMapping);

    // Validate URL to prevent SSRF attacks
    const urlValidation = isValidExternalUrl(apiConfig.apiUrl);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({
          isConfigValid: false,
          errorMessage: urlValidation.error || 'Invalid API URL',
          httpStatus: 0,
          response: null,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing API: ${apiConfig.apiType}, URL: ${apiConfig.apiUrl}`);

    // Create test lead data
    const testLead = {
      name: 'Test Lead',
      email: `test_${Date.now()}@test.com`,
      mobile: '9999999999',
      state: 'Test State',
      city: 'Test City',
      course: 'Test Course',
      specialization: 'Test Specialization',
    };

    let payload: unknown;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiConfig.apiType === 'upgrad') {
      const sk = (apiConfig.secretKey || '').trim();
      if (sk) {
        if (sk.toLowerCase().startsWith('basic ')) headers.Authorization = sk;
        else if (sk.includes(':')) headers.Authorization = `Basic ${btoa(sk)}`;
        else headers.Authorization = `Basic ${sk}`;
      }
      if (apiConfig.source) headers.utm_source = apiConfig.source;
      if (apiConfig.medium) headers.utm_medium = apiConfig.medium;
      if (apiConfig.campaign) headers.utm_campaign = apiConfig.campaign;

      payload = {
        firstname: 'FirstName',
        lastname: 'LastName',
        email: 'user@upgrad.com',
        phone: { number: '9999999999', code: '+91' },
        course: 'entrepreneurship',
        sendWelcomeMail: false,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        isDetectLocation: false,
        affiliateSource: 'aff_id=1&sub_aff_id=12',
        leadSource: { platform: '', platformSection: '' },
        extraFields: { chatLink: 'haptik.com/1234567' },
        emailTemplateSuffix: 'in',
      };
    } else if (apiConfig.apiType === 'leadsquared') {
      payload = Object.entries(testLead)
        .filter(([_, value]) => value)
        .map(([key, value]) => ({
          Attribute: columnMapping[key] || key,
          Value: value,
        }));
    } else if (apiConfig.apiType === 'meritto' || apiConfig.apiType === 'nopaperforms') {
      const formData: Record<string, string> = {
        secret_key: apiConfig.secretKey,
        source: apiConfig.source,
        medium: apiConfig.medium,
        campaign: apiConfig.campaign,
      };

      Object.entries(testLead).forEach(([key, value]) => {
        if (value) {
          const mappedKey = apiConfig.columnMapping?.[key] || key;
          const normalizedKey = columnMapping[key] || mappedKey;
          formData[normalizedKey] = value;
        }
      });

      payload = formData;
    } else {
      payload = {
        ...testLead,
        secret_key: apiConfig.secretKey,
        source: apiConfig.source,
        medium: apiConfig.medium,
        campaign: apiConfig.campaign,
      };
    }

    console.log('Test payload:', JSON.stringify(payload));

    const controller = new AbortController();
    const partnerTimeoutMs = resolvePartnerTimeoutMs(apiConfig);
    const timeout = setTimeout(() => controller.abort(), partnerTimeoutMs);

    const apiResponse = await fetch(apiConfig.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const httpStatus = apiResponse.status;
    const responseBody = await apiResponse.text();
    console.log(`API Response (HTTP ${httpStatus}):`, responseBody);

    let isConfigValid = false;
    let errorMessage = '';

    try {
      const jsonResponse = JSON.parse(responseBody);
      
      // Check if the response indicates a configuration error vs data error
      if (jsonResponse.message?.toLowerCase().includes('college id') ||
          jsonResponse.message?.toLowerCase().includes('secret') ||
          jsonResponse.message?.toLowerCase().includes('authentication') ||
          jsonResponse.message?.toLowerCase().includes('unauthorized') ||
          jsonResponse.message?.toLowerCase().includes('invalid key')) {
        isConfigValid = false;
        errorMessage = jsonResponse.message;
      } else if (jsonResponse.leadIdentifier ||
                 jsonResponse.lead_identifier ||
                 jsonResponse.status === 'Success' || 
                 jsonResponse.status === 'success' ||
                 jsonResponse.success === true) {
        isConfigValid = true;
      } else if (jsonResponse.status === 'Fail' || jsonResponse.status === 'fail') {
        // Check if it's a config error or just data validation error
        const msg = (jsonResponse.message || '').toLowerCase();
        if (msg.includes('already exist') || 
            msg.includes('duplicate') ||
            msg.includes('invalid email') ||
            msg.includes('invalid mobile') ||
            msg.includes('required field')) {
          // These are data validation errors, config is OK
          isConfigValid = true;
          errorMessage = `Config valid! Data validation: ${jsonResponse.message}`;
        } else {
          isConfigValid = false;
          errorMessage = jsonResponse.message || 'API returned failure';
        }
      } else {
        // Unknown response format
        isConfigValid = false;
        errorMessage = 'Unknown response format';
      }
    } catch {
      isConfigValid = false;
      errorMessage = 'Invalid JSON response from API';
    }

    return new Response(
      JSON.stringify({
        isConfigValid,
        errorMessage,
        httpStatus,
        response: responseBody,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Test API error:', error);
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    return new Response(
      JSON.stringify({ 
        isConfigValid: false, 
        errorMessage: isTimeout ? 'Partner API timed out' : String(error),
        httpStatus: 0,
        response: null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
