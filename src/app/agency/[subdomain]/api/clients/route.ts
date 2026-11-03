import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyTenantAccess } from '@/lib/api-helper';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF']);
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  const clients = await db.client.findMany({
    where: {
      tenantId: agency!.id,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { companyName: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      services: true,
      user: {
        select: {
          email: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ clients });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF']);
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const { name, email, phone, companyName, address, createLogin, password } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    let userAccount = null;

    const client = await db.$transaction(async (tx) => {
      if (createLogin) {
        if (!password) {
          throw new Error('Password is required for client login account');
        }

        const existingUser = await tx.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw new Error('Email is already in use by another user account');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        userAccount = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: 'CLIENT',
            tenantId: agency!.id,
          },
        });
      }

      return await tx.client.create({
        data: {
          name,
          email,
          phone,
          companyName,
          address,
          tenantId: agency!.id,
          userId: userAccount ? userAccount.id : null,
        },
      });
    });

    // Log action
    await db.activityLog.create({
      data: {
        action: 'CLIENT_CREATED',
        details: `Client ${name} (${companyName || 'No Company'}) was created.`,
        tenantId: agency!.id,
      }
    });

    return NextResponse.json({ success: true, client });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
