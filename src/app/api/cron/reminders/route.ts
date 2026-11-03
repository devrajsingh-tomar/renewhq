import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const activeServices = await db.service.findMany({
      where: { status: 'ACTIVE' },
      include: { client: true, agency: true },
    });

    const logs: string[] = [];

    for (const service of activeServices) {
      const expiry = new Date(service.expiryDate);
      const timeDiff = expiry.getTime() - now.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

      let reminderType: string | null = null;

      if (daysLeft === 30) reminderType = 'DAYS_30';
      else if (daysLeft === 15) reminderType = 'DAYS_15';
      else if (daysLeft === 7) reminderType = 'DAYS_7';
      else if (daysLeft === 1) reminderType = 'DAYS_1';
      else if (daysLeft <= 0) {
        // If unpaid, mark as OVERDUE
        if (service.paymentStatus === 'UNPAID') {
          await db.service.update({
            where: { id: service.id },
            data: { paymentStatus: 'OVERDUE' },
          });
        }
        reminderType = 'OVERDUE';
      }

      if (reminderType) {
        // Check if this specific reminder was already sent today/recently
        const existing = await db.reminder.findFirst({
          where: {
            serviceId: service.id,
            type: reminderType,
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            },
          },
        });

        if (!existing) {
          // Record reminder
          await db.reminder.create({
            data: {
              serviceId: service.id,
              type: reminderType,
              status: 'SENT',
              sentAt: now,
              channel: 'IN_APP',
              tenantId: service.tenantId,
            },
          });

          // Generate dashboard notification for client
          if (service.client.userId) {
            await db.notification.create({
              data: {
                title: reminderType === 'OVERDUE' ? 'Service Overdue!' : 'Upcoming Renewal Reminder',
                message: reminderType === 'OVERDUE' 
                  ? `Your subscription for "${service.name}" is overdue. Please renew immediately.`
                  : `Your service "${service.name}" will expire in ${daysLeft} days. Click to renew.`,
                userId: service.client.userId,
                tenantId: service.tenantId,
                type: 'RENEWAL',
              },
            });
          }

          logs.push(`Sent ${reminderType} reminder for service "${service.name}" (Client: ${service.client.name})`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: activeServices.length,
      triggeredActions: logs,
    });
  } catch (error: any) {
    console.error('Reminder Engine Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
