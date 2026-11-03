import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface SessionData {
  userId: string;
  email: string;
  role: string;
  tenantId: string | null;
  subdomain: string | null;
}

function getSessionFromCookie(token: string | undefined): SessionData | null {
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
    // Expiration check
    if (parsed.exp && parsed.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      userId: parsed.userId,
      email: parsed.email,
      role: parsed.role,
      tenantId: parsed.tenantId || null,
      subdomain: parsed.subdomain || null,
    };
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

  // 1. Skip static assets, internal next endpoints, uploads, public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Allow global API endpoints (auth, cron, super-admin)
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/super-admin')
  ) {
    return NextResponse.next();
  }

  // 3. Extract Session from cookie
  const sessionToken = request.cookies.get('renewhq_session')?.value;
  const session = getSessionFromCookie(sessionToken);

  // 4. Detect Subdomain from Host
  let hostSubdomain = '';
  const cleanHost = host.split(':')[0]; // remove port

  if (cleanHost.endsWith('.localhost')) {
    hostSubdomain = cleanHost.replace('.localhost', '');
  } else if (cleanHost.endsWith('.renewhq.com')) {
    hostSubdomain = cleanHost.replace('.renewhq.com', '');
  } else if (cleanHost.endsWith('.vercel.app')) {
    const parts = cleanHost.split('.');
    if (parts.length > 3) {
      hostSubdomain = parts[0];
    }
  } else if (
    cleanHost !== 'localhost' &&
    cleanHost !== '127.0.0.1' &&
    cleanHost !== 'renewhq.com' &&
    cleanHost !== 'www.renewhq.com'
  ) {
    hostSubdomain = `custom-${cleanHost}`;
  }

  // Determine effective subdomain context
  const refererSubdomain = getSubdomainFromReferer(referer);
  const pathAgencyMatch = pathname.match(/^\/agency\/([a-zA-Z0-9_-]+)/);
  const pathSubdomain = pathAgencyMatch ? pathAgencyMatch[1] : null;
  const effectiveSubdomain =
    hostSubdomain || pathSubdomain || session?.subdomain || refererSubdomain || 'pixelcraft';

  // 5. PROTECTED ROUTE CHECKS & DIRECT URL ACCESS PROTECTION
  const isDashboardRoute =
    pathname === '/dashboard' ||
    pathname === '/client/dashboard' ||
    pathname.startsWith('/agency/') && pathname.includes('/dashboard');

  if (isDashboardRoute) {
    // If not authenticated, redirect to login
    if (!session) {
      const loginTarget = pathSubdomain
        ? `/agency/${pathSubdomain}/login`
        : hostSubdomain
        ? `/login`
        : `/login`;
      return NextResponse.redirect(new URL(loginTarget, request.url));
    }

    // Role-based redirect enforcement:
    const isClientDashboard =
      pathname === '/client/dashboard' || pathname.includes('/client/dashboard');

    if (isClientDashboard && session.role !== 'CLIENT') {
      // Non-clients (admins, staff) should not be on client portal -> redirect to agency dashboard
      const target = hostSubdomain
        ? `/dashboard`
        : `/agency/${session.subdomain || effectiveSubdomain}/dashboard`;
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (!isClientDashboard && session.role === 'CLIENT') {
      // Clients should not be on agency admin dashboard -> redirect to client portal
      const target = hostSubdomain
        ? `/client/dashboard`
        : `/agency/${session.subdomain || effectiveSubdomain}/client/dashboard`;
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (session.role === 'SUPER_ADMIN' && pathname !== '/super-admin') {
      return NextResponse.redirect(new URL('/super-admin', request.url));
    }
  }

  // 6. LOGIN PAGE ACCESS WHEN ALREADY AUTHENTICATED
  const isLoginPage =
    pathname === '/login' ||
    (pathname.startsWith('/agency/') && pathname.endsWith('/login'));

  if (isLoginPage && session) {
    if (session.role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/super-admin', request.url));
    } else if (session.role === 'CLIENT') {
      const target = hostSubdomain
        ? `/client/dashboard`
        : `/agency/${session.subdomain || effectiveSubdomain}/client/dashboard`;
      return NextResponse.redirect(new URL(target, request.url));
    } else {
      const target = hostSubdomain
        ? `/dashboard`
        : `/agency/${session.subdomain || effectiveSubdomain}/dashboard`;
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // 7. SUBDOMAIN HOST REWRITE (e.g. pixelcraft.localhost:3000)
  if (hostSubdomain && hostSubdomain !== 'www') {
    if (!pathname.startsWith('/agency/')) {
      url.pathname = `/agency/${hostSubdomain}${pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 8. APEX / PATH-BASED FALLBACK REWRITING (e.g. localhost:3000 or renewhq-tan.vercel.app)
  if (pathname === '/dashboard') {
    url.pathname = `/agency/${effectiveSubdomain}/dashboard`;
    return NextResponse.rewrite(url);
  }

  if (pathname === '/client/dashboard') {
    url.pathname = `/agency/${effectiveSubdomain}/client/dashboard`;
    return NextResponse.rewrite(url);
  }

  // Tenant API route rewriting for relative client calls
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
