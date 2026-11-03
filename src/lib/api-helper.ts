import { NextResponse } from 'next/server';
import { getSession } from './auth';
import db from './db';

export async function verifyTenantAccess(subdomain: string, allowedRoles?: string[]) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized', status: 401, session: null, agency: null };
  }

  const agency = await db.agency.findUnique({
    where: { subdomain },
  });

  if (!agency) {
    return { error: 'Agency not found', status: 404, session: null, agency: null };
  }

  if (agency.status === 'BLOCKED') {
    return { error: 'Agency is blocked', status: 403, session: null, agency: null };
  }

  // Super Admin can bypass tenant boundaries
  if (session.role === 'SUPER_ADMIN') {
    return { session, agency, error: null, status: 200 };
  }

  // Tenant isolation check
  if (session.tenantId !== agency.id) {
    return { error: 'Forbidden - Tenant mismatch', status: 403, session: null, agency: null };
  }

  // Role authorization check
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { error: 'Forbidden - Restricted Role', status: 403, session: null, agency: null };
  }

  return { session, agency, error: null, status: 200 };
}
