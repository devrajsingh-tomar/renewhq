import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyTenantAccess } from '@/lib/api-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; id: string }> }
) {
  const { subdomain, id } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF']);
  if (error) return NextResponse.json({ error }, { status });

  const client = await db.client.findFirst({
    where: { id, tenantId: agency!.id },
    include: {
      services: true,
      invoices: true,
      payments: true,
      user: {
        select: { email: true }
      }
    }
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; id: string }> }
) {
  const { subdomain, id } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { name, email, phone, companyName, address } = await request.json();

    const client = await db.client.findFirst({
      where: { id, tenantId: agency!.id }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updatedClient = await db.client.update({
      where: { id },
      data: { name, email, phone, companyName, address }
    });

    // Log action
    await db.activityLog.create({
      data: {
        action: 'CLIENT_UPDATED',
        details: `Client ${name} details were updated.`,
        tenantId: agency!.id,
      }
    });

    return NextResponse.json({ success: true, client: updatedClient });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; id: string }> }
) {
  const { subdomain, id } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const client = await db.client.findFirst({
      where: { id, tenantId: agency!.id }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await db.client.delete({
      where: { id }
    });

    if (client.userId) {
      await db.user.delete({
        where: { id: client.userId }
      });
    }

    // Log action
    await db.activityLog.create({
      data: {
        action: 'CLIENT_DELETED',
        details: `Client ${client.name} and all associated subscriptions were deleted.`,
        tenantId: agency!.id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
