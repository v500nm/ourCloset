import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SECURITY_HEADERS } from '@/config/securityHeaders';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Edge-level guarding for admin routes (F-01)
  if (pathname.startsWith('/admin')) {
    const authSessionCookie = request.cookies.get('auth_session');

    if (!authSessionCookie?.value) {
      return NextResponse.redirect(new URL('/login?redirect=/admin', request.url));
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(authSessionCookie.value));
      if (!parsed || parsed.role !== 'admin') {
        return NextResponse.redirect(new URL('/login?error=forbidden', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login?redirect=/admin', request.url));
    }
  }

  // Clone headers and attach production security headers
  const response = NextResponse.next();
  for (const header of SECURITY_HEADERS) {
    response.headers.set(header.key, header.value);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
