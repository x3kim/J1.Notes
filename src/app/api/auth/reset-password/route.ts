import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import {
  findValidToken,
  validatePassword,
  cleanupExpiredTokens,
} from '@/lib/passwordReset';

/**
 * GET: Validates a token (existence + not expired + not used).
 * Query param: ?token=xxx
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ valid: false, error: 'invalid_token' }, { status: 400 });
    }

    const match = await findValidToken(token);
    if (!match) {
      return NextResponse.json({ valid: false, error: 'invalid_or_expired' }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, error: 'server_error' }, { status: 500 });
  }
}

/**
 * POST: Consumes a token and sets a new password.
 * Body: { token: string, password: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token : '';
    const password = body.password;

    if (!token) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: 'weak_password', message: pwCheck.error }, { status: 400 });
    }

    const match = await findValidToken(token);
    if (!match) {
      return NextResponse.json({ error: 'invalid_or_expired' }, { status: 400 });
    }

    // Hash the new password and update AppSettings (single-user model).
    const hash = await bcrypt.hash(password, 12);
    await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: { password_hash: hash },
      create: { id: 'singleton', password_hash: hash },
    });

    // Mark this token used + invalidate all other outstanding tokens for the
    // same email so a leaked token cannot be reused.
    await prisma.passwordResetToken.update({
      where: { id: match.id },
      data: { used: true },
    });
    await prisma.passwordResetToken.updateMany({
      where: { email: match.email, used: false },
      data: { used: true },
    });

    // Opportunistic cleanup of old tokens.
    await cleanupExpiredTokens();

    return NextResponse.json({ ok: true, redirect: '/login' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[reset-password] error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
