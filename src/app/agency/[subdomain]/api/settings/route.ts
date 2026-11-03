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

  return NextResponse.json({ agency });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { error, status, agency } = await verifyTenantAccess(subdomain, ['AGENCY_ADMIN']);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const { name, logoUrl, primaryColor, customDomain } = await request.json();

    const updated = await db.agency.update({
      where: { id: agency!.id },
      data: {
        ...(name ? { name } : {}),
        logoUrl: logoUrl !== undefined ? logoUrl : agency!.logoUrl,
        primaryColor: primaryColor || agency!.primaryColor,
        customDomain: customDomain !== undefined ? (customDomain || null) : agency!.customDomain,
      },
    });

    await db.activityLog.create({
      data: {
        action: 'SETTINGS_UPDATED',
        details: `Agency settings and branding updated.`,
        tenantId: agency!.id,
      },
    });

    return NextResponse.json({ success: true, agency: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
