import { cookies } from 'next/headers';
import { verifyToken, UserSession } from './jwt';

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('renewhq_session')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

export async function requireAuth(roles?: string[]): Promise<UserSession> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  if (roles && !roles.includes(session.role)) {
    throw new Error('Forbidden');
  }
  return session;
}

export async function requireTenantAuth(tenantId: string, roles?: string[]): Promise<UserSession> {
  const session = await requireAuth(roles);
  // Super Admin bypasses tenant check
  if (session.role === 'SUPER_ADMIN') {
    return session;
  }
  if (session.tenantId !== tenantId) {
    throw new Error('Forbidden - Tenant Mismatch');
  }
  return session;
}
