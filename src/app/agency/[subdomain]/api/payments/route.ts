import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyTenantAccess } from '@/lib/api-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF', 'CLIENT']);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status'); 
  const clientId = searchParams.get('clientId');

  const payments = await db.payment.findMany({
    where: {
      tenantId: agency!.id,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: true,
      service: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ payments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF', 'CLIENT']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { amount, serviceId, referenceNumber, paymentMethod } = await request.json();

    if (!amount || !serviceId) {
      return NextResponse.json({ error: 'Amount and serviceId are required' }, { status: 400 });
    }

    const service = await db.service.findFirst({
      where: { id: serviceId, tenantId: agency!.id },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const payment = await db.payment.create({
      data: {
        amount: parseFloat(amount),
        status: 'PENDING_APPROVAL',
        referenceNumber: referenceNumber || '',
        paymentMethod: paymentMethod || 'UPI',
        serviceId,
        clientId: service.clientId,
        tenantId: agency!.id,
      },
    });

    // Trigger in-app notification
    await db.notification.create({
      data: {
        title: 'New Payment Submitted',
        message: `Payment of ₹${amount} for "${service.name}" is pending approval.`,
        tenantId: agency!.id,
        type: 'PAYMENT',
      }
    });

    await db.activityLog.create({
      data: {
        action: 'PAYMENT_SUBMITTED',
        details: `Payment reference ${referenceNumber || 'N/A'} submitted for "${service.name}".`,
        tenantId: agency!.id,
      }
    });

    return NextResponse.json({ success: true, payment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
