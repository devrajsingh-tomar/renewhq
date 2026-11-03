import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(['SUPER_ADMIN']);
    const { id } = await params;
    const { status } = await request.json();

    if (status !== 'ACTIVE' && status !== 'BLOCKED') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedAgency = await db.agency.update({
      where: { id },
      data: { status }
    });

    // Record action log
    await db.activityLog.create({
      data: {
        action: `AGENCY_STATUS_CHANGED`,
        details: `Agency "${updatedAgency.name}" status was updated to ${status} by platform admin.`,
        userId: session.userId
      }
    });

    return NextResponse.json({ success: true, agency: updatedAgency });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
