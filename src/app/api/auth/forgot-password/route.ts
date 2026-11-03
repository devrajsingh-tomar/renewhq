import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({
        success: true,
        message: 'If the account exists, password reset instructions have been generated.',
      });
    }

    // Delete any existing tokens for this email
    await db.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    const resetLink = `/reset-password?token=${token}`;

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetLink,
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
