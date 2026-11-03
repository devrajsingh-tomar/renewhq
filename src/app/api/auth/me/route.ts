import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        tenantId: true,
        agency: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            logoUrl: true,
            primaryColor: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (user.status === 'SUSPENDED' || user.status === 'BLOCKED') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    if (user.agency && (user.agency.status === 'BLOCKED' || user.agency.status === 'SUSPENDED')) {
      return NextResponse.json({ error: 'Agency suspended' }, { status: 403 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
