import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { name, subdomain, email, password, planId } = await request.json();

    if (!name || !subdomain || !email || !password) {
      return NextResponse.json(
        { error: 'Agency name, subdomain, email, and password are required' },
        { status: 400 }
      );
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    // Prevent using forbidden subdomains
    const reserved = ['www', 'admin', 'superadmin', 'api', 'app', 'renewhq', 'mail', 'support', 'billing'];
    if (reserved.includes(cleanSubdomain)) {
      return NextResponse.json(
        { error: 'This subdomain is reserved and cannot be used.' },
        { status: 400 }
      );
    }

    // Check if subdomain is already taken
    const existingAgency = await db.agency.findUnique({
      where: { subdomain: cleanSubdomain },
    });

    if (existingAgency) {
      return NextResponse.json(
        { error: 'Subdomain is already taken' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      );
    }

    // Find or create Plan
    let targetPlanId = planId;
    if (!targetPlanId) {
      let defaultPlan = await db.plan.findFirst({
        where: { name: 'Free' },
      });
      if (!defaultPlan) {
        defaultPlan = await db.plan.create({
          data: {
            name: 'Free',
            clientLimit: 5,
            storageLimit: 100,
            reminderLimit: 50,
            staffLimit: 1,
            monthlyPrice: 0,
            yearlyPrice: 0,
            features: JSON.stringify(['5 Clients', '100MB Storage', 'Basic Reminders', '1 Staff User']),
          },
        });
      }
      targetPlanId = defaultPlan.id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.$transaction(async (tx) => {
      // 1. Create agency
      const agency = await tx.agency.create({
        data: {
          name,
          subdomain: cleanSubdomain,
          planId: targetPlanId,
        },
      });

      // 2. Create admin user
      const user = await tx.user.create({
        data: {
          name: `${name} Owner`,
          email,
          password: hashedPassword,
          role: 'AGENCY_ADMIN',
          tenantId: agency.id,
        },
      });

      // 3. Create active subscription for the agency
      await tx.subscription.create({
        data: {
          agencyId: agency.id,
          planId: targetPlanId,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        },
      });

      // 4. Create default activity log
      await tx.activityLog.create({
        data: {
          action: 'AGENCY_REGISTERED',
          details: `Agency ${name} registered on plan.`,
          userId: user.id,
          tenantId: agency.id,
        },
      });

      return { agency, user };
    });

    return NextResponse.json({
      success: true,
      agency: result.agency,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        tenantId: result.user.tenantId,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
