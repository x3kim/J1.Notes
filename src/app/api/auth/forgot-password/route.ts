import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  generateResetToken,
  hashToken,
  hasExceededRateLimit,
  cleanupExpiredTokens,
  TOKEN_TTL_MS,
} from '@/lib/passwordReset';
import { sendMail, buildResetEmail } from '@/lib/email';

// Generic response so we do not leak whether the email is configured.
const GENERIC_RESPONSE = {
  ok: true,
  message:
    'If this email is registered for password recovery, a reset link has been sent.',
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    // Basic shape check — still return generic response on invalid input.
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Opportunistic cleanup.
    await cleanupExpiredTokens();

    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    const configuredEmail = settings?.reset_email?.trim().toLowerCase();

    // Only send if email matches the configured reset_email. We still
    // return the generic response in all other cases to prevent enumeration.
    if (!configuredEmail || configuredEmail !== rawEmail) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Rate limiting against the configured email.
    if (await hasExceededRateLimit(configuredEmail)) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Generate + store hashed token.
    const token = generateResetToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        token_hash: tokenHash,
        email: configuredEmail,
        expires_at: expiresAt,
      },
    });

    // Build reset URL.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      new URL(request.url).origin;
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    const mail = buildResetEmail(resetUrl);
    await sendMail({
      to: configuredEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    // Still return a generic response to avoid leaking whether anything failed.
    // eslint-disable-next-line no-console
    console.error('[forgot-password] error:', err);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
