import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestPayload {
  baseUrl: string;
  method: string;
  headers: Record<string, string>;
  authType: string;
  authConfig: {
    apiKey?: string;
    headerName?: string;
    username?: string;
    password?: string;
    customKey?: string;
    customValue?: string;
  };
  requestBodyTemplate: Record<string, unknown>;
  testPayload: Record<string, unknown>;
  responseSuccessPath?: string;
  responseMessagePath?: string;
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
      const [, a, b] = ipMatch.map(Number);
      if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 127) {
        return { valid: false, error: 'Private/internal IP addresses are not allowed' };
      }
    }
    
    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { valid: false, error: 'Cloud metadata endpoints are not allowed' };
    }
    
    // Block internal hostnames
    const blockedPatterns = [/\.local$/, /\.internal$/, /\.localhost$/, /^internal\./, /^metadata\./];
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

// Replace template variables with actual values
function replaceTemplateVariables(template: Record<string, unknown>, values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const varName = value.slice(2, -2).trim();
      result[key] = values[varName] ?? value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = replaceTemplateVariables(value as Record<string, unknown>, values);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Get nested value from object using dot notation
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path || typeof obj !== 'object' || obj === null) return undefined;
  
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as TestPayload;

    // Validate URL
    const urlValidation = isValidExternalUrl(payload.baseUrl);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: urlValidation.error || 'Invalid API URL',
          httpStatus: 0,
          response: null,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing custom integration: ${payload.method} ${payload.baseUrl}`);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...payload.headers,
    };

    // Add authentication based on type
    switch (payload.authType) {
      case 'bearer':
        if (payload.authConfig?.apiKey) {
          headers['Authorization'] = `Bearer ${payload.authConfig.apiKey}`;
        }
        break;
      case 'basic':
        if (payload.authConfig?.username && payload.authConfig?.password) {
          const credentials = btoa(`${payload.authConfig.username}:${payload.authConfig.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'api_key':
        if (payload.authConfig?.apiKey && payload.authConfig?.headerName) {
          headers[payload.authConfig.headerName] = payload.authConfig.apiKey;
        }
        break;
      case 'custom':
        if (payload.authConfig?.customKey && payload.authConfig?.customValue) {
          headers[payload.authConfig.customKey] = payload.authConfig.customValue;
        }
        break;
    }

    // Build request body
    const requestBody = replaceTemplateVariables(payload.requestBodyTemplate || {}, payload.testPayload || {});

    console.log('Request headers:', JSON.stringify(headers, null, 2));
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Make the API call
    const response = await fetch(payload.baseUrl, {
      method: payload.method || 'POST',
      headers,
      body: ['GET', 'HEAD'].includes(payload.method?.toUpperCase()) ? undefined : JSON.stringify(requestBody),
    });

    const httpStatus = response.status;
    const responseText = await response.text();
    
    console.log(`Response (HTTP ${httpStatus}):`, responseText);

    let responseJson: unknown = null;
    let isSuccess = false;
    let message = '';

    try {
      responseJson = JSON.parse(responseText);
      
      // Check success using configured path
      if (payload.responseSuccessPath) {
        const successValue = getNestedValue(responseJson, payload.responseSuccessPath);
        isSuccess = successValue === true || successValue === 'success' || successValue === 'Success' || successValue === 1;
      } else {
        // Default: 2xx status code = success
        isSuccess = httpStatus >= 200 && httpStatus < 300;
      }
      
      // Get message using configured path
      if (payload.responseMessagePath) {
        const messageValue = getNestedValue(responseJson, payload.responseMessagePath);
        message = typeof messageValue === 'string' ? messageValue : JSON.stringify(messageValue);
      } else {
        message = isSuccess ? 'API call successful' : `HTTP ${httpStatus}`;
      }
    } catch {
      isSuccess = httpStatus >= 200 && httpStatus < 300;
      message = responseText.substring(0, 200);
    }

    return new Response(
      JSON.stringify({
        success: isSuccess,
        message,
        httpStatus,
        response: responseJson || responseText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Test integration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        httpStatus: 0,
        response: null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});