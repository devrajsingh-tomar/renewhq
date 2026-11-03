import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyTenantAccess } from '@/lib/api-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; id: string }> }
) {
  const { subdomain, id } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF', 'CLIENT']);
  if (error) return NextResponse.json({ error }, { status });

  const service = await db.service.findFirst({
    where: { id, tenantId: agency!.id },
    include: {
      client: true,
      category: true,
      payments: true,
      invoices: true,
    }
  });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  return NextResponse.json({ service });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; id: string }> }
) {
  const { subdomain, id } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const {
      name,
      description,
      amount,
      billingCycle,
      customDurationDays,
      startDate,
      expiryDate,
      status: serviceStatus,
      paymentStatus,
      categoryId,
      reminderSettings,
    } = await request.json();

    const service = await db.service.findFirst({
      where: { id, tenantId: agency!.id }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const updatedService = await db.service.update({
      where: { id },
      data: {
        name,
        description,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        billingCycle,
        customDurationDays: customDurationDays !== undefined ? parseInt(customDurationDays) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        status: serviceStatus,
        paymentStatus,
        categoryId: categoryId || null,
        reminderSettings,
      }
    });

    await db.activityLog.create({
      data: {
        action: 'SERVICE_UPDATED',
        details: `Service ${name} was updated.`,
        tenantId: agency!.id,
      }
    });

    return NextResponse.json({ success: true, service: updatedService });
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
    const service = await db.service.findFirst({
      where: { id, tenantId: agency!.id }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await db.service.delete({
      where: { id }
    });

    await db.activityLog.create({
      data: {
        action: 'SERVICE_DELETED',
        details: `Service ${service.name} was deleted.`,
        tenantId: agency!.id,
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
