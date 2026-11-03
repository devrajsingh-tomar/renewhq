import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'renewhq-super-secret-key-change-in-prod';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  subdomain: string | null;
}

export function signToken(payload: UserSession, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch (error) {
    return null;
  }
}
