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

  const notifications = await db.notification.findMany({
    where: {
      tenantId: agency!.id,
      OR: [
        { userId: session!.role === 'CLIENT' ? session!.userId : null },
        { userId: session!.userId }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return NextResponse.json({ notifications });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency, session } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF', 'CLIENT']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { notificationId, markAll } = await request.json();

    if (markAll) {
      await db.notification.updateMany({
        where: {
          tenantId: agency!.id,
          OR: [
            { userId: session!.role === 'CLIENT' ? session!.userId : null },
            { userId: session!.userId }
          ],
          isRead: false
        },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const notif = await db.notification.findFirst({
      where: { id: notificationId, tenantId: agency!.id }
    });

    if (!notif) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
