import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyTenantAccess } from '@/lib/api-helper';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; id: string }> }
) {
  const { subdomain, id } = await params;
  const { error, status, agency, session } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { status: newStatus } = await request.json(); // APPROVED or REJECTED

    if (newStatus !== 'APPROVED' && newStatus !== 'REJECTED') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const payment = await db.payment.findFirst({
      where: { id, tenantId: agency!.id },
      include: { service: true, client: true }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (payment.status === 'APPROVED') {
      return NextResponse.json({ error: 'Payment is already approved' }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Update Payment status
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedByUserId: session!.userId,
        }
      });

      if (newStatus === 'APPROVED') {
        const service = payment.service;
        const now = new Date();
        
        // Decide start date for extension
        const currentExpiry = new Date(service.expiryDate);
        const newStartDate = currentExpiry > now ? currentExpiry : now;
        
        // Calculate new expiry date based on billing cycle
        let newExpiryDate = new Date(newStartDate);
        
        switch (service.billingCycle.toUpperCase()) {
          case 'MONTHLY':
            newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            newExpiryDate.setMonth(newExpiryDate.getMonth() + 3);
            break;
          case 'HALF_YEARLY':
            newExpiryDate.setMonth(newExpiryDate.getMonth() + 6);
            break;
          case 'YEARLY':
            newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
            break;
          case 'CUSTOM':
            const days = service.customDurationDays || 30;
            newExpiryDate.setDate(newExpiryDate.getDate() + days);
            break;
          default:
            newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
        }

        // 2. Extend Service
        await tx.service.update({
          where: { id: service.id },
          data: {
            startDate: newStartDate,
            expiryDate: newExpiryDate,
            paymentStatus: 'PAID',
            status: 'ACTIVE',
          }
        });

        // 3. Mark Unpaid Invoices for this service as PAID
        await tx.invoice.updateMany({
          where: {
            serviceId: service.id,
            tenantId: agency!.id,
            status: 'UNPAID'
          },
          data: {
            status: 'PAID'
          }
        });

        // 4. Create in-app notification for Client
        if (payment.client.userId) {
          await tx.notification.create({
            data: {
              title: 'Renewal Approved',
              message: `Your renewal payment for "${service.name}" has been approved! Expiry extended to ${newExpiryDate.toLocaleDateString()}.`,
              userId: payment.client.userId,
              tenantId: agency!.id,
              type: 'PAYMENT',
            }
          });
        }
      }

      return updatedPayment;
    });

    await db.activityLog.create({
      data: {
        action: `PAYMENT_${newStatus}`,
        details: `Payment approval status set to ${newStatus} for service "${payment.service.name}" by user.`,
        tenantId: agency!.id,
      }
    });

    return NextResponse.json({ success: true, payment: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
