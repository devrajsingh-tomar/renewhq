import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  const host = request.headers.get('host') || '';
  const cleanHost = host.split(':')[0];
  
  let cookieDomain = '';
  if (cleanHost.endsWith('.localhost')) {
    cookieDomain = '.localhost';
  } else if (cleanHost.endsWith('.renewhq.com')) {
    cookieDomain = '.renewhq.com';
  }

  response.cookies.set('renewhq_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // expire immediately
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  return response;
}
