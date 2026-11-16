/**
 * Production Security Headers & Content Security Policy (CSP)
 * Single Source of Truth (F-06, F-07)
 *
 * Configures defense-in-depth HTTP headers for:
 * - Content-Security-Policy with WASM, Web Worker, and CDN support
 * - Zero Google Font runtime egress (self-hosted fonts per F-03)
 * - Permissions-Policy camera, geo, mic controls
 * - HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
 * - Strict Referrer Policy
 */

export interface HeaderEntry {
  key: string;
  value: string;
}

export const CSP_DIRECTIVES: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'",
    "'wasm-unsafe-eval'",
    "'unsafe-inline'",
    'https://cdn.jsdelivr.net',
  ],
  'worker-src': ["'self'", 'blob:'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'blob:', 'data:', 'https://images.unsplash.com'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'blob:',
    'data:',
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://huggingface.co',
    'https://*.huggingface.co',
    'https://cdn.jsdelivr.net',
    'https://*.jsdelivr.net',
    'https://api.open-meteo.com',
  ],
  'media-src': ["'self'", 'blob:', 'data:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
};

export function buildCspHeader(directives: Record<string, string[]> = CSP_DIRECTIVES): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

export const PERMISSIONS_POLICY = 'camera=(self), geolocation=(self), microphone=()';

export const SECURITY_HEADERS: HeaderEntry[] = [
  { key: 'Content-Security-Policy', value: buildCspHeader() },
  { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];
