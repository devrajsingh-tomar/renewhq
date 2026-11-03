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

  // If role is CLIENT, restrict them to their own invoices
  let targetClientId = clientId;
  if (session!.role === 'CLIENT') {
    const clientRecord = await db.client.findFirst({
      where: { userId: session!.userId, tenantId: agency!.id }
    });
    if (!clientRecord) {
      return NextResponse.json({ invoices: [] });
    }
    targetClientId = clientRecord.id;
  }

  const invoices = await db.invoice.findMany({
    where: {
      tenantId: agency!.id,
      ...(targetClientId ? { clientId: targetClientId } : {})
    },
    include: {
      client: true,
      service: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ invoices });
}
