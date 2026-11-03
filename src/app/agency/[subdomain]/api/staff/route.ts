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
  if (error) return NextResponse.json({ error }, { status });

  const staff = await db.user.findMany({
    where: {
      tenantId: agency!.id,
      role: 'STAFF',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ staff });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    // Check plan staff limit
    const currentStaffCount = await db.user.count({
      where: { tenantId: agency!.id, role: 'STAFF' },
    });

    const plan = await db.plan.findUnique({
      where: { id: agency!.planId },
    });

    if (plan && currentStaffCount >= plan.staffLimit) {
      return NextResponse.json(
        { error: `Staff limit reached for your plan (${plan.staffLimit} max). Upgrade your plan to add more staff.` },
        { status: 403 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STAFF',
        tenantId: agency!.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await db.activityLog.create({
      data: {
        action: 'STAFF_CREATED',
        details: `Staff member "${name}" (${email}) was created.`,
        tenantId: agency!.id,
      },
    });

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const staffUser = await db.user.findFirst({
      where: { id, tenantId: agency!.id, role: 'STAFF' },
    });

    if (!staffUser) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    await db.user.delete({
      where: { id },
    });

    await db.activityLog.create({
      data: {
        action: 'STAFF_DELETED',
        details: `Staff member "${staffUser.name}" (${staffUser.email}) was removed.`,
        tenantId: agency!.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
