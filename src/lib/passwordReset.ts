/**
 * Helpers for password-reset token generation, hashing, and validation.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const MAX_REQUESTS_PER_HOUR = 3;
export const MIN_PASSWORD_LENGTH = 8;

/** Generates a cryptographically secure reset token (hex-encoded). */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** bcrypt-hashes a token before it is stored in the database. */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 12);
}

/**
 * Validates a plain token against stored (hashed) tokens for a given email.
 * Returns the matching DB row or null.
 *
 * We iterate because bcrypt hashes of the same value are not byte-equal,
 * so we cannot look up by hash directly.
 */
export async function findValidToken(plainToken: string) {
  const now = new Date();
  const candidates = await prisma.passwordResetToken.findMany({
    where: {
      used: false,
      expires_at: { gt: now },
    },
    orderBy: { created_at: 'desc' },
    take: 20, // defensive bound
  });

  for (const row of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(plainToken, row.token_hash)) {
      return row;
    }
  }
  return null;
}

/**
 * Checks whether the given email has exceeded the per-hour reset-request quota.
 */
export async function hasExceededRateLimit(email: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.passwordResetToken.count({
    where: {
      email,
      created_at: { gt: oneHourAgo },
    },
  });
  return recent >= MAX_REQUESTS_PER_HOUR;
}

/**
 * Best-effort cleanup of tokens that are expired or already used.
 * Called opportunistically; safe to ignore failures.
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expires_at: { lt: new Date() } }, { used: true }],
      },
    });
  } catch {
    // non-fatal
  }
}

export interface PasswordValidationResult {
  ok: boolean;
  error?: string;
}

/** Enforces minimum password complexity rules. */
export function validatePassword(password: unknown): PasswordValidationResult {
  if (typeof password !== 'string') {
    return { ok: false, error: 'Password is required' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return { ok: false, error: 'Password must contain letters and numbers' };
  }
  return { ok: true };
}
