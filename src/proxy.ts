import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';
  const { pathname } = url;

  // Skip static files, next assets, media extensions, and global API routes (except api/tenant)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Allow next-auth APIs to work globally
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  let subdomain = '';
  const cleanHost = host.split(':')[0]; // remove port in localhost:3000

  if (cleanHost.endsWith('.localhost')) {
    subdomain = cleanHost.replace('.localhost', '');
  } else if (cleanHost.endsWith('.renewhq.com')) {
    subdomain = cleanHost.replace('.renewhq.com', '');
  } else if (cleanHost.endsWith('.vercel.app')) {
    // Vercel deployment domains (e.g. renewhq-tan.vercel.app)
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
    // Custom domain support
    subdomain = `custom-${cleanHost}`;
  }

  // Rewrite for subdomains (excluding 'www' which should serve the main landing page)
  if (subdomain && subdomain !== 'www') {
    url.pathname = `/agency/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/global|_next/static|_next/image|assets|favicon.ico|sw.js).*)'],
};
