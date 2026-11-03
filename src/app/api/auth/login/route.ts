import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { email, password, subdomain } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { agency: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // If user account is suspended/blocked
    if (user.status === 'SUSPENDED' || user.status === 'BLOCKED') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact platform support.' },
        { status: 403 }
      );
    }

    // If user's agency is suspended/blocked
    if (user.agency && (user.agency.status === 'BLOCKED' || user.agency.status === 'SUSPENDED')) {
      return NextResponse.json(
        { error: 'Your agency has been suspended. Please contact platform support.' },
        { status: 403 }
      );
    }

    // Tenant check if logging in through a specific subdomain portal
    if (subdomain && user.role !== 'SUPER_ADMIN') {
      if (!user.agency || user.agency.subdomain !== subdomain) {
        return NextResponse.json(
          { error: 'You do not have access to this agency portal' },
          { status: 403 }
        );
      }
    }

    // Sign JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      subdomain: user.agency?.subdomain || null,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        subdomain: user.agency?.subdomain || null,
      },
    });

    // Share cookie across subdomains for production custom domain (e.g. .renewhq.com)
    // Note: Never set domain to '.localhost' as Chromium and RFC 6265 reject it
    const host = request.headers.get('host') || '';
    const cleanHost = host.split(':')[0];
    
    let cookieDomain = '';
    if (cleanHost.endsWith('.renewhq.com')) {
      cookieDomain = '.renewhq.com';
    }

    response.cookies.set('renewhq_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
