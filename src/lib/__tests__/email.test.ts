import { buildResetEmail, getFromAddress } from '../email';

describe('email helpers', () => {
  describe('buildResetEmail', () => {
    const url = 'https://example.com/reset-password?token=abc123';
    const { subject, text, html } = buildResetEmail(url);

    it('returns correct subject', () => {
      expect(subject).toBe('J1.Notes — Password reset requested');
    });

    it('includes reset URL in plain text', () => {
      expect(text).toContain(url);
    });

    it('includes reset URL in HTML', () => {
      expect(html).toContain(url);
    });

    it('includes J1.Notes branding', () => {
      expect(text).toContain('J1.Notes');
      expect(html).toContain('J1.Notes');
    });

    it('does not include old gNotes branding', () => {
      expect(text).not.toContain('gNotes');
      expect(html).not.toContain('gNotes');
    });

    it('mentions expiry in text', () => {
      expect(text).toContain('1 hour');
    });
  });

  describe('getFromAddress', () => {
    const originalEnv = process.env.SMTP_FROM;

    afterEach(() => {
      if (originalEnv === undefined) delete process.env.SMTP_FROM;
      else process.env.SMTP_FROM = originalEnv;
    });

    it('returns SMTP_FROM env var when set', () => {
      process.env.SMTP_FROM = 'Custom <custom@example.com>';
      expect(getFromAddress()).toBe('Custom <custom@example.com>');
    });

    it('returns default address when SMTP_FROM is not set', () => {
      delete process.env.SMTP_FROM;
      expect(getFromAddress()).toContain('J1.Notes');
    });
  });
});
