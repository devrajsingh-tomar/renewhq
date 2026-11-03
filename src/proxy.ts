import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getSubdomainFromCookie(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.subdomain || null;
  } catch {
    return null;
  }
}

function getSubdomainFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  const match = referer.match(/\/agency\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';
  const referer = request.headers.get('referer');
  const { pathname } = url;

  // 1. Skip static files, next assets, media extensions
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Allow global API routes
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/super-admin')
  ) {
    return NextResponse.next();
  }

  // 3. Detect Host Subdomain (e.g. pixelcraft.localhost:3000 or pixelcraft.renewhq.com)
  let subdomain = '';
  const cleanHost = host.split(':')[0]; // remove port

  if (cleanHost.endsWith('.localhost')) {
    subdomain = cleanHost.replace('.localhost', '');
  } else if (cleanHost.endsWith('.renewhq.com')) {
    subdomain = cleanHost.replace('.renewhq.com', '');
  } else if (cleanHost.endsWith('.vercel.app')) {
    const parts = cleanHost.split('.');
    if (parts.length > 3) {
      subdomain = parts[0];
    } else {
      subdomain = '';
    }
  } else if (
    cleanHost !== 'localhost' &&
    cleanHost !== 'renewhq.com' &&
    cleanHost !== 'www.renewhq.com'
  ) {
    subdomain = `custom-${cleanHost}`;
  }

  // If host subdomain exists (e.g. pixelcraft.localhost:3000)
  if (subdomain && subdomain !== 'www') {
    if (!pathname.startsWith('/agency/')) {
      url.pathname = `/agency/${subdomain}${pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 4. Fallback Handling for Path-Based / Apex Deployments (e.g. renewhq-tan.vercel.app or localhost:3000)
  // Check cookie or referer for agency subdomain context
  const sessionToken = request.cookies.get('renewhq_session')?.value;
  const sessionSubdomain = getSubdomainFromCookie(sessionToken);
  const refererSubdomain = getSubdomainFromReferer(referer);
  const effectiveSubdomain = sessionSubdomain || refererSubdomain || 'pixelcraft';

  // Handle generic /dashboard navigation
  if (pathname === '/dashboard') {
    url.pathname = `/agency/${effectiveSubdomain}/dashboard`;
    return NextResponse.rewrite(url);
  }

  // Handle generic /client/dashboard navigation
  if (pathname === '/client/dashboard') {
    url.pathname = `/agency/${effectiveSubdomain}/client/dashboard`;
    return NextResponse.rewrite(url);
  }

  // Handle relative API calls: /api/(clients|services|payments|invoices|dashboard|notifications|staff)
  const tenantApiPrefixes = [
    '/api/clients',
    '/api/services',
    '/api/payments',
    '/api/invoices',
    '/api/dashboard',
    '/api/notifications',
    '/api/staff',
    '/api/settings',
  ];

  const matchedPrefix = tenantApiPrefixes.find(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (matchedPrefix) {
    url.pathname = `/agency/${effectiveSubdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets|favicon.ico|sw.js).*)'],
};
