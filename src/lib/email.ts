/**
 * Email service for gNotes.
 *
 * Uses nodemailer with SMTP configuration from environment variables.
 * If SMTP is not configured, falls back to a dev mode that logs emails to the
 * console instead of sending them (useful for local development).
 */
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let cachedTransporter: Transporter | null = null;

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
  return cachedTransporter;
}

export function getFromAddress(): string {
  return process.env.SMTP_FROM || 'gNotes <no-reply@gnotes.local>';
}

/**
 * Sends an email. In dev mode (no SMTP configured), logs the email to the
 * console and returns successfully.
 */
export async function sendMail(options: SendMailOptions): Promise<{ dev: boolean }> {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev / fallback mode: log the email
    // eslint-disable-next-line no-console
    console.log('\n============================================');
    // eslint-disable-next-line no-console
    console.log('[gNotes email:dev] SMTP not configured. Email would have been sent:');
    // eslint-disable-next-line no-console
    console.log(`  To:      ${options.to}`);
    // eslint-disable-next-line no-console
    console.log(`  From:    ${getFromAddress()}`);
    // eslint-disable-next-line no-console
    console.log(`  Subject: ${options.subject}`);
    // eslint-disable-next-line no-console
    console.log('  ---- Text ----');
    // eslint-disable-next-line no-console
    console.log(options.text);
    // eslint-disable-next-line no-console
    console.log('============================================\n');
    return { dev: true };
  }

  await transporter.sendMail({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
  return { dev: false };
}

/**
 * Builds the password-reset email (plain + HTML).
 */
export function buildResetEmail(resetUrl: string): { subject: string; text: string; html: string } {
  const subject = 'gNotes — Password reset requested';
  const text = [
    'Hello,',
    '',
    'We received a request to reset the password for your gNotes account.',
    '',
    'To choose a new password, open the following link:',
    resetUrl,
    '',
    'This link will expire in 1 hour. If you did not request a password reset,',
    'you can safely ignore this email — your password will remain unchanged.',
    '',
    '— gNotes',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; padding: 24px; margin: 0;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
      <h1 style="margin: 0 0 16px; font-size: 20px; color: #111;">Reset your gNotes password</h1>
      <p style="color: #333; font-size: 14px; line-height: 1.55;">
        We received a request to reset the password for your gNotes account.
        Click the button below to choose a new password.
      </p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 20px; background: #facc15; color: #111; text-decoration: none; font-weight: 600; border-radius: 8px;">
          Reset password
        </a>
      </p>
      <p style="color: #555; font-size: 13px; line-height: 1.55;">
        Or copy and paste this URL into your browser:<br />
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>
      <p style="color: #777; font-size: 12px; margin-top: 24px; line-height: 1.55;">
        This link expires in 1 hour. If you did not request a password reset,
        you can safely ignore this email — your password will remain unchanged.
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">— gNotes</p>
    </div>
  </body>
</html>`.trim();

  return { subject, text, html };
}
