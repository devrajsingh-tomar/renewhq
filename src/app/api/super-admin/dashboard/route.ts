import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(['SUPER_ADMIN']);
    
    const totalAgencies = await db.agency.count();
    const activeSubCount = await db.subscription.count({ where: { status: 'ACTIVE' } });
    
    // Calculate Monthly Recurring Revenue (MRR) based on active subscriptions
    const activeSubs = await db.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { agency: { include: { plan: true } } }
    });

    let mrr = 0;
    activeSubs.forEach(sub => {
      const plan = sub.agency.plan;
      if (plan) {
        mrr += plan.monthlyPrice;
      }
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringAgencies = await db.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: now, lte: thirtyDaysFromNow }
      },
      include: { agency: true }
    });

    const agenciesList = await db.agency.findMany({
      include: {
        plan: true,
        users: {
          where: { role: 'AGENCY_ADMIN' },
          select: { email: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const plansList = await db.plan.findMany();

    return NextResponse.json({
      metrics: {
        totalAgencies,
        activeSubscriptions: activeSubCount,
        mrr,
        expiringCount: expiringAgencies.length
      },
      expiringAgencies,
      agencies: agenciesList,
      plans: plansList
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 401 });
  }
}
