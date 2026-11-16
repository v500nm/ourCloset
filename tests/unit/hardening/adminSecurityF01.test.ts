import { describe, it, expect, vi } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('F-01 Admin Security & Edge Guarding', () => {
  it('redirects unauthenticated requests to /login?redirect=/admin', () => {
    const req = new NextRequest('http://localhost:3000/admin');
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?redirect=/admin');
  });

  it('redirects non-admin authenticated users to /login?error=forbidden', () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `auth_session=${encodeURIComponent(JSON.stringify({ id: 'u-user', role: 'user', email: 'regular@example.com' }))}`,
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=forbidden');
  });

  it('allows verified admin users with valid auth_session cookie to access /admin', () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `auth_session=${encodeURIComponent(JSON.stringify({ id: 'u-admin', role: 'admin', email: 'verified.admin@ourcloset.com' }))}`,
      },
    });
    const res = middleware(req);

    // NextResponse.next() leaves status as 200 (or default response without redirect location)
    expect(res.headers.get('location')).toBeNull();
  });
});

