import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyTenantAccess } from '@/lib/api-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency, session } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF', 'CLIENT']);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const paymentStatus = searchParams.get('paymentStatus');

  let targetClientId = clientId;
  if (session!.role === 'CLIENT') {
    const clientRecord = await db.client.findFirst({
      where: { userId: session!.userId, tenantId: agency!.id },
    });
    if (!clientRecord) {
      return NextResponse.json({ services: [] });
    }
    targetClientId = clientRecord.id;
  }

  const services = await db.service.findMany({
    where: {
      tenantId: agency!.id,
      ...(targetClientId ? { clientId: targetClientId } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
    },
    include: {
      client: true,
      category: true,
    },
    orderBy: { expiryDate: 'asc' },
  });

  return NextResponse.json({ services });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
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
      clientId,
      categoryId,
      reminderSettings,
    } = await request.json();

    if (!name || amount === undefined || !billingCycle || !startDate || !expiryDate || !clientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const service = await db.$transaction(async (tx) => {
      const newService = await tx.service.create({
        data: {
          name,
          description,
          amount: parseFloat(amount),
          billingCycle,
          customDurationDays: customDurationDays ? parseInt(customDurationDays) : null,
          startDate: new Date(startDate),
          expiryDate: new Date(expiryDate),
          status: 'ACTIVE',
          paymentStatus: 'UNPAID',
          reminderSettings: reminderSettings || '30,15,7,1',
          clientId,
          tenantId: agency!.id,
          categoryId: categoryId || null,
        },
      });

      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      await tx.invoice.create({
        data: {
          invoiceNumber,
          amount: parseFloat(amount),
          taxAmount: 0,
          totalAmount: parseFloat(amount),
          status: 'UNPAID',
          dueDate: new Date(expiryDate),
          serviceId: newService.id,
          clientId,
          tenantId: agency!.id,
        },
      });

      return newService;
    });

    await db.activityLog.create({
      data: {
        action: 'SERVICE_CREATED',
        details: `Service ${name} created for client with auto-invoice.`,
        tenantId: agency!.id,
      }
    });

    return NextResponse.json({ success: true, service });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
