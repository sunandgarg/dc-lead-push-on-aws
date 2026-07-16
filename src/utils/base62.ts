// Base62 encoding for URL shortener
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Reserved words that cannot be used as short codes
const RESERVED_WORDS = new Set([
  'admin', 'api', 'dashboard', 'login', 'logout', 'auth', 'settings',
  'crm', 'lead-push', 'url-shortener', 'help', 'about', 'terms', 'privacy',
  'app', 'www', 'mail', 'ftp', 'cdn', 'static', 'assets', 'img', 'js', 'css'
]);

export function generateShortCode(length: number = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * 62);
    result += BASE62_CHARS[randomIndex];
  }
  return result;
}

export function encodeBase62(num: number): string {
  if (num === 0) return BASE62_CHARS[0];
  let result = '';
  while (num > 0) {
    result = BASE62_CHARS[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

export function decodeBase62(str: string): number {
  let result = 0;
  for (const char of str) {
    result = result * 62 + BASE62_CHARS.indexOf(char);
  }
  return result;
}

export function isValidShortCode(code: string): { valid: boolean; error?: string } {
  if (!code) {
    return { valid: false, error: 'Short code is required' };
  }
  
  if (code.length < 3 || code.length > 10) {
    return { valid: false, error: 'Short code must be 3-10 characters' };
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(code)) {
    return { valid: false, error: 'Short code must be alphanumeric only' };
  }
  
  if (RESERVED_WORDS.has(code.toLowerCase())) {
    return { valid: false, error: 'This short code is reserved' };
  }
  
  return { valid: true };
}

export function isValidUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }
  
  if (url.length > 2000) {
    return { valid: false, error: 'URL must be less than 2000 characters' };
  }
  
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

export function formatClicks(clicks: number): string {
  if (clicks >= 1000000) return `${(clicks / 1000000).toFixed(1)}M`;
  if (clicks >= 1000) return `${(clicks / 1000).toFixed(1)}K`;
  return clicks.toString();
}
