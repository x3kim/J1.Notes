/**
 * Tests for GET /api/notes and POST /api/notes.
 * Prisma is mocked so no real database is needed.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    note: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }),
      create: jest.fn().mockResolvedValue({ id: 'user-1' }),
    },
  },
}));

import prisma from '@/lib/db';
import { GET, POST, DELETE } from '../route';

const prismaMock = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
  (prismaMock.note.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  (prismaMock.note.findMany as jest.Mock).mockResolvedValue([]);
  (prismaMock.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-1' });
});

describe('GET /api/notes', () => {
  it('returns 200 with an array', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('auto-purges notes older than 7 days', async () => {
    await GET();
    expect(prismaMock.note.deleteMany).toHaveBeenCalledTimes(1);
    const call = (prismaMock.note.deleteMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deleted_at).toBeDefined();
  });

  it('returns notes from the database', async () => {
    const mockNote = {
      id: 'note-1', title: 'Test Note', content_text: '<p>Hello</p>',
      pinned: false, archived: false, deleted_at: null,
      created_at: new Date(), updated_at: new Date(),
      checklist_items: [], labels: [], attachments: [],
    };
    (prismaMock.note.findMany as jest.Mock).mockResolvedValue([mockNote]);

    const response = await GET();
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('note-1');
  });
});

describe('POST /api/notes', () => {
  it('creates a note and returns 201', async () => {
    const newNote = { id: 'note-2', title: 'New Note', content_text: '<p>Hi</p>', created_at: new Date(), updated_at: new Date() };
    (prismaMock.note.create as jest.Mock).mockResolvedValue(newNote);

    const request = new Request('http://localhost/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Note', content_text: '<p>Hi</p>' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe('note-2');
  });

  it('creates a user if none exists', async () => {
    (prismaMock.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prismaMock.note.create as jest.Mock).mockResolvedValue({ id: 'note-3', created_at: new Date(), updated_at: new Date() });

    const request = new Request('http://localhost/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Note' }),
    });

    await POST(request);
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    (prismaMock.note.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Note' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/notes (empty trash)', () => {
  it('calls deleteMany and returns 200', async () => {
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(prismaMock.note.deleteMany).toHaveBeenCalledWith({
      where: { deleted_at: { not: null } },
    });
  });
});
