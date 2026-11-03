import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyTenantAccess } from '@/lib/api-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN', 'STAFF']);
    if (error) return NextResponse.json({ error }, { status });

    const tenantId = agency!.id;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run aggregate queries concurrently in a single batch
    const [
      totalClients,
      allClients,
      services,
      payments,
      recentLogs
    ] = await Promise.all([
      db.client.count({ where: { tenantId } }),
      db.client.findMany({
        where: { tenantId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true }
      }),
      db.service.findMany({
        where: { tenantId },
        select: { status: true, paymentStatus: true, expiryDate: true }
      }),
      db.payment.findMany({
        where: {
          tenantId,
          status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
          paymentDate: { gte: sixMonthsAgo }
        },
        select: { amount: true, status: true, paymentDate: true }
      }),
      db.activityLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
    ]);

    // In-memory metrics calculation
    const activeServices = services.filter(s => s.status === 'ACTIVE').length;
    const upcomingRenewals = services.filter(
      s => s.status === 'ACTIVE' && s.expiryDate && s.expiryDate >= now && s.expiryDate <= thirtyDaysFromNow
    ).length;
    const overduePayments = services.filter(s => s.paymentStatus === 'OVERDUE').length;

    const pendingApprovals = payments.filter(p => p.status === 'PENDING_APPROVAL').length;
    const monthlyRevenue = payments
      .filter(p => p.status === 'APPROVED' && p.paymentDate && p.paymentDate >= startOfMonth)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Chart: Renewal Statistics
    const activeCount = services.filter(s => s.status === 'ACTIVE' && s.paymentStatus === 'PAID').length;
    const unpaidCount = services.filter(s => s.status === 'ACTIVE' && s.paymentStatus === 'UNPAID').length;
    const overdueCount = services.filter(s => s.paymentStatus === 'OVERDUE').length;

    const renewalStats = [
      { name: 'Paid Services', value: activeCount },
      { name: 'Unpaid (Due Soon)', value: unpaidCount },
      { name: 'Overdue Services', value: overdueCount },
    ];

    // Chart: Revenue trends (last 6 months)
    const revenueTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const rev = payments
        .filter(p => p.status === 'APPROVED' && p.paymentDate && p.paymentDate >= monthStart && p.paymentDate <= monthEnd)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      revenueTrends.push({
        month: label,
        revenue: rev,
      });
    }

    // Chart: Client growth trends
    const clientGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      // Clients created on or before this month
      const count = allClients.filter(c => c.createdAt <= monthEnd).length + (totalClients - allClients.length);
      clientGrowth.push({
        month: label,
        clients: count,
      });
    }

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
  } catch (err: any) {
    console.error('Agency dashboard metrics error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
