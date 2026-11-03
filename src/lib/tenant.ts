import { NextRequest } from 'next/server';
import db from './db';

export function getSubdomainFromRequest(request: NextRequest): string | null {
  const host = request.headers.get('host') || '';
  const cleanHost = host.split(':')[0]; // remove port
  
  let subdomain = '';
  if (cleanHost.endsWith('.localhost')) {
    subdomain = cleanHost.replace('.localhost', '');
  } else if (cleanHost.endsWith('.renewhq.com')) {
    subdomain = cleanHost.replace('.renewhq.com', '');
  }
  
  if (!subdomain || subdomain === 'www' || subdomain === 'localhost') {
    return null;
  }
  return subdomain;
}

export async function getTenantFromRequest(request: NextRequest) {
  const subdomain = getSubdomainFromRequest(request);
  if (!subdomain) return null;
  
  let agency = null;
  if (subdomain.startsWith('custom-')) {
    const domain = subdomain.replace('custom-', '');
    agency = await db.agency.findFirst({
      where: { customDomain: domain },
      include: { plan: true },
    });
  } else {
    agency = await db.agency.findUnique({
      where: { subdomain },
      include: { plan: true },
    });
  }
  
  return agency;
}
