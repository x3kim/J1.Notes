/**
 * Tests for POST /api/auth/login.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    appSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { POST } from '../login/route';

const prismaMock = prisma as jest.Mocked<typeof prisma>;
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

const makeRequest = (body: object) =>
  new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/login', () => {
  it('returns 400 when auth is not enabled', async () => {
    (prismaMock.appSettings.findUnique as jest.Mock).mockResolvedValue({
      auth_enabled: false,
      password_hash: null,
    });

    const res = await POST(makeRequest({ password: 'test' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong password', async () => {
    (prismaMock.appSettings.findUnique as jest.Mock).mockResolvedValue({
      auth_enabled: true,
      password_hash: '$2b$12$hashedpassword',
    });
    (bcryptMock.compare as jest.Mock).mockResolvedValue(false);

    const res = await POST(makeRequest({ password: 'wrongpassword' }));
    expect(res.status).toBe(401);
  });

  it('returns 200 and sets cookie for correct password', async () => {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!';
    (prismaMock.appSettings.findUnique as jest.Mock).mockResolvedValue({
      auth_enabled: true,
      password_hash: '$2b$12$hashedpassword',
    });
    (bcryptMock.compare as jest.Mock).mockResolvedValue(true);

    const res = await POST(makeRequest({ password: 'correctpassword' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('j1notes-auth=');
  });

  it('returns 400 when settings is null', async () => {
    (prismaMock.appSettings.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ password: 'anything' }));
    expect(res.status).toBe(400);
  });
});
