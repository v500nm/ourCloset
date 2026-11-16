import { describe, it, expect } from 'vitest';
import {
  SECURITY_HEADERS,
  CSP_DIRECTIVES,
  buildCspHeader,
  PERMISSIONS_POLICY,
} from '@/config/securityHeaders';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('Production Security Headers & CSP Hardening (F-03, F-06, F-07)', () => {
  it('middleware applies all production security headers to requests', () => {
    const req = new NextRequest('http://localhost:3000/today');
    const res = middleware(req);

    expect(res.headers.get('Content-Security-Policy')).toBeDefined();
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=63072000');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=(self)');
  });

  it('enforces X-Frame-Options: DENY and nosniff in SECURITY_HEADERS', () => {
    const xFrame = SECURITY_HEADERS.find((h) => h.key === 'X-Frame-Options');
    expect(xFrame?.value).toBe('DENY');

    const xContent = SECURITY_HEADERS.find((h) => h.key === 'X-Content-Type-Options');
    expect(xContent?.value).toBe('nosniff');

    const referrer = SECURITY_HEADERS.find((h) => h.key === 'Referrer-Policy');
    expect(referrer?.value).toBe('strict-origin-when-cross-origin');
  });

  it('configures Strict-Transport-Security for minimum 2 years with preloading', () => {
    const hsts = SECURITY_HEADERS.find((h) => h.key === 'Strict-Transport-Security');
    expect(hsts?.value).toContain('max-age=63072000');
    expect(hsts?.value).toContain('includeSubDomains');
    expect(hsts?.value).toContain('preload');
  });

  it('restricts Permissions-Policy camera to self and disables microphone', () => {
    expect(PERMISSIONS_POLICY).toContain('camera=(self)');
    expect(PERMISSIONS_POLICY).toContain('geolocation=(self)');
    expect(PERMISSIONS_POLICY).toContain('microphone=()');
  });

  it('configures CSP supporting WASM, Web Workers, and eliminates external font egress', () => {
    const csp = buildCspHeader(CSP_DIRECTIVES);

    // WASM support in script-src
    expect(csp).toContain("'wasm-unsafe-eval'");

    // Web Worker support
    expect(csp).toContain("worker-src 'self' blob:");

    // Model CDN support (HuggingFace and jsDelivr)
    expect(csp).toContain('https://huggingface.co');
    expect(csp).toContain('https://cdn.jsdelivr.net');

    // Narrowed image sources (not open https:)
    expect(csp).toContain("img-src 'self' blob: data: https://images.unsplash.com");

    // Zero external font egress (self-hosted build-time fonts)
    expect(csp).not.toContain('https://fonts.gstatic.com');
    expect(csp).not.toContain('https://fonts.googleapis.com');

    // Anti-clickjacking & object isolation
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});
