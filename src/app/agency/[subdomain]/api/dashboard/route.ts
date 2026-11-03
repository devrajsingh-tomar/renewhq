import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyTenantAccess } from '@/lib/api-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF']);
  if (error) return NextResponse.json({ error }, { status });

  const tenantId = agency!.id;

  // 1. Core Metrics
  const totalClients = await db.client.count({ where: { tenantId } });
  const activeServices = await db.service.count({ where: { tenantId, status: 'ACTIVE' } });
  
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const upcomingRenewals = await db.service.count({
    where: {
      tenantId,
      status: 'ACTIVE',
      expiryDate: {
        gte: now,
        lte: thirtyDaysFromNow,
      }
    }
  });

  const overduePayments = await db.service.count({
    where: {
      tenantId,
      paymentStatus: 'OVERDUE',
    }
  });

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthPayments = await db.payment.aggregate({
    where: {
      tenantId,
      status: 'APPROVED',
      paymentDate: { gte: startOfMonth },
    },
    _sum: { amount: true },
  });
  const monthlyRevenue = currentMonthPayments._sum.amount || 0;

  const pendingApprovals = await db.payment.count({
    where: {
      tenantId,
      status: 'PENDING_APPROVAL',
    }
  });

  // 2. Chart: Renewal Statistics
  const activeCount = await db.service.count({ where: { tenantId, status: 'ACTIVE', paymentStatus: 'PAID' } });
  const unpaidCount = await db.service.count({ where: { tenantId, status: 'ACTIVE', paymentStatus: 'UNPAID' } });
  const overdueCount = await db.service.count({ where: { tenantId, paymentStatus: 'OVERDUE' } });

  const renewalStats = [
    { name: 'Paid Services', value: activeCount },
    { name: 'Unpaid (Due Soon)', value: unpaidCount },
    { name: 'Overdue Services', value: overdueCount },
  ];

  // 3. Chart: Revenue trends (last 6 months)
  const revenueTrends = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const agg = await db.payment.aggregate({
      where: {
        tenantId,
        status: 'APPROVED',
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    });
    revenueTrends.push({
      month: label,
      revenue: agg._sum.amount || 0,
    });
  }

  // 4. Chart: Client growth trends
  const clientGrowth = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short' });
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const count = await db.client.count({
      where: {
        tenantId,
        createdAt: { lte: monthEnd },
      }
    });
    clientGrowth.push({
      month: label,
      clients: count,
    });
  }

  // 5. Recent Activity Logs
  const recentLogs = await db.activityLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return NextResponse.json({
    metrics: {
      totalClients,
      activeServices,
      upcomingRenewals,
      overduePayments,
      monthlyRevenue,
      pendingApprovals,
    },
    charts: {
      renewalStats,
      revenueTrends,
      clientGrowth,
    },
    recentLogs,
  });
}
